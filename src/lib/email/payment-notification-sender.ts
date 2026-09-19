// payment_notifications 큐 행을 브랜드 HTML로 렌더링해 발송한다. daily-tasks 크론(폴백)과 즉시 발송 라우트가 함께 쓴다
import { Resend } from 'resend'
import { FROM_ADDRESS } from '@/lib/email/constants'
import {
  buildImmediatePlanChangeEmail,
  buildImmediatePlanChangeFailedEmail,
  buildPaymentFailedEmail,
  buildPaymentFirstEmail,
  buildScheduledPlanChangeAppliedEmail,
  buildSubscriptionRenewedEmail,
  type PaymentVars,
} from '@/lib/email/email-copy'

const MAX_RETRIES = 3

// 토스 카드사 코드 → 이름 (docs.tosspayments.com/reference/codes 카드사 코드, 2026-09-19 확인)
const CARD_ISSUER_NAMES: Record<string, string> = {
  '3K': '기업BC',
  '46': '광주',
  '71': '롯데',
  '30': '산업',
  '31': 'BC',
  '51': '삼성',
  '38': '새마을',
  '41': '신한',
  '62': '신협',
  '36': '씨티',
  '33': '우리',
  W1: '우리',
  '37': '우체국',
  '39': '저축',
  '35': '전북',
  '42': '제주',
  '15': '카카오뱅크',
  '3A': '케이뱅크',
  '24': '토스뱅크',
  '21': '하나',
  '61': '현대',
  '11': '국민',
  '91': '농협',
  '34': '수협',
}

interface TossCardLike {
  issuerCode?: string | null
  number?: string | null
}

/** 토스 card 객체 → "신한카드 **** 1234". 카드사 코드를 모르면 null(행 생략) */
export function formatCardLabel(card: unknown): string | null {
  if (!card || typeof card !== 'object') return null
  const c = card as TossCardLike
  const issuer = c.issuerCode ? CARD_ISSUER_NAMES[c.issuerCode] : undefined
  if (!issuer) return null
  const digits = (c.number || '').replace(/[^0-9*]/g, '')
  const last4 = digits.slice(-4)
  return last4 ? `${issuer}카드 **** ${last4}` : `${issuer}카드`
}

/**
 * 엣지 함수(toss-billing-payment)가 metadata에 넣는 값. Deno라 타입을 공유하지 못하므로
 * 여기서 느슨하게 받고, 값이 없으면 body_text 폴백으로 내려간다.
 */
interface PaymentNotificationMetadata {
  planName?: string
  previousPlanName?: string | null
  billingCycle?: 'monthly' | 'yearly'
  amount?: number
  paidAt?: string
  nextBillingDate?: string
  card?: unknown
  receiptUrl?: string | null
  failureReason?: string
  graceEndsAt?: string
}

export interface PaymentNotificationRow {
  id: string
  recipient_email: string
  recipient_name: string | null
  notification_type: string
  subject: string
  body_text: string | null
  body_html: string | null
  metadata: PaymentNotificationMetadata | null
  retry_count: number | null
}

interface Rendered {
  subject: string
  html?: string
  text?: string
}

function paymentVars(row: PaymentNotificationRow, m: PaymentNotificationMetadata): PaymentVars | null {
  if (!m.planName || !m.billingCycle || typeof m.amount !== 'number' || !m.paidAt || !m.nextBillingDate) {
    return null
  }
  return {
    recipientName: row.recipient_name,
    planName: m.planName,
    previousPlanName: m.previousPlanName ?? null,
    billingCycle: m.billingCycle,
    amount: m.amount,
    paidAt: m.paidAt,
    nextBillingDate: m.nextBillingDate,
    cardLabel: formatCardLabel(m.card),
    receiptUrl: m.receiptUrl ?? null,
  }
}

