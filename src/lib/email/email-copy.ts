// 발송되는 모든 메일의 제목·본문 워딩 단일 소스. 디자인은 layout.ts, 문구 수정은 이 파일에서만 한다
import { config } from '@/lib/config'
import { escapeHtml } from '@/lib/email/template-renderer'
import {
  EMAIL_BRAND,
  callout,
  greeting,
  infoTable,
  paragraph,
  quote,
  renderEmailShell,
} from '@/lib/email/layout'

export interface EmailContent {
  subject: string
  html: string
  text: string
}

export const DASHBOARD_URL = `${config.app.domain}/dashboard`
export const SUBSCRIPTION_URL = `${DASHBOARD_URL}/subscription`
export const LEADS_URL = `${DASHBOARD_URL}/leads`
export const SUPPORT_URL = `${DASHBOARD_URL}/support`

const BRAND = 'Funnely'
const SUBJECT_PREFIX = `[${BRAND}]`
const INTERNAL_PREFIX = `[${BRAND} 내부]`

// ───────────────────────── 포맷 헬퍼 ─────────────────────────

/** ISO → "2026년 10월 19일" (Asia/Seoul) */
export function formatKstDate(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}년 ${get('month')} ${get('day')}일`
}

/** ISO → "2026년 10월 19일 08:50" (Asia/Seoul) */
export function formatKstDateTime(iso: string): string {
  const d = new Date(iso)
  const time = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return `${formatKstDate(iso)} ${time}`
}

export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}

function cycleLabel(cycle: 'monthly' | 'yearly'): string {
  return cycle === 'monthly' ? '월간 결제' : '연간 결제'
}

function displayName(name: string | null | undefined): string {
  return name && name.trim() ? `${name.trim()}님` : '고객님'
}

function textLines(lines: Array<string | null | undefined | false>): string {
  return lines.filter((l): l is string => typeof l === 'string' && l.length > 0).join('\n')
}

const SUBSCRIPTION_FOOTER =
  `이 메일은 ${BRAND} 구독과 결제에 관한 안내로, 계정 관리자에게 자동 발송됩니다.`

// ───────────────────────── 결제 ─────────────────────────

export interface PaymentVars {
  recipientName?: string | null
  planName: string
  billingCycle: 'monthly' | 'yearly'
  /** 부가세 포함 실제 청구액(total_amount) */
  amount: number
  /** 결제 승인 시각 ISO */
  paidAt: string
  /** 다음 결제일 ISO(current_period_end) */
  nextBillingDate: string
  /** 예: "신한카드 **** 1234". 없으면 행 생략 */
  cardLabel?: string | null
  /** 토스 영수증 URL. 없으면 링크 생략 */
  receiptUrl?: string | null
  /** 플랜 변경 메일에서만 사용 */
  previousPlanName?: string | null
}

function paymentRows(v: PaymentVars, opts?: { amountLabel?: string }): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['플랜', `${escapeHtml(v.planName)} · ${cycleLabel(v.billingCycle)}`],
    [opts?.amountLabel ?? '결제 금액', `${formatWon(v.amount)} <span style="font-weight:400;color:${EMAIL_BRAND.muted};">(부가세 포함)</span>`],
  ]
  if (v.cardLabel) rows.push(['결제 수단', escapeHtml(v.cardLabel)])
  rows.push(['결제일', formatKstDateTime(v.paidAt)])
  rows.push(['다음 결제일', formatKstDate(v.nextBillingDate)])
  return rows
}

function paymentText(v: PaymentVars, lead: string, amountLabel = '결제 금액'): string {
  return textLines([
    `${displayName(v.recipientName)}, ${lead}`,
    '',
    `플랜: ${v.planName} · ${cycleLabel(v.billingCycle)}`,
    `${amountLabel}: ${formatWon(v.amount)} (부가세 포함)`,
    v.cardLabel ? `결제 수단: ${v.cardLabel}` : null,
    `결제일: ${formatKstDateTime(v.paidAt)}`,
    `다음 결제일: ${formatKstDate(v.nextBillingDate)}`,
    '',
    `구독 관리: ${SUBSCRIPTION_URL}`,
    v.receiptUrl ? `영수증: ${v.receiptUrl}` : null,
  ])
}

const AUTO_RENEW_NOTE =
  '다음 결제일에 등록된 카드로 자동 결제됩니다. 결제 수단 변경과 플랜 관리는 대시보드의 구독 관리 메뉴에서 하실 수 있습니다.'

/** 최초 결제 완료(무료체험 전환·신규 결제) */
export function buildPaymentFirstEmail(v: PaymentVars): EmailContent {
  const title = '결제가 완료되었습니다'
  const lead = `${BRAND} 구독 결제가 정상적으로 완료되었습니다. 지금부터 ${escapeHtml(v.planName)} 플랜의 모든 기능을 이용하실 수 있습니다.`
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${v.planName} 플랜 결제 ${formatWon(v.amount)}, 다음 결제일 ${formatKstDate(v.nextBillingDate)}`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(paymentRows(v)) + paragraph(AUTO_RENEW_NOTE),
      cta: { label: '대시보드 바로가기', url: DASHBOARD_URL },
      secondaryLink: v.receiptUrl ? { label: '영수증 보기', url: v.receiptUrl } : undefined,
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: paymentText(v, `${BRAND} 구독 결제가 정상적으로 완료되었습니다. ${AUTO_RENEW_NOTE}`),
  }
}

