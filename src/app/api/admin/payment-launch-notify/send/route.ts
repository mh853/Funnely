// 결제 정식 오픈 시 알림 신청자 전원에게 안내 메일 발송 (노션 31번 항목 후속)
// 자동 트리거는 없음 - /admin/payment-launch-notify 페이지에서 관리자가 직접 실행
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { FROM_ADDRESS } from '@/lib/email/constants'

export async function POST() {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: pending, error } = await supabase
    .from('payment_launch_notify_signups')
    .select('id, email')
    .is('launch_email_sent_at', null)

  if (error) {
    console.error('payment_launch_notify_signups fetch error:', error)
    return NextResponse.json({ error: '신청자 목록을 불러오지 못했습니다.' }, { status: 500 })
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: '발송 대상이 없습니다.' })
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
    ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '')
    : 'https://funnely.co.kr'

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 15px; color: #374151; line-height: 1.7; }
    .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎉 퍼널리 결제 시스템 정식 오픈</h1></div>
    <div class="content">
      <p>안녕하세요, 퍼널리입니다.</p>
      <p>기다려주신 결제 시스템이 정식으로 오픈되었습니다. 이제 카드 등록 및 결제가 정상적으로 처리됩니다.</p>
      <p>대시보드에서 원하시는 플랜의 카드를 등록하시면 바로 이용하실 수 있습니다.</p>
      <a href="${dashboardUrl}/dashboard/subscription" class="button">플랜 확인하러 가기 →</a>
    </div>
  </div>
</body>
</html>`

  const textContent = `퍼널리 결제 시스템 정식 오픈\n\n기다려주신 결제 시스템이 정식으로 오픈되었습니다. 이제 카드 등록 및 결제가 정상적으로 처리됩니다.\n\n플랜 확인: ${dashboardUrl}/dashboard/subscription`

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  const sentIds: string[] = []

  for (const row of pending) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [row.email],
        subject: '🎉 [Funnely] 결제 시스템 정식 오픈 안내',
        html: htmlContent,
        text: textContent,
      })
      if (sendError) throw sendError
      sent++
      sentIds.push(row.id)
    } catch (sendError) {
      console.error(`[Payment Launch Notify] Failed to send to ${row.email}:`, sendError)
      failed++
    }
  }

  if (sentIds.length > 0) {
    await supabase
      .from('payment_launch_notify_signups')
      .update({ launch_email_sent_at: new Date().toISOString() })
      .in('id', sentIds)
  }

  return NextResponse.json({ sent, failed })
}
