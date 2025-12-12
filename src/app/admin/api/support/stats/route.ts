import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// 티켓 통계 조회
export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()

    // 전체 티켓 통계
    const { data: allTickets } = await supabase
      .from('support_tickets')
      .select('status, priority, category, created_at')

    if (!allTickets) {
      return NextResponse.json({
        total: 0,
        byStatus: {},
        byPriority: {},
        byCategory: {},
        avgResponseTime: 0,
        resolvedToday: 0,
        openTickets: 0,
      })
    }

    // 상태별 카운트
    const byStatus = allTickets.reduce((acc: any, ticket: any) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {})

    // 우선순위별 카운트
    const byPriority = allTickets.reduce((acc: any, ticket: any) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
      return acc
    }, {})

    // 카테고리별 카운트
    const byCategory = allTickets.reduce((acc: any, ticket: any) => {
      if (ticket.category) {
        acc[ticket.category] = (acc[ticket.category] || 0) + 1
      }
      return acc
    }, {})

    // 오늘 해결된 티켓
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const resolvedToday = allTickets.filter(
      (ticket: any) =>
        ticket.status === 'resolved' &&
        new Date(ticket.created_at) >= today
    ).length

    // 열린 티켓 수
    const openTickets =
      (byStatus.open || 0) + (byStatus.in_progress || 0)

    return NextResponse.json({
      total: allTickets.length,
      byStatus,
      byPriority,
      byCategory,
      resolvedToday,
      openTickets,
    })
  } catch (error) {
    console.error('Support stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
