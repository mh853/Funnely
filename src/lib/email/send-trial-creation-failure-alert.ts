// 회원가입 시 무료체험 구독 생성이 실패하면 관리자에게 알림 메일을 발송한다 -
// 이전에는 console.error만 남아 Vercel 로그를 직접 보지 않는 한 아무도 모른 채
// 지나갔고, 가입은 성공했지만 구독이 없어 대시보드가 잠긴 사용자가 발생했다.
import { Resend } from 'resend'
import { config } from '@/lib/config'
import { FROM_ADDRESS } from '@/lib/email/constants'
import { buildTrialCreationFailedEmail } from '@/lib/email/email-copy'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']

interface TrialCreationFailureData {
  companyId: string
  companyName: string
  userEmail: string
  reason: string
}

/**
 * 무료체험 구독 생성 실패 알림 이메일 전송. 발송 자체가 실패해도 던지지 않는다 -
 * 회원가입 응답을 막아서는 안 되고, console.error가 최후 방어선으로 남아있다.
 */
export async function sendTrialCreationFailureAlert(data: TrialCreationFailureData) {
  const client = getResendClient()
  if (!client) {
    console.error('Resend API key가 설정되지 않아 무료체험 생성 실패 알림을 보낼 수 없습니다.')
    return
  }

  const content = buildTrialCreationFailedEmail({
    companyName: data.companyName,
    email: data.userEmail,
    reason: data.reason,
    userId: data.companyId,
    adminUrl: `${config.app.domain}/admin/companies/${data.companyId}`,
  })

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: NOTIFICATION_RECIPIENTS,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })

    if (error) {
      console.error('무료체험 생성 실패 알림 메일 발송 오류:', error)
    }
  } catch (err) {
    console.error('무료체험 생성 실패 알림 메일 발송 중 예외:', err)
  }
}