/** 정기 갱신 결제 완료 */
export function buildSubscriptionRenewedEmail(v: PaymentVars): EmailContent {
  const title = '구독이 갱신되었습니다'
  const lead = `${BRAND} 구독이 정상적으로 갱신되었습니다. 서비스는 중단 없이 계속 이용하실 수 있습니다.`
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${formatWon(v.amount)} 결제 완료, 다음 결제일 ${formatKstDate(v.nextBillingDate)}`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(paymentRows(v)) + paragraph(AUTO_RENEW_NOTE),
      cta: { label: '구독 관리', url: SUBSCRIPTION_URL },
      secondaryLink: v.receiptUrl ? { label: '영수증 보기', url: v.receiptUrl } : undefined,
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: paymentText(v, `${BRAND} 구독이 정상적으로 갱신되었습니다. ${AUTO_RENEW_NOTE}`),
  }
}

function planChangeRows(v: PaymentVars, amountLabel: string): Array<[string, string]> {
  const rows = paymentRows(v, { amountLabel })
  if (v.previousPlanName) {
    rows.unshift(['변경 전 플랜', escapeHtml(v.previousPlanName)])
  }
  return rows
}

/** 예약(다운그레이드)해 둔 플랜 변경이 갱신 결제 시점에 적용됨 */
export function buildScheduledPlanChangeAppliedEmail(v: PaymentVars): EmailContent {
  const title = '예약하신 플랜 변경이 적용되었습니다'
  const lead = `예약하신 플랜 변경이 이번 결제일에 적용되었습니다. 오늘부터 ${escapeHtml(v.planName)} 플랜으로 이용하실 수 있습니다.`
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${v.previousPlanName ?? '이전'} 플랜에서 ${v.planName} 플랜으로 변경`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(planChangeRows(v, '결제 금액')) + paragraph(AUTO_RENEW_NOTE),
      cta: { label: '구독 관리', url: SUBSCRIPTION_URL },
      secondaryLink: v.receiptUrl ? { label: '영수증 보기', url: v.receiptUrl } : undefined,
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: paymentText(v, `예약하신 플랜 변경이 이번 결제일에 적용되었습니다. 오늘부터 ${v.planName} 플랜으로 이용하실 수 있습니다.`),
  }
}

