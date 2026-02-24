import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Called by PublicLandingPage when timer countdown reaches zero.
 * Disables the landing page and creates a real-time notification for the company.
 * No auth required — validates timer expiry server-side before taking action.
 */
export async function POST(request: NextRequest) {
  try {
    const { landing_page_id } = await request.json()

    if (!landing_page_id) {
      return NextResponse.json({ error: 'landing_page_id is required' }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    // Fetch the landing page and verify timer is actually expired
    const { data: page, error: fetchError } = await supabase
      .from('landing_pages')
      .select('id, title, slug, company_id, is_active, timer_enabled, timer_deadline, timer_auto_update')
      .eq('id', landing_page_id)
      .single()

    if (fetchError || !page) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 })
    }

    // Guard: only proceed if timer is enabled and not auto-updating
    if (!page.timer_enabled || page.timer_auto_update) {
      return NextResponse.json({ skipped: true, reason: 'timer_auto_update or timer disabled' })
    }

    // Guard: verify deadline has actually passed (server-side check)
    if (!page.timer_deadline || new Date(page.timer_deadline) > new Date()) {
      return NextResponse.json({ skipped: true, reason: 'timer not yet expired' })
    }

    // Guard: already inactive — avoid duplicate notifications
    if (!page.is_active) {
      return NextResponse.json({ skipped: true, reason: 'already inactive' })
    }

    // Disable the landing page
    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({ is_active: false, status: 'draft' })
      .eq('id', landing_page_id)

    if (updateError) {
      throw new Error(`Failed to disable landing page: ${updateError.message}`)
    }

    // Create real-time notification for the company dashboard
    const deadlineStr = new Date(page.timer_deadline).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    await supabase.from('notifications').insert({
      company_id: page.company_id,
      title: '랜딩페이지 타이머 만료로 비활성화',
      message: `"${page.title}" 랜딩페이지의 타이머가 ${deadlineStr}에 만료되어 자동으로 비활성화되었습니다. 다시 활성화하려면 새로운 마감 날짜를 설정해주세요.`,
      type: 'landing_page_timer_expired',
      metadata: { landing_page_id: page.id, slug: page.slug },
    })

    // Revalidate public landing page cache
    try {
      const baseUrl = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: page.slug,
          secret: process.env.REVALIDATION_SECRET,
        }),
      })
    } catch {
      // Non-critical: cache will expire naturally
    }

    return NextResponse.json({ success: true, disabled: true })
  } catch (error: any) {
    console.error('[Timer Expired API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
