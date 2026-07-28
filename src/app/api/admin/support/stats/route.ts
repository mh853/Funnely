import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { getKSTStartOfDay } from '@/lib/utils/date'

/**
 * GET /api/admin/support/stats
 * 지원 티켓 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 전체 티켓 조회 - range() 없이 조회하면 supabase의 암묵적 max_rows(1000)에
    // 걸려 플랫폼 전체 티켓이 1000건을 넘는 순간부터 이 통계 전체가 조용히
    // 축소된 값이 된다(api/leads/export 등에서 이미 겪은 것과 동일한 원인).
    // 1000건씩 배치로 반복 조회해 전체를 가져온다.
    const tickets: { status: string; priority: string; category: string; created_at: string; resolved_at: string | null }[] = []
    {
      const BATCH_SIZE = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('status, priority, category, created_at, resolved_at')
          .range(offset, offset + BATCH_SIZE - 1)

        if (error) {
          console.error('[Support Stats API] Error fetching tickets:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!data || data.length === 0) break
        tickets.push(...data)
        if (data.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }
    }

    // 통계 계산
    const total = tickets?.length || 0
    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    // 오늘 날짜 (KST 기준) - 서버(UTC)에서 setUTCHours(0,0,0,0)을 쓰면 KST 기준
    // 하루와 최대 9시간 어긋난다
    const todayStart = getKSTStartOfDay(0)
    let resolvedToday = 0

    tickets?.forEach((ticket) => {
      // 상태별 집계
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1

      // 우선순위별 집계
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1

      // 카테고리별 집계
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1

      // 오늘 해결된 티켓 집계 - 생성일이 아니라 실제 해결 시각 기준
      if (ticket.status === 'resolved' && ticket.resolved_at) {
        const resolvedDate = new Date(ticket.resolved_at)
        if (resolvedDate >= todayStart) {
          resolvedToday++
        }
      }
    })

    // 대기 중인 티켓 수 (open 상태)
    const openTickets = byStatus['open'] || 0

    return NextResponse.json({
      success: true,
      total,
      byStatus,
      byPriority,
      byCategory,
      resolvedToday,
      openTickets,
    })
  } catch (error) {
    console.error('[Support Stats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
