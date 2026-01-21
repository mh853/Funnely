import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Vercel Cron Job: Lead Digest Email
// Runs at 8 AM KST (23:00 UTC previous day) and 4 PM KST (07:00 UTC)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get current timestamp for marking emails as sent
    const now = new Date().toISOString()

    // Query unsent leads from lead_notification_queue
    const { data: pendingNotifications, error: queryError } = await supabase
      .from('lead_notification_queue')
      .select('*')
      .eq('sent', false)
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })

    if (queryError) {
      console.error('[Lead Digest] Query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[Lead Digest] No pending notifications')
      return NextResponse.json({
        success: true,
        message: 'No pending notifications',
        processed: 0,
      })
    }

    console.log(`[Lead Digest] Found ${pendingNotifications.length} pending notifications`)

    // Group notifications by company
    const notificationsByCompany = new Map<string, any[]>()
    pendingNotifications.forEach((notification) => {
      const companyId = notification.company_id
      if (!notificationsByCompany.has(companyId)) {
        notificationsByCompany.set(companyId, [])
      }
      notificationsByCompany.get(companyId)!.push(notification)
    })

    let totalEmailsSent = 0
    let totalFailed = 0
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Process each company's notifications
    for (const [companyId, notifications] of Array.from(notificationsByCompany.entries())) {
      const firstNotification = notifications[0]
      const recipientEmails = firstNotification.recipient_emails || []

      if (recipientEmails.length === 0) {
        console.log(`[Lead Digest] No recipient emails for company ${companyId}`)
        continue
      }

      // Get company name
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()

      const companyName = company?.name || '회사'

      // Prepare digest content
      const leadItems = notifications.map((notif, index) => {
        const leadData = notif.lead_data
        return {
          number: index + 1,
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email || '미입력',
          landingPageTitle: leadData.landing_page_title || '알 수 없음',
          deviceType: leadData.device_type || 'pc',
          createdAt: new Date(leadData.created_at).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
          }),
        }
      })

      const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
        ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/dashboard/leads'
        : 'https://funnely.co.kr/dashboard/leads'

      // Send digest email to each recipient
      for (const recipientEmail of recipientEmails) {
        try {
          const htmlContent = generateDigestEmailHTML(companyName, leadItems, dashboardUrl)
          const textContent = generateDigestEmailText(companyName, leadItems, dashboardUrl)

          const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Funnely <noreply@funnely.co.kr>',
            to: [recipientEmail],
            subject: `📊 [${companyName}] ${leadItems.length}건의 새로운 상담 신청`,
            html: htmlContent,
            text: textContent,
          })

          if (emailError) {
            throw emailError
          }

          console.log(
            `[Lead Digest] Email sent to ${recipientEmail} for company ${companyId} (${leadItems.length} leads)`
          )
          totalEmailsSent++

          // Log successful send for each lead
          for (const notification of notifications) {
            await supabase.from('lead_notification_logs').insert({
              notification_queue_id: notification.id,
              company_id: companyId,
              lead_id: notification.lead_id,
              recipient_email: recipientEmail,
              sent_at: now,
              success: true,
              email_provider: 'resend',
            })
          }
        } catch (error) {
          console.error(`[Lead Digest] Failed to send to ${recipientEmail}:`, error)
          totalFailed++

          // Log failed send
          for (const notification of notifications) {
            await supabase.from('lead_notification_logs').insert({
              notification_queue_id: notification.id,
              company_id: companyId,
              lead_id: notification.lead_id,
              recipient_email: recipientEmail,
              sent_at: now,
              success: false,
              error_message: error instanceof Error ? error.message : 'Unknown error',
              email_provider: 'resend',
            })
          }
        }
      }

      // Mark all notifications as sent
      const notificationIds = notifications.map((n) => n.id)
      await supabase
        .from('lead_notification_queue')
        .update({ sent: true, sent_at: now })
        .in('id', notificationIds)
    }

    return NextResponse.json({
      success: true,
      message: 'Lead digest emails sent',
      companies: notificationsByCompany.size,
      totalLeads: pendingNotifications.length,
      emailsSent: totalEmailsSent,
      emailsFailed: totalFailed,
    })
  } catch (error: any) {
    console.error('[Lead Digest] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Generate HTML email for digest
function generateDigestEmailHTML(
  companyName: string,
  leads: Array<{
    number: number
    name: string
    phone: string
    email: string
    landingPageTitle: string
    deviceType: string
    createdAt: string
  }>,
  dashboardUrl: string
): string {
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const deviceIcons = {
    pc: '🖥️',
    mobile: '📱',
    tablet: '📲',
  }

  const leadsHTML = leads
    .map(
      (lead) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 16px; text-align: center; font-weight: 600; color: #6366f1;">${lead.number}</td>
      <td style="padding: 16px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${lead.name}</div>
        <div style="color: #6b7280; font-size: 14px;">${lead.phone}</div>
      </td>
      <td style="padding: 16px; color: #374151;">${lead.email}</td>
      <td style="padding: 16px; color: #374151;">${lead.landingPageTitle}</td>
      <td style="padding: 16px; text-align: center;">${deviceIcons[lead.deviceType as keyof typeof deviceIcons] || deviceIcons.pc}</td>
      <td style="padding: 16px; color: #6b7280; font-size: 14px;">${lead.createdAt}</td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>상담 신청 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 800px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 상담 신청 알림</h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 16px;">${companyName}</p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="background-color: #f0f9ff; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 16px; color: #1e40af;">
                  <strong>${currentTime}</strong> 기준<br>
                  새로운 상담 신청이 <strong style="color: #6366f1; font-size: 24px;">${leads.length}건</strong> 접수되었습니다.
                </p>
              </div>

              <!-- Leads Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; width: 60px;">순번</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">고객명/연락처</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">이메일</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">랜딩페이지</th>
                    <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; width: 60px;">기기</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">신청일시</th>
                  </tr>
                </thead>
                <tbody>
                  ${leadsHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                대시보드에서 상세 확인하기 →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                이 이메일은 <strong>${companyName}</strong>의 리드 알림 시스템에서 자동 발송되었습니다.<br>
                매일 오전 8시, 오후 4시에 새로운 상담 신청을 정리하여 보내드립니다.
              </p>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                Powered by <strong>Funnely</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Generate plain text email for digest
function generateDigestEmailText(
  companyName: string,
  leads: Array<{
    number: number
    name: string
    phone: string
    email: string
    landingPageTitle: string
    deviceType: string
    createdAt: string
  }>,
  dashboardUrl: string
): string {
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const leadsText = leads
    .map(
      (lead) => `
${lead.number}. ${lead.name} (${lead.phone})
   이메일: ${lead.email}
   랜딩페이지: ${lead.landingPageTitle}
   기기: ${lead.deviceType}
   신청일시: ${lead.createdAt}
`
    )
    .join('\n')

  return `
📊 [${companyName}] 상담 신청 알림

${currentTime} 기준
새로운 상담 신청이 ${leads.length}건 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${leadsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

대시보드에서 상세 정보를 확인하세요:
${dashboardUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 이메일은 ${companyName}의 리드 알림 시스템에서 자동 발송되었습니다.
매일 오전 8시, 오후 4시에 새로운 상담 신청을 정리하여 보내드립니다.

Powered by Funnely
  `
}