/** 즉시 플랜 변경(업그레이드) 결제 완료. 남은 기간 일할 계산 청구 */
export function buildImmediatePlanChangeEmail(v: PaymentVars): EmailContent {
  const title = '플랜이 변경되었습니다'
  const lead = `요청하신 플랜 변경이 완료되었습니다. 지금부터 ${escapeHtml(v.planName)} 플랜의 기능을 바로 이용하실 수 있습니다.`
  const note =
    '이번 결제 금액은 현재 결제 기간의 남은 일수만큼 일할 계산된 차액입니다. 다음 결제일부터는 변경된 플랜 요금이 정상 청구됩니다.'
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${v.planName} 플랜으로 변경, 차액 ${formatWon(v.amount)} 결제`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(planChangeRows(v, '이번 결제 금액')) + paragraph(note),
      cta: { label: '대시보드 바로가기', url: DASHBOARD_URL },
      secondaryLink: v.receiptUrl ? { label: '영수증 보기', url: v.receiptUrl } : undefined,
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: paymentText(v, `요청하신 플랜 변경이 완료되었습니다. ${note}`, '이번 결제 금액'),
  }
}

export interface PlanChangeFailedVars {
  recipientName?: string | null
  planName: string
  previousPlanName?: string | null
  amount: number
  failureReason: string
  cardLabel?: string | null
}

/** 즉시 플랜 변경 결제 실패. 유예기간·자동 재시도 없음, 플랜은 그대로 */
export function buildImmediatePlanChangeFailedEmail(v: PlanChangeFailedVars): EmailContent {
  const title = '플랜 변경 결제에 실패했습니다'
  const lead = `${escapeHtml(v.planName)} 플랜으로 변경하기 위한 결제가 승인되지 않았습니다. 등록된 카드의 한도, 유효기간, 분실 여부를 확인해 주세요.`
  const status = v.previousPlanName
    ? `플랜은 변경되지 않았고, 현재 ${escapeHtml(v.previousPlanName)} 플랜이 그대로 유지됩니다. 자동으로 다시 시도하지 않으니, 결제 수단을 확인하신 뒤 대시보드에서 다시 변경해 주세요.`
    : '플랜은 변경되지 않았고 현재 플랜이 그대로 유지됩니다. 자동으로 다시 시도하지 않으니, 결제 수단을 확인하신 뒤 대시보드에서 다시 변경해 주세요.'
  const rows: Array<[string, string]> = []
  if (v.previousPlanName) rows.push(['현재 플랜', escapeHtml(v.previousPlanName)])
  rows.push(['변경하려던 플랜', escapeHtml(v.planName)])
  rows.push(['결제 시도 금액', `${formatWon(v.amount)} <span style="font-weight:400;color:${EMAIL_BRAND.muted};">(부가세 포함)</span>`])
  rows.push(['실패 사유', escapeHtml(v.failureReason)])
  if (v.cardLabel) rows.push(['결제 수단', escapeHtml(v.cardLabel)])
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: '플랜은 변경되지 않았습니다. 결제 수단을 확인해 주세요',
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(rows) + callout(status, 'danger'),
      cta: { label: '결제 수단 확인하고 다시 시도하기', url: SUBSCRIPTION_URL, tone: 'danger' },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${v.planName} 플랜으로 변경하기 위한 결제가 승인되지 않았습니다. 등록된 카드의 한도, 유효기간, 분실 여부를 확인해 주세요.`,
      '',
      v.previousPlanName ? `현재 플랜: ${v.previousPlanName}` : null,
      `변경하려던 플랜: ${v.planName}`,
      `결제 시도 금액: ${formatWon(v.amount)} (부가세 포함)`,
      `실패 사유: ${v.failureReason}`,
      v.cardLabel ? `결제 수단: ${v.cardLabel}` : null,
      '',
      status.replace(/<[^>]+>/g, ''),
      '',
      `구독 관리: ${SUBSCRIPTION_URL}`,
    ]),
  }
}

export interface PaymentFailedVars {
  recipientName?: string | null
  planName: string
  amount: number
  failureReason: string
  /** 유예 종료 ISO(grace_period_end) */
  graceEndsAt: string
  cardLabel?: string | null
}

