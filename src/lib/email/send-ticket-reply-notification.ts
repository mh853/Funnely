// 고객지원 티켓 공식 답변을 고객에게 즉시 이메일로 알리는 헬퍼
import { buildTicketAdminReplyEmail } from '@/lib/email/email-copy'
import { sendAndLogEmail } from '@/lib/email/send-and-log'

interface TicketReplyNotificationData {
  recipientEmail: string
  recipientName?: string | null
  ticketSubject: string
  replyMessage: string
  dashboardUrl: string
}

/**
 * 고객지원 티켓 공식 답변 알림 이메일 전송. 제목의 개행 제거와 본문 escape는 빌더가 처리한다.
 */
export async function sendTicketReplyNotificationEmail(data: TicketReplyNotificationData) {
  const content = buildTicketAdminReplyEmail({
    recipientName: data.recipientName ?? null,
    ticketSubject: data.ticketSubject,
    replyMessage: data.replyMessage,
    ticketUrl: data.dashboardUrl,
  })

  return sendAndLogEmail({
    to: data.recipientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    kind: 'ticket_admin_reply',
  })
}
