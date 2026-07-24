import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET() {
  try {
    await requireSuperAdmin()

    // requireSuperAdmin()은 애플리케이션 레벨 체크일 뿐 세션 클라이언트의 RLS를
    // 우회하지 않는다. users RLS가 같은 회사로 스코핑되어 있어 세션 클라이언트로는
    // 관리자 자신의 회사 데이터만 집계되고 있었다.
    const supabase = createAdminClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // 4개 모두 서로 무관하므로 병렬로 실행
    const [trendsData, summary, topCompanies, recentActivities] = await Promise.all([
      getTrendsData(supabase, ninetyDaysAgo), // 시간별 추이 데이터 (최근 90일)
      getSummaryStats(supabase, thirtyDaysAgo), // 요약 통계
      getTopCompanies(supabase, thirtyDaysAgo), // 회사별 성과 (상위 10개)
      getRecentActivities(supabase), // 최근 활동
    ])

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

  // 회사마다 쿼리 4개씩(N+1) 대신, admin/companies/route.ts와 동일한 패턴으로
  // company_id IN 배치 조회 4개 + JS 집계로 대체한다
  const companyIds = companies.map((c: any) => c.id)

  const [{ data: allUsers }, { data: allLeads }, { data: recentLeads }, { data: allPages }] =
    await Promise.all([
      supabase.from('users').select('company_id').in('company_id', companyIds),
      supabase.from('leads').select('company_id').in('company_id', companyIds),
      supabase
        .from('leads')
        .select('company_id')
        .in('company_id', companyIds)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('landing_pages').select('company_id').in('company_id', companyIds),
    ])

  const countByCompany = (rows: { company_id: string }[] | null) => {
    const map: Record<string, number> = {}
    for (const row of rows || []) {
      map[row.company_id] = (map[row.company_id] || 0) + 1
    }
    return map
  }

  const usersCountMap = countByCompany(allUsers)
  const leadsCountMap = countByCompany(allLeads)
  const recentLeadsCountMap = countByCompany(recentLeads)
  const pagesCountMap = countByCompany(allPages)

  const companiesWithStats: Array<{
    id: string
    name: string
    totalUsers: number
    totalLeads: number
    leadsLast30d: number
    totalPages: number
    growth: string
  }> = companies.map((company: any) => {
    const totalUsers = usersCountMap[company.id] || 0
    const totalLeads = leadsCountMap[company.id] || 0
    const leadsLast30d = recentLeadsCountMap[company.id] || 0
    const totalPages = pagesCountMap[company.id] || 0

    return {
      id: company.id,
      name: company.name,
      totalUsers,
      totalLeads,
      leadsLast30d,
      totalPages,
      growth: totalLeads > 0 ? ((leadsLast30d / totalLeads) * 100).toFixed(1) : '0',
    }
  })

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
