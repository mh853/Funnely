import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/audit-logs/stats
 * 감사 로그 통계 조회
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const days = parseInt(searchParams.get('days') || '30') // 기본 30일

    // 날짜 범위 설정
    const endDateTime = endDate
      ? new Date(endDate)
      : new Date()
    const startDateTime = startDate
      ? new Date(startDate)
      : new Date(endDateTime.getTime() - days * 24 * 60 * 60 * 1000)

    // 1. 총 로그 수
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())

    const { count: totalLogs } = await countQuery

    // 2. 전체 로그 데이터 가져오기 (분석용)
    const { data: logs } = await supabase
      .from('audit_logs')
      .select(
        `
        id,
        action,
        user_id,
        created_at,
        user:users!user_id(email, profiles(full_name))
      `
      )
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString())

    // 3. 작업별 분류
    const actionBreakdown = Object.entries(
      (logs || []).reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    )
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20) // 상위 20개

    // 4. 사용자별 활동
    const userBreakdown = Object.entries(
      (logs || []).reduce((acc, log) => {
        if (log.user_id) {
          if (!acc[log.user_id]) {
            // Type assertion for user object from Supabase join
            const user = log.user as any
            acc[log.user_id] = {
              userId: log.user_id,
              userName: user?.profiles?.full_name || user?.email || 'Unknown',
              userEmail: user?.email || null,
              count: 0,
            }
          }
          acc[log.user_id].count++
        }
        return acc
      }, {} as Record<string, any>)
    )
      .map(([_, data]) => data)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // 상위 10명

    // 5. 일별 활동
    const dailyActivity = Object.entries(
      (logs || []).reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    )
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 6. 시간대별 활동 (0-23시)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
    }))

    ;(logs || []).forEach((log) => {
      const hour = new Date(log.created_at).getHours()
      hourlyActivity[hour].count++
    })

    // 7. 작업 카테고리별 분류
    const categoryBreakdown = {
      company: 0,
      user: 0,
      lead: 0,
      subscription: 0,
      payment: 0,
      settings: 0,
      data_export: 0,
      admin_auth: 0,
      other: 0,
    }

    ;(logs || []).forEach((log) => {
      const action = log.action
      if (action.startsWith('company.')) categoryBreakdown.company++
      else if (action.startsWith('user.')) categoryBreakdown.user++
      else if (action.startsWith('lead.')) categoryBreakdown.lead++
      else if (action.startsWith('subscription.')) categoryBreakdown.subscription++
      else if (action.startsWith('payment.')) categoryBreakdown.payment++
      else if (action.startsWith('settings.')) categoryBreakdown.settings++
      else if (action.startsWith('data.export')) categoryBreakdown.data_export++
      else if (action.startsWith('admin.')) categoryBreakdown.admin_auth++
      else categoryBreakdown.other++
    })

    const categoryData = Object.entries(categoryBreakdown)
      .map(([category, count]) => ({ category, count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      stats: {
        totalLogs: totalLogs || 0,
        dateRange: {
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          days,
        },
        actionBreakdown,
        userBreakdown,
        dailyActivity,
        hourlyActivity,
        categoryBreakdown: categoryData,
      },
    })
  } catch (error) {
    console.error('[Audit Logs Stats API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