/** 정기 결제 실패(유예 7일 시작, 최초 실패 1회만 발송) */
export function buildPaymentFailedEmail(v: PaymentFailedVars): EmailContent {
  const title = '정기 결제에 실패했습니다'
  const graceDate = formatKstDate(v.graceEndsAt)
  const lead = `${BRAND} 구독의 정기 결제가 실패했습니다. 등록된 카드의 한도, 유효기간, 분실 여부를 확인해 주세요.`
  const warn = `<strong>${graceDate}</strong>까지 매일 자동으로 결제를 다시 시도합니다. 이 기간 안에 결제가 완료되지 않으면 구독이 만료되고, 만료 후 7일이 지나면 저장된 데이터가 삭제됩니다.`
  const rows: Array<[string, string]> = [
    ['플랜', escapeHtml(v.planName)],
    ['결제 금액', `${formatWon(v.amount)} <span style="font-weight:400;color:${EMAIL_BRAND.muted};">(부가세 포함)</span>`],
    ['실패 사유', escapeHtml(v.failureReason)],
  ]
  if (v.cardLabel) rows.push(['결제 수단', escapeHtml(v.cardLabel)])
  rows.push(['재시도 기간', `${graceDate}까지`])
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${graceDate}까지 결제 수단을 확인해 주세요`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + infoTable(rows) + callout(warn, 'danger'),
      cta: { label: '결제 수단 변경하기', url: SUBSCRIPTION_URL, tone: 'danger' },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${lead}`,
      '',
      `플랜: ${v.planName}`,
      `결제 금액: ${formatWon(v.amount)} (부가세 포함)`,
      `실패 사유: ${v.failureReason}`,
      v.cardLabel ? `결제 수단: ${v.cardLabel}` : null,
      `재시도 기간: ${graceDate}까지`,
      '',
      `${graceDate}까지 매일 자동으로 결제를 다시 시도합니다. 이 기간 안에 결제가 완료되지 않으면 구독이 만료되고, 만료 후 7일이 지나면 저장된 데이터가 삭제됩니다.`,
      '',
      `결제 수단 변경: ${SUBSCRIPTION_URL}`,
    ]),
  }
}

// ───────────────────────── 만료 라이프사이클 ─────────────────────────

export type LifecycleVariant = 'trial' | 'subscription'

export interface LifecycleVars {
  variant: LifecycleVariant
  recipientName?: string | null
  /** 만료 시각 ISO(trial_end_date 또는 current_period_end) */
  expiresAt: string
}

function unitWord(variant: LifecycleVariant): string {
  return variant === 'trial' ? '무료체험' : '구독'
}

const DELETION_WARN =
  '만료 후 7일이 지나면 저장된 상담 신청과 랜딩페이지 데이터가 삭제됩니다.'

/** 만료 2일 전 */
export function buildExpiring2dEmail(v: LifecycleVars): EmailContent {
  const unit = unitWord(v.variant)
  const title = `${unit}이 2일 후 만료됩니다`
  const when = formatKstDateTime(v.expiresAt)
  const lead = `${BRAND} ${unit}이 <strong>${when}</strong>에 만료됩니다. 계속 이용하시려면 만료 전에 결제를 진행해 주세요.`
  const after =
    v.variant === 'trial'
      ? '결제하시면 무료체험 기간 동안 만든 랜딩페이지와 상담 신청 데이터를 그대로 이어서 사용하실 수 있습니다.'
      : '계속 이용하시려면 결제 수단을 등록하고 플랜을 선택해 주세요. 결제가 실패한 상태라면 결제 수단을 변경해 주세요.'
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: `${when} 만료 예정`,
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + paragraph(after) + callout(DELETION_WARN, 'danger'),
      cta: { label: '구독 플랜 선택하기', url: SUBSCRIPTION_URL },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${BRAND} ${unit}이 ${when}에 만료됩니다. 계속 이용하시려면 만료 전에 결제를 진행해 주세요.`,
      after,
      DELETION_WARN,
      '',
      `구독 플랜 선택: ${SUBSCRIPTION_URL}`,
    ]),
  }
}

/** 만료 당일 */
export function buildExpiringTodayEmail(v: LifecycleVars): EmailContent {
  const unit = unitWord(v.variant)
  const title = `${unit}이 오늘 만료됩니다`
  const lead = `${BRAND} ${unit}이 오늘 만료됩니다. 만료 후에는 대시보드 이용이 제한되며, 7일이 지나면 저장된 데이터가 삭제됩니다.`
  const now = '지금 결제하시면 중단 없이 계속 이용하실 수 있습니다.'
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: '지금 결제하시면 중단 없이 계속 이용하실 수 있습니다',
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + paragraph(now) + callout(DELETION_WARN, 'danger'),
      cta: { label: '지금 결제하기', url: SUBSCRIPTION_URL },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${lead}`,
      now,
      '',
      `구독 플랜 선택: ${SUBSCRIPTION_URL}`,
    ]),
  }
}

