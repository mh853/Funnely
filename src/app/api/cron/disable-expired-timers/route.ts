import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 타이머 마감 시간이 지난 랜딩페이지 자동 비활성화
 *
 * 실행 주기: 매시간
 *
 * 로직:
 * 1. timer_enabled = true
 * 2. timer_auto_update = false (자동 업데이트 비활성화)
 * 3. timer_deadline < 현재 시간
 * 4. is_active = true (현재 활성화 상태)
 *
 * 위 조건을 만족하는 랜딩페이지를 찾아 is_active = false로 업데이트
 */
export async function GET(request: Request) {
  try {
    // 1. Cron 인증 확인 (Vercel Cron Secret)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[CRON] Unauthorized access attempt to disable-expired-timers')
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. Supabase 클라이언트 생성
    const supabase = await createServerClient()

    // 3. 만료된 랜딩페이지 조회
    const now = new Date().toISOString()

    const { data: expiredPages, error: selectError } = await supabase
      .from('landing_pages')
      .select('id, title, timer_deadline')
      .eq('timer_enabled', true)
      .eq('timer_auto_update', false)
      .eq('is_active', true)
      .lt('timer_deadline', now)

    if (selectError) {
      console.error('[CRON] Error selecting expired landing pages:', selectError)
      return NextResponse.json(
        { error: 'Failed to query expired landing pages' },
        { status: 500 }
      )
    }

    // 만료된 페이지가 없으면 성공 응답
    if (!expiredPages || expiredPages.length === 0) {
      const result = {
        timestamp: new Date().toISOString(),
        checked: 0,
        disabled: 0,
        landingPages: []
      }
      console.log('[CRON] Disable Expired Timers:', result)
      return NextResponse.json(result)
    }

    // 4. 일괄 비활성화 처리
    const expiredIds = expiredPages.map((page) => page.id)

    const { error: updateError } = await supabase
      .from('landing_pages')
      .update({ is_active: false })
      .in('id', expiredIds)

    if (updateError) {
      console.error('[CRON] Error disabling expired landing pages:', updateError)
      return NextResponse.json(
        { error: 'Failed to disable expired landing pages' },
        { status: 500 }
      )
    }

    // 5. 결과 반환
    const result = {
      timestamp: new Date().toISOString(),
      checked: expiredPages.length,
      disabled: expiredPages.length,
      landingPages: expiredPages.map((page) => ({
        id: page.id,
        title: page.title,
        deadline: page.timer_deadline
      }))
    }

    console.log('[CRON] Disable Expired Timers:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CRON] Unexpected error in disable-expired-timers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
