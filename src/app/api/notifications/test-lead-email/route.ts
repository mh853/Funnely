import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLeadNotificationEmail } from '@/lib/email/send-lead-notification'

// POST - 테스트 이메일 전송
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission
    if (!['company_owner', 'company_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: '권한이 없습니다. 회사 관리자만 실행할 수 있습니다.' },
        { status: 403 }
      )
    }

    // Get company notification emails
    const { data: company } = await supabase
      .from('companies')
      .select('name, notification_emails')
      .eq('id', userProfile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const emails = company.notification_emails || []

    if (emails.length === 0) {
      return NextResponse.json(
        { error: '등록된 이메일 주소가 없습니다.' },
        { status: 400 }
      )
    }

    // Get dashboard URL
    const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
      ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/dashboard/leads'
      : 'https://funnely.co.kr/dashboard/leads'

    // Send test emails
    const results = []
    const errors = []

    for (const email of emails) {
      try {
        await sendLeadNotificationEmail({
          recipientEmail: email,
          companyName: company.name,
          leadName: '홍길동 (테스트)',
          leadPhone: '010-1234-5678',
          leadEmail: 'test@example.com',
          landingPageTitle: '테스트 랜딩페이지',
          deviceType: 'desktop',
          createdAt: new Date().toISOString(),
          dashboardUrl,
        })

        results.push(email)
      } catch (error) {
        console.error(`Failed to send test email to ${email}:`, error)
        errors.push({
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: '모든 이메일 전송에 실패했습니다.',
          details: errors,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sentTo: results.length,
      totalEmails: emails.length,
      successfulEmails: results,
      failedEmails: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