export interface WinbackVars {
  variant: LifecycleVariant
  timing: '2d' | '1m'
  recipientName?: string | null
  /** 할인 토큰이 붙은 플랜 선택 URL */
  discountUrl: string
}

/** 만료 2일 후 / 1개월 후 윈백(10% 할인, 7일 유효) */
export function buildWinbackEmail(v: WinbackVars): EmailContent {
  const unit = unitWord(v.variant)
  const title = '다시 시작하실 수 있도록 10% 할인을 드립니다'
  const lead =
    v.timing === '2d'
      ? `${BRAND} ${unit}은 잘 이용하셨나요? 다시 시작하시는 분께 <strong>7일 동안 10% 할인</strong>을 드립니다.`
      : `${BRAND} ${unit}이 끝난 지 한 달이 지났습니다. 다시 시작하시는 분께 <strong>7일 동안 10% 할인</strong>을 드립니다.`
  const how = '아래 버튼을 통해 결제하실 때만 할인이 적용됩니다.'
  const dataNote =
    v.timing === '2d'
      ? '만료 후 7일이 지나면 저장된 데이터가 삭제됩니다. 할인 기간 안에 결제하시면 데이터도 그대로 유지됩니다.'
      : '만료 후 37일이 지나기 전에 결제하시면 기존 데이터를 그대로 복구해 드립니다.'
  const leadText = lead.replace(/<[^>]+>/g, '')
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: '7일 동안 10% 할인, 아래 링크로 결제하실 때만 적용됩니다',
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + paragraph(how) + callout(dataNote, 'danger'),
      cta: { label: '10% 할인받고 다시 시작하기', url: v.discountUrl },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${leadText}`,
      how,
      dataNote,
      '',
      `할인받고 다시 시작하기: ${v.discountUrl}`,
    ]),
  }
}

export interface DataDeletedVars {
  variant: LifecycleVariant
  recipientName?: string | null
}

/** 만료 7일 후 데이터 삭제 처리 안내(30일 내 복구 가능) */
export function buildDataDeletedEmail(v: DataDeletedVars): EmailContent {
  const unit = unitWord(v.variant)
  const title = '데이터가 삭제 처리되었습니다'
  const lead = `${BRAND} ${unit} 만료 후 7일이 지나 저장된 상담 신청과 랜딩페이지 데이터가 삭제 처리되었습니다.`
  const restore = `<strong>30일 이내</strong>에 결제하시면 데이터를 그대로 복구해 드립니다. 30일이 지나면 완전히 삭제되어 복구할 수 없습니다.`
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: '30일 이내에 결제하시면 데이터를 복구해 드립니다',
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + callout(restore, 'danger'),
      cta: { label: '결제하고 데이터 복구하기', url: SUBSCRIPTION_URL },
      footerNote: SUBSCRIPTION_FOOTER,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, ${lead}`,
      '30일 이내에 결제하시면 데이터를 그대로 복구해 드립니다. 30일이 지나면 완전히 삭제되어 복구할 수 없습니다.',
      '',
      `구독 플랜 선택: ${SUBSCRIPTION_URL}`,
    ]),
  }
}

// ───────────────────────── 리드·문의 ─────────────────────────

export interface LeadDigestItem {
  name: string
  phone: string
  email?: string | null
  landingPageTitle: string
  deviceType: string
  /** 표시용 KST 문자열 */
  createdAt: string
}

export interface LeadDigestVars {
  companyName: string
  leads: LeadDigestItem[]
  dashboardUrl?: string
}

