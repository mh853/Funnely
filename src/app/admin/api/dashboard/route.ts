import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET() {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // 시간별 추이 데이터 (최근 90일)
    const trendsData = await getTrendsData(supabase, ninetyDaysAgo)

    // 요약 통계
    const summary = await getSummaryStats(supabase, thirtyDaysAgo)

    // 회사별 성과 (상위 10개)
    const topCompanies = await getTopCompanies(supabase, thirtyDaysAgo)

    // 최근 활동
    const recentActivities = await getRecentActivities(supabase)

    return NextResponse.json({
      trends: trendsData,
      summary,
      topCompanies,
      recentActivities,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getTrendsData(supabase: any, startDate: Date) {
  // 일별 회사, 사용자, 리드 증가 추이
  const { data: dailyStats } = await supabase.rpc('get_daily_stats', {
    start_date: startDate.toISOString(),
  })

  // RPC 함수가 없다면 직접 쿼리
  if (!dailyStats) {
    // 간단한 월별 집계로 대체
    const monthlyData = []
    for (let i = 0; i < 3; i++) {
      const monthStart = new Date(startDate)
      monthStart.setMonth(monthStart.getMonth() + i)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const [
        { count: companies },
        { count: users },
        { count: leads },
      ] = await Promise.all([
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString()),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString()),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString()),
      ])

      monthlyData.push({
        date: monthStart.toISOString().split('T')[0],
        companies: companies || 0,
        users: users || 0,
        leads: leads || 0,
      })
    }
    return monthlyData
  }

  return dailyStats
}

async function getSummaryStats(supabase: any, thirtyDaysAgo: Date) {
  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: totalUsers },
    { count: activeUsers },
    { count: totalLeads },
    { count: leadsLast30d },
    { count: totalPages },
    { count: publishedPages },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('landing_pages')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('landing_pages')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true),
  ])

  return {
    totalCompanies: totalCompanies || 0,
    activeCompanies: activeCompanies || 0,
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    totalLeads: totalLeads || 0,
    leadsLast30d: leadsLast30d || 0,
    totalPages: totalPages || 0,
    publishedPages: publishedPages || 0,
    companyGrowth:
      totalCompanies > 0
        ? ((activeCompanies / totalCompanies) * 100).toFixed(1)
        : '0',
    userGrowth:
      totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0',
  }
}

async function getTopCompanies(supabase: any, thirtyDaysAgo: Date) {
  const { data: companies } = await supabase
    .from('companies')
    .select(
      `
      id,
      name,
      is_active,
      created_at
    `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!companies) return []

  const companiesWithStats = await Promise.all(
    companies.map(async (company: any) => {
      const [
        { count: totalUsers },
        { count: totalLeads },
        { count: leadsLast30d },
        { count: totalPages },
      ] = await Promise.all([
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('landing_pages')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id),
      ])

      return {
        id: company.id,
        name: company.name,
        totalUsers: totalUsers || 0,
        totalLeads: totalLeads || 0,
        leadsLast30d: leadsLast30d || 0,
        totalPages: totalPages || 0,
        growth:
          totalLeads > 0
            ? (((leadsLast30d || 0) / totalLeads) * 100).toFixed(1)
            : '0',
      }
    })
  )

  return companiesWithStats.sort(
    (a, b) => b.leadsLast30d - a.leadsLast30d
  )
}

async function getRecentActivities(supabase: any) {
  const { data: activities } = await supabase
    .from('company_activity_logs')
    .select(
      `
      id,
      action,
      description,
      created_at,
      companies!inner(name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(10)

  if (!activities) return []

  return activities.map((activity: any) => ({
    id: activity.id,
    activityType: activity.action,
    description: activity.description,
    companyName: activity.companies.name,
    createdAt: activity.created_at,
  }))
}
