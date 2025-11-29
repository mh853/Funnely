import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get all landing pages with metrics
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Get all leads with UTM data
  const { data: leads } = await supabase
    .from('leads')
    .select(
      `
      *,
      landing_pages (
        id,
        title,
        slug
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Calculate overall statistics
  const totalLeads = leads?.length || 0
  const totalViews = landingPages?.reduce((sum, page) => sum + (page.views || 0), 0) || 0
  const totalSubmissions =
    landingPages?.reduce((sum, page) => sum + (page.submissions || 0), 0) || 0
  const overallConversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0

  // Group leads by status
  const leadsByStatus = {
    new: leads?.filter((l) => l.status === 'new').length || 0,
    assigned: leads?.filter((l) => l.status === 'assigned').length || 0,
    contacting: leads?.filter((l) => l.status === 'contacting').length || 0,
    consulting: leads?.filter((l) => l.status === 'consulting').length || 0,
    completed: leads?.filter((l) => l.status === 'completed').length || 0,
    on_hold: leads?.filter((l) => l.status === 'on_hold').length || 0,
    cancelled: leads?.filter((l) => l.status === 'cancelled').length || 0,
  }

  // Group leads by source (UTM)
  const leadsBySource: Record<string, number> = {}
  leads?.forEach((lead) => {
    const source = lead.utm_source || 'Direct'
    leadsBySource[source] = (leadsBySource[source] || 0) + 1
  })

  // Group leads by campaign
  const leadsByCampaign: Record<string, number> = {}
  leads?.forEach((lead) => {
    if (lead.utm_campaign) {
      leadsByCampaign[lead.utm_campaign] = (leadsByCampaign[lead.utm_campaign] || 0) + 1
    }
  })

  // Landing page performance
  const landingPagePerformance =
    landingPages?.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      views: page.views || 0,
      submissions: page.submissions || 0,
      conversionRate:
        page.views && page.views > 0 ? ((page.submissions || 0) / page.views) * 100 : 0,
      status: page.status,
    })) || []

  // Recent leads timeline (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLeads = leads?.filter(
    (lead) => new Date(lead.created_at) >= thirtyDaysAgo
  ) || []

  // Group by day for chart
  const leadsByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    leadsByDay[dateStr] = 0
  }

  recentLeads.forEach((lead) => {
    const dateStr = lead.created_at.split('T')[0]
    if (leadsByDay[dateStr] !== undefined) {
      leadsByDay[dateStr]++
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">분석 대시보드</h1>
        <p className="mt-1 text-sm text-gray-600">
          랜딩 페이지 성과와 리드 현황을 분석합니다.
        </p>
      </div>

      {/* Dashboard */}
      <AnalyticsDashboard
        overallStats={{
          totalLeads,
          totalViews,
          totalSubmissions,
          overallConversionRate,
        }}
        leadsByStatus={leadsByStatus}
        leadsBySource={leadsBySource}
        leadsByCampaign={leadsByCampaign}
        landingPagePerformance={landingPagePerformance}
        leadsByDay={leadsByDay}
      />
    </div>
  )
}