/** 신규 상담 신청 다이제스트 */
export function buildLeadDigestEmail(v: LeadDigestVars): EmailContent {
  const n = v.leads.length
  const title = `새 상담 신청이 ${n}건 도착했습니다`
  const url = v.dashboardUrl ?? LEADS_URL
  const lead = `${escapeHtml(v.companyName)}의 랜딩페이지를 통해 접수된 상담 신청입니다. 빠르게 연락할수록 상담 전환율이 높아집니다.`
  const rows = v.leads
    .map(
      (l, i) => `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid ${EMAIL_BRAND.border};font-size:13px;color:${EMAIL_BRAND.muted};vertical-align:top;">${i + 1}</td>
          <td style="padding:12px 14px;border-bottom:1px solid ${EMAIL_BRAND.border};font-size:14px;color:${EMAIL_BRAND.ink};vertical-align:top;">
            <strong>${escapeHtml(l.name)}</strong><br>
            <span style="font-size:13px;color:${EMAIL_BRAND.text};">${escapeHtml(l.phone)}${l.email ? ` · ${escapeHtml(l.email)}` : ''}</span><br>
            <span style="font-size:12px;color:${EMAIL_BRAND.muted};">${escapeHtml(l.landingPageTitle)} · ${l.deviceType === 'mobile' ? '모바일' : 'PC'} · ${escapeHtml(l.createdAt)}</span>
          </td>
        </tr>`
    )
    .join('')
  const table = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border:1px solid ${EMAIL_BRAND.border};border-radius:8px;border-collapse:separate;overflow:hidden;">
        ${rows}
      </table>`
  return {
    subject: `${SUBJECT_PREFIX} ${v.companyName.replace(/[\r\n]/g, ' ')} 새 상담 신청 ${n}건`,
    html: renderEmailShell({
      title,
      preheader: v.leads.map((l) => l.name).slice(0, 3).join(', '),
      bodyHtml: paragraph(lead) + table,
      cta: { label: '상담 신청 확인하기', url },
      footerNote: '이 메일은 새 상담 신청이 접수될 때 자동 발송됩니다. 수신 여부는 대시보드 설정에서 변경할 수 있습니다.',
    }),
    text: textLines([
      `${v.companyName} 새 상담 신청 ${n}건`,
      '',
      ...v.leads.map(
        (l, i) =>
          `${i + 1}. ${l.name} / ${l.phone}${l.email ? ` / ${l.email}` : ''} / ${l.landingPageTitle} / ${l.createdAt}`
      ),
      '',
      `상담 신청 확인: ${url}`,
    ]),
  }
}

export interface TicketAdminReplyVars {
  recipientName?: string | null
  ticketSubject: string
  replyMessage: string
  ticketUrl: string
}

/** 고객 문의 티켓에 관리자 답변 등록 */
export function buildTicketAdminReplyEmail(v: TicketAdminReplyVars): EmailContent {
  const safeSubject = v.ticketSubject.replace(/[\r\n]/g, ' ')
  const title = '문의하신 내용에 답변이 등록되었습니다'
  const lead = `문의하신 <strong>"${escapeHtml(safeSubject)}"</strong>에 ${BRAND} 팀의 답변이 등록되었습니다.`
  const followUp = '추가로 궁금한 점이 있으면 같은 문의에 답글로 남겨 주세요. 이어서 도와드리겠습니다.'
  return {
    subject: `${SUBJECT_PREFIX} 문의하신 "${safeSubject}"에 답변이 등록되었습니다`,
    html: renderEmailShell({
      title,
      preheader: v.replyMessage.slice(0, 80),
      bodyHtml: greeting(v.recipientName) + paragraph(lead) + quote(escapeHtml(v.replyMessage)) + paragraph(followUp),
      cta: { label: '답변 확인하기', url: v.ticketUrl },
      footerNote: `이 메일은 ${BRAND} 고객센터 문의에 답변이 등록될 때 자동 발송됩니다.`,
    }),
    text: textLines([
      `${displayName(v.recipientName)}, 문의하신 "${safeSubject}"에 ${BRAND} 팀의 답변이 등록되었습니다.`,
      '',
      v.replyMessage,
      '',
      followUp,
      `답변 확인: ${v.ticketUrl}`,
    ]),
  }
}

// ───────────────────────── 인증 ─────────────────────────

/**
 * 비밀번호 재설정. Supabase Auth 템플릿에 붙여 넣는 용도라 GoTrue 플레이스홀더를 그대로 둔다.
 * subject는 대시보드 Subject 칸에, html은 Body(Source)에 넣는다.
 */
export function buildPasswordResetTemplate(): EmailContent {
  const title = '비밀번호 재설정 안내'
  const lead = `${BRAND} 계정의 비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.`
  const expiry = '보안을 위해 이 링크는 일정 시간이 지나면 만료됩니다. 만료된 경우 로그인 화면에서 다시 요청해 주세요.'
  const ignore = '본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.'
  return {
    subject: `${SUBJECT_PREFIX} ${title}`,
    html: renderEmailShell({
      title,
      preheader: '아래 버튼을 눌러 새 비밀번호를 설정해 주세요',
      bodyHtml: paragraph(lead) + paragraph(expiry) + callout(ignore),
      cta: { label: '비밀번호 재설정', url: '{{ .ConfirmationURL }}' },
      footerNote: '이 메일은 {{ .Email }} 계정의 비밀번호 재설정 요청에 따라 발송되었습니다.',
    }),
    text: textLines([lead, expiry, ignore, '', '비밀번호 재설정: {{ .ConfirmationURL }}']),
  }
}

// ───────────────────────── 내부 알림(운영자 수신) ─────────────────────────

export interface InquiryReceivedVars {
  /** 예: "영업 상담" */
  inquiryTypeLabel: string
  subject: string
  name: string
  phone?: string | null
  email?: string | null
  company?: string | null
  message: string
  createdAt: string
  adminUrl: string
}

/** 홈페이지 문의 접수 → 운영자 */
export function buildInquiryReceivedEmail(v: InquiryReceivedVars): EmailContent {
  const title = '홈페이지 문의가 접수되었습니다'
  const safeSubject = v.subject.replace(/[\r\n]/g, ' ')
  const rows: Array<[string, string]> = [
    ['유형', escapeHtml(v.inquiryTypeLabel)],
    ['제목', escapeHtml(safeSubject)],
    ['이름', escapeHtml(v.name)],
  ]
  if (v.phone) rows.push(['연락처', escapeHtml(v.phone)])
  if (v.email) rows.push(['이메일', escapeHtml(v.email)])
  if (v.company) rows.push(['회사', escapeHtml(v.company)])
  rows.push(['접수 시각', escapeHtml(v.createdAt)])
  return {
    subject: `${INTERNAL_PREFIX} 홈페이지 문의 [${v.inquiryTypeLabel}] - ${safeSubject}`,
    html: renderEmailShell({
      title,
      preheader: v.message.slice(0, 80),
      bodyHtml: infoTable(rows) + quote(escapeHtml(v.message)),
      cta: { label: '어드민에서 확인하기', url: v.adminUrl },
      internal: true,
      footerNote: '운영자에게만 발송되는 내부 알림입니다.',
    }),
    text: textLines([
      title,
      `[${v.inquiryTypeLabel}] ${safeSubject}`,
      `이름: ${v.name}`,
      v.phone ? `연락처: ${v.phone}` : null,
      v.email ? `이메일: ${v.email}` : null,
      v.company ? `회사: ${v.company}` : null,
      `접수 시각: ${v.createdAt}`,
      '',
      v.message,
      '',
      `어드민: ${v.adminUrl}`,
    ]),
  }
}

export interface TicketCustomerReplyVars {
  companyName: string
  customerName?: string | null
  ticketSubject: string
  message: string
  adminUrl: string
}

/** 고객이 티켓에 답글 → 운영자 */
export function buildTicketCustomerReplyEmail(v: TicketCustomerReplyVars): EmailContent {
  const safeSubject = v.ticketSubject.replace(/[\r\n]/g, ' ')
  const title = '고객이 문의에 답글을 남겼습니다'
  const rows: Array<[string, string]> = [['회사', escapeHtml(v.companyName)]]
  if (v.customerName) rows.push(['고객', escapeHtml(v.customerName)])
  rows.push(['문의 제목', escapeHtml(safeSubject)])
  return {
    subject: `${INTERNAL_PREFIX} 고객 답글 - "${safeSubject}"`,
    html: renderEmailShell({
      title,
      preheader: v.message.slice(0, 80),
      bodyHtml: infoTable(rows) + quote(escapeHtml(v.message)),
      cta: { label: '어드민에서 답변하기', url: v.adminUrl },
      internal: true,
      footerNote: '운영자에게만 발송되는 내부 알림입니다.',
    }),
    text: textLines([
      title,
      `회사: ${v.companyName}`,
      v.customerName ? `고객: ${v.customerName}` : null,
      `문의 제목: ${safeSubject}`,
      '',
      v.message,
      '',
      `어드민: ${v.adminUrl}`,
    ]),
  }
}

export interface TrialCreationFailedVars {
  companyName: string
  email: string
  reason: string
  userId?: string | null
  adminUrl: string
}

/** 회원가입 중 무료체험 구독 생성 실패 → 운영자 */
export function buildTrialCreationFailedEmail(v: TrialCreationFailedVars): EmailContent {
  const title = '무료체험 구독 생성에 실패했습니다'
  const lead =
    '회원가입은 완료됐지만 무료체험 구독이 만들어지지 않았습니다. 이 회사는 대시보드에 들어가면 구독 없음 상태로 보이므로 확인이 필요합니다.'
  const rows: Array<[string, string]> = [
    ['회사', escapeHtml(v.companyName)],
    ['가입 이메일', escapeHtml(v.email)],
    ['실패 사유', escapeHtml(v.reason)],
  ]
  if (v.userId) rows.push(['회사 ID', escapeHtml(v.userId)])
  return {
    subject: `${INTERNAL_PREFIX} 무료체험 구독 생성 실패 - ${v.companyName.replace(/[\r\n]/g, ' ')}`,
    html: renderEmailShell({
      title,
      preheader: v.reason.slice(0, 80),
      bodyHtml: callout(lead, 'danger') + infoTable(rows),
      cta: { label: '어드민에서 회사 확인하기', url: v.adminUrl, tone: 'danger' },
      internal: true,
      footerNote: '운영자에게만 발송되는 내부 알림입니다.',
    }),
    text: textLines([
      title,
      lead,
      '',
      `회사: ${v.companyName}`,
      `가입 이메일: ${v.email}`,
      `실패 사유: ${v.reason}`,
      v.userId ? `회사 ID: ${v.userId}` : null,
      '',
      `어드민: ${v.adminUrl}`,
    ]),
  }
}

export interface AdminReportMetric {
  label: string
  value: string
  emails?: string[]
}

export interface AdminDailyReportVars {
  /** 예: "9월 18일(목)" */
  dateLabel: string
  metrics: AdminReportMetric[]
  totalActivity: number
  dashboardUrl: string
}

/** 어드민 일일 리포트 → 운영자 */
export function buildAdminDailyReportEmail(v: AdminDailyReportVars): EmailContent {
  const title = `${v.dateLabel} 일일 리포트`
  const rows: Array<[string, string]> = v.metrics.map((m) => [
    m.label,
    `${escapeHtml(m.value)}${
      m.emails && m.emails.length
        ? `<br><span style="font-weight:400;font-size:12px;color:${EMAIL_BRAND.muted};">${m.emails.map(escapeHtml).join('<br>')}</span>`
        : ''
    }`,
  ])
  return {
    subject: `${INTERNAL_PREFIX} ${v.dateLabel} 일일 리포트 - 신규 ${v.totalActivity}건`,
    html: renderEmailShell({
      title,
      preheader: `신규 활동 ${v.totalActivity}건`,
      bodyHtml: paragraph('전날 발생한 가입, 체험, 결제, 문의 활동을 모았습니다.') + infoTable(rows),
      cta: { label: '어드민 리포트 자세히 보기', url: v.dashboardUrl },
      internal: true,
      footerNote: '전날 신규 활동이 1건 이상 있을 때 매일 아침 자동 발송됩니다.',
    }),
    text: textLines([
      title,
      '',
      ...v.metrics.map(
        (m) => `${m.label}: ${m.value}${m.emails && m.emails.length ? '\n' + m.emails.map((e) => `  - ${e}`).join('\n') : ''}`
      ),
      '',
      `어드민 리포트: ${v.dashboardUrl}`,
    ]),
  }
}
