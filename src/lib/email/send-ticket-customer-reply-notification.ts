// 고객이 지원 티켓에 후속 메시지를 남겼음을 담당 관리자(또는 전체 super admin)에게 알리는 헬퍼
import { escapeHtml } from '@/lib/email/template-renderer'
import { sendAndLogEmail } from '@/lib/email/send-and-log'

interface TicketCustomerReplyNotificationData {
  recipientEmails: string[]
  companyName: string
  ticketSubject: string
  messageContent: string
  adminUrl: string
}

/**
 * 고객지원 티켓에 고객이 새 메시지를 남겼을 때 관리자에게 보내는 알림 이메일
 */
export async function sendTicketCustomerReplyNotificationEmail(
  data: TicketCustomerReplyNotificationData
) {
  const { recipientEmails, companyName, ticketSubject, messageContent, adminUrl } = data

  if (recipientEmails.length === 0) return { success: false, skipped: true }

  const safeCompany = escapeHtml(companyName)
  const safeSubject = escapeHtml(ticketSubject)
  const safeMessage = escapeHtml(messageContent).replace(/\n/g, '<br>')

  // 본문(safeMessage)은 escapeHtml을 쓰면서 제목은 원본 companyName(회원가입 시
  // 자유입력)을 그대로 써서, 개행문자를 삽입하면 이메일 헤더 인젝션이 가능했다
  // (81차 QA, 73차 백로그 항목 재확인).
  const subject = `[Funnely] "${companyName.replace(/[\r\n]/g, ' ')}"에서 문의에 답글을 남겼습니다`

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">💬 고객이 문의에 답글을 남겼습니다</h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.95;">${safeCompany} · "${safeSubject}"</p>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
      <div style="white-space: pre-wrap; color: #111827; font-size: 15px; line-height: 1.6;">${safeMessage}</div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${adminUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          관리자 페이지에서 확인하기 →
        </a>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p>이 이메일은 Funnely 고객지원 티켓 알림입니다.</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `${companyName}에서 "${ticketSubject}" 문의에 답글을 남겼습니다.\n\n${messageContent}\n\n관리자 페이지에서 확인하기: ${adminUrl}`

  const results = await Promise.allSettled(
    recipientEmails.map((to) =>
      sendAndLogEmail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
        kind: 'ticket_customer_reply',
      })
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled')
  if (succeeded.length === 0) {
    const first = results[0]
    if (first && first.status === 'rejected') throw first.reason
    throw new Error('Failed to send ticket customer reply notification')
  }

  const firstOk = succeeded[0] as PromiseFulfilledResult<{ success: boolean; emailId?: string }>
  return { success: true, emailId: firstOk.value.emailId }
}
