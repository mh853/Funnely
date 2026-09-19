// 홈페이지 문의(public_inquiries) 접수 시 관리자에게 알림 메일을 발송한다
import { Resend } from 'resend'
import { config } from '@/lib/config'
import { FROM_ADDRESS } from '@/lib/email/constants'
import { buildInquiryReceivedEmail, formatKstDateTime } from '@/lib/email/email-copy'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  general: '일반 문의',
  sales: '영업 상담',
  technical: '기술 문의',
  billing: '결제 문의',
}

interface InquiryNotificationData {
  inquiryType: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  subject: string
  message: string
  createdAt: string
}

/**
 * 홈페이지 문의 접수 알림 이메일 전송. 비로그인 사용자 입력값의 escape와 제목 개행 제거는 빌더가 처리한다.
 */
export async function sendInquiryNotificationEmail(data: InquiryNotificationData) {
  const client = getResendClient()
  if (!client) {
    throw new Error('Resend API key is not configured')
  }

  const content = buildInquiryReceivedEmail({
    inquiryTypeLabel: INQUIRY_TYPE_LABELS[data.inquiryType] || '일반 문의',
    subject: data.subject,
    name: data.name,
    phone: data.phone ?? null,
    email: data.email,
    company: data.company ?? null,
    message: data.message,
    createdAt: formatKstDateTime(data.createdAt),
    adminUrl: `${config.app.domain}/admin/support/inquiries`,
  })

  const { data: emailData, error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: NOTIFICATION_RECIPIENTS,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })

  if (error) {
    throw error
  }

  return {
    success: true,
    emailId: emailData?.id,
  }
}
