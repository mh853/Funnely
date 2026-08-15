// 고객지원 티켓 공식 답변을 고객에게 즉시 이메일로 알리는 헬퍼
import { escapeHtml } from '@/lib/email/template-renderer'
import { sendAndLogEmail } from '@/lib/email/send-and-log'

interface TicketReplyNotificationData {
  recipientEmail: string
  ticketSubject: string
  replyMessage: string
  dashboardUrl: string
}

/**
 * 고객지원 티켓 공식 답변 알림 이메일 전송
 */
export async function sendTicketReplyNotificationEmail(data: TicketReplyNotificationData) {
  const { recipientEmail, ticketSubject, replyMessage, dashboardUrl } = data

  const safeSubject = escapeHtml(ticketSubject)
  const safeReply = escapeHtml(replyMessage).replace(/\n/g, '<br>')

  // 본문(safeReply)은 escapeHtml을 쓰면서 제목은 원본 ticketSubject(사용자가 티켓 생성
  // 시 자유입력한 값)를 그대로 써서, 개행문자를 삽입하면 이메일 헤더 인젝션이 가능했다
  // (81차 QA, 73차 백로그 항목 재확인).
  const subject = `[Funnely] 문의하신 "${ticketSubject.replace(/[\r\n]/g, ' ')}"에 답변이 등록되었습니다`

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
      <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">💬 문의하신 내용에 답변이 등록되었습니다</h1>
      <p style="margin: 0; font-size: 14px; opacity: 0.95;">"${safeSubject}"</p>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
      <div style="white-space: pre-wrap; color: #111827; font-size: 15px; line-height: 1.6;">${safeReply}</div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          대시보드에서 전체 내용 확인하기 →
        </a>
      </div>
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p>이 이메일은 Funnely 고객지원팀의 답변 알림입니다.</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `문의하신 "${ticketSubject}"에 답변이 등록되었습니다.\n\n${replyMessage}\n\n대시보드에서 확인하기: ${dashboardUrl}`

  return sendAndLogEmail({
    to: recipientEmail,
    subject,
    html: htmlContent,
    text: textContent,
    kind: 'ticket_admin_reply',
  })
}
