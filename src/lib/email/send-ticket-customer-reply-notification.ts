// 고객이 지원 티켓에 후속 메시지를 남겼음을 담당 관리자(또는 전체 super admin)에게 알리는 헬퍼
import { buildTicketCustomerReplyEmail } from '@/lib/email/email-copy'
import { sendAndLogEmail } from '@/lib/email/send-and-log'

interface TicketCustomerReplyNotificationData {
  recipientEmails: string[]
  companyName: string
  customerName?: string | null
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
  const { recipientEmails } = data
  if (recipientEmails.length === 0) return { success: false, skipped: true }

  const content = buildTicketCustomerReplyEmail({
    companyName: data.companyName,
    customerName: data.customerName ?? null,
    ticketSubject: data.ticketSubject,
    message: data.messageContent,
    adminUrl: data.adminUrl,
  })

  const results = await Promise.allSettled(
    recipientEmails.map((to) =>
      sendAndLogEmail({
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
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
