import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

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

    // 전체 티켓 조회
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('status, priority, category, created_at')

    if (error) {
      console.error('[Support Stats API] Error fetching tickets:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 통계 계산
    const total = tickets?.length || 0
    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    // 오늘 날짜 (UTC 기준)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    let resolvedToday = 0

    tickets?.forEach((ticket) => {
      // 상태별 집계
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1

      // 우선순위별 집계
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1

      // 카테고리별 집계
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1

      // 오늘 해결된 티켓 집계
      if (ticket.status === 'resolved') {
        const createdDate = new Date(ticket.created_at)
        if (createdDate >= today) {
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