/** 큐 행 하나를 제목/HTML/텍스트로. 새 타입은 email-copy로, 그 외(라이프사이클 등)는 저장된 본문 그대로 */
export function renderPaymentNotificationRow(row: PaymentNotificationRow): Rendered {
  const m = row.metadata || {}
  const fallback: Rendered = {
    subject: row.subject,
    text: row.body_text ?? undefined,
    html: row.body_html ?? undefined,
  }

  switch (row.notification_type) {
    case 'payment_first':
    case 'subscription_renewed':
    case 'plan_change_applied':
    case 'plan_change_immediate': {
      const v = paymentVars(row, m)
      if (!v) return fallback
      if (row.notification_type === 'payment_first') return buildPaymentFirstEmail(v)
      if (row.notification_type === 'plan_change_applied') return buildScheduledPlanChangeAppliedEmail(v)
      if (row.notification_type === 'plan_change_immediate') return buildImmediatePlanChangeEmail(v)
      return buildSubscriptionRenewedEmail(v)
    }
    case 'payment_failed': {
      if (!m.planName || typeof m.amount !== 'number' || !m.failureReason || !m.graceEndsAt) return fallback
      return buildPaymentFailedEmail({
        recipientName: row.recipient_name,
        planName: m.planName,
        amount: m.amount,
        failureReason: m.failureReason,
        graceEndsAt: m.graceEndsAt,
        cardLabel: formatCardLabel(m.card),
      })
    }
    case 'plan_change_failed': {
      if (!m.planName || typeof m.amount !== 'number' || !m.failureReason) return fallback
      return buildImmediatePlanChangeFailedEmail({
        recipientName: row.recipient_name,
        planName: m.planName,
        previousPlanName: m.previousPlanName ?? null,
        amount: m.amount,
        failureReason: m.failureReason,
        cardLabel: formatCardLabel(m.card),
      })
    }
    default:
      return fallback
  }
}

export interface SendPaymentNotificationsResult {
  totalNotifications: number
  emailsSent: number
  emailsFailed: number
  message: string
}

/**
 * pending 상태의 큐 행을 발송한다. ids를 주면 그 행만(즉시 발송 라우트), 없으면 전부(크론 폴백).
 * 실패는 retry_count를 올리고 3회 미만이면 pending으로 남겨 다음 크론이 재시도한다.
 */
export async function sendPendingPaymentNotifications(
  supabase: any,
  opts: { ids?: string[]; logPrefix?: string } = {}
): Promise<SendPaymentNotificationsResult> {
  const prefix = opts.logPrefix ?? '[Payment Notifications]'

  let query = supabase
    .from('payment_notifications')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
  if (opts.ids && opts.ids.length > 0) {
    query = query.in('id', opts.ids)
  }
  const { data: pending, error: queryError } = await query

  if (queryError) {
    throw new Error(`결제 알림 조회 실패: ${queryError.message}`)
  }

  const rows = (pending || []) as PaymentNotificationRow[]
  if (rows.length === 0) {
    return {
      totalNotifications: 0,
      emailsSent: 0,
      emailsFailed: 0,
      message: 'No pending payment notifications',
    }
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key is not configured')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailsSent = 0
  let emailsFailed = 0

  for (const notif of rows) {
    try {
      const rendered = renderPaymentNotificationRow(notif)
      const base = { from: FROM_ADDRESS, to: [notif.recipient_email], subject: rendered.subject }
      // Resend는 html/text 중 하나가 필수 - 둘 다 없는 행은 제목만이라도 텍스트로 보낸다
      const { error: sendError } = rendered.html
        ? await resend.emails.send({ ...base, html: rendered.html, text: rendered.text })
        : await resend.emails.send({ ...base, text: rendered.text ?? rendered.subject })
      if (sendError) throw sendError

      await supabase
        .from('payment_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
        .eq('id', notif.id)

      emailsSent++
      console.log(`${prefix} Sent to ${notif.recipient_email} (${notif.notification_type})`)
    } catch (error) {
      console.error(`${prefix} Failed to send to ${notif.recipient_email}:`, error)
      const nextRetryCount = (notif.retry_count || 0) + 1
      await supabase
        .from('payment_notifications')
        .update({
          status: nextRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
          retry_count: nextRetryCount,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', notif.id)
      emailsFailed++
    }
  }

  return {
    totalNotifications: rows.length,
    emailsSent,
    emailsFailed,
    message: `Processed ${rows.length} payment notifications`,
  }
}
