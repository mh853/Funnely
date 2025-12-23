import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'

export const revalidate = 30

interface AnalyticsPageProps {
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const supabase = await createClient()
  const params = await searchParams

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

  // 기능 접근 권한 체크
  const hasAccess = await hasFeatureAccess(userProfile.company_id, 'analytics')
  if (!hasAccess) {
    return <UpgradeNotice featureName="트래픽 분석" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
  }

  const now = new Date()
  const selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

  // 선택된 월의 시작일과 종료일
  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0)
  const daysInMonth = selectedMonthEnd.getDate()

  const queryStart = selectedMonthStart.toISOString()
  const queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()

  // 날짜별 페이지뷰 데이터 조회 (landing_page_analytics)
  const { data: pageViewsData } = await supabase
    .from('landing_page_analytics')
    .select('date, page_views, desktop_views, mobile_views, tablet_views, landing_page_id, landing_pages!inner(company_id)')
    .eq('landing_pages.company_id', userProfile.company_id)
    .gte('date', queryStart.split('T')[0])
    .lt('date', queryEnd.split('T')[0])

  // 페이지뷰를 날짜별로 집계
  const pageViewsByDate: { [key: string]: { total: number; pc: number; mobile: number; tablet: number } } = {}
  pageViewsData?.forEach(pv => {
    const dateStr = pv.date
    if (!pageViewsByDate[dateStr]) {
      pageViewsByDate[dateStr] = { total: 0, pc: 0, mobile: 0, tablet: 0 }
    }
    pageViewsByDate[dateStr].total += pv.page_views || 0
    pageViewsByDate[dateStr].pc += pv.desktop_views || 0
    pageViewsByDate[dateStr].mobile += pv.mobile_views || 0
    pageViewsByDate[dateStr].tablet += pv.tablet_views || 0
  })

  // Get leads (conversions) by date and device with UTM data
  const { data: leads } = await supabase
    .from('leads')
    .select('id, created_at, device_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page_id')
    .eq('company_id', userProfile.company_id)
    .gte('created_at', queryStart)
    .lt('created_at', queryEnd)

  // Aggregate traffic data by date
  const trafficByDate: Record<string, { total: number; pc: number; mobile: number; tablet: number }> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(selectedYear, selectedMonth - 1, day)
    const dateStr = date.toISOString().split('T')[0]
    trafficByDate[dateStr] = pageViewsByDate[dateStr] || { total: 0, pc: 0, mobile: 0, tablet: 0 }
  }

  // Aggregate conversion data by date
  const conversionByDate: Record<string, { total: number; pc: number; mobile: number; tablet: number }> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(selectedYear, selectedMonth - 1, day)
    const dateStr = date.toISOString().split('T')[0]
    conversionByDate[dateStr] = { total: 0, pc: 0, mobile: 0, tablet: 0 }
  }

  leads?.forEach((lead) => {
    const dateStr = lead.created_at.split('T')[0]
    if (conversionByDate[dateStr]) {
      conversionByDate[dateStr].total++
      const deviceType = (lead.device_type || 'unknown').toLowerCase()
      // pc, mobile, tablet로 분류 (manual, unknown은 pc로 분류)
      if (deviceType === 'pc' || deviceType === 'manual' || deviceType === 'unknown') {
        conversionByDate[dateStr].pc++
      } else if (deviceType === 'mobile') {
        conversionByDate[dateStr].mobile++
      } else if (deviceType === 'tablet') {
        conversionByDate[dateStr].tablet++
      }
    }
  })

  // Aggregate UTM data
  const utmData = {
    source: {} as Record<string, number>,
    medium: {} as Record<string, number>,
    campaign: {} as Record<string, number>,
    content: {} as Record<string, number>,
    term: {} as Record<string, number>,
  }

  leads?.forEach((lead) => {
    // UTM Source
    const source = lead.utm_source || 'Direct'
    utmData.source[source] = (utmData.source[source] || 0) + 1

    // UTM Medium
    const medium = lead.utm_medium || 'Direct'
    utmData.medium[medium] = (utmData.medium[medium] || 0) + 1

    // UTM Campaign
    const campaign = lead.utm_campaign || 'Direct'
    utmData.campaign[campaign] = (utmData.campaign[campaign] || 0) + 1

    // UTM Content
    const content = lead.utm_content || 'Direct'
    utmData.content[content] = (utmData.content[content] || 0) + 1

    // UTM Term
    const term = lead.utm_term || 'Direct'
    utmData.term[term] = (utmData.term[term] || 0) + 1
  })

  // Aggregate landing page performance data
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('id, title, slug, created_at, views_count')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Get monthly device breakdown for landing pages from landing_page_analytics
  const { data: monthlyAnalytics } = await supabase
    .from('landing_page_analytics')
    .select('landing_page_id, desktop_views, mobile_views, tablet_views, landing_pages!inner(company_id)')
    .eq('landing_pages.company_id', userProfile.company_id)
    .gte('date', queryStart.split('T')[0])
    .lt('date', queryEnd.split('T')[0])

  // Aggregate monthly device breakdown by landing page
  const deviceBreakdownByLandingPage: Record<string, { pc: number; mobile: number; tablet: number }> = {}
  monthlyAnalytics?.forEach(analytics => {
    const lpId = analytics.landing_page_id
    if (!deviceBreakdownByLandingPage[lpId]) {
      deviceBreakdownByLandingPage[lpId] = { pc: 0, mobile: 0, tablet: 0 }
    }
    deviceBreakdownByLandingPage[lpId].pc += analytics.desktop_views || 0
    deviceBreakdownByLandingPage[lpId].mobile += analytics.mobile_views || 0
    deviceBreakdownByLandingPage[lpId].tablet += analytics.tablet_views || 0
  })

  // Aggregate conversions by landing page
  const conversionByLandingPage: Record<string, { total: number; pc: number; mobile: number; tablet: number }> = {}
  leads?.forEach((lead) => {
    if (lead.landing_page_id) {
      const lpId = lead.landing_page_id
      if (!conversionByLandingPage[lpId]) {
        conversionByLandingPage[lpId] = { total: 0, pc: 0, mobile: 0, tablet: 0 }
      }
      conversionByLandingPage[lpId].total++
      const deviceType = (lead.device_type || 'unknown').toLowerCase()
      // pc, mobile, tablet로 분류 (manual, unknown은 pc로 분류)
      if (deviceType === 'pc' || deviceType === 'manual' || deviceType === 'unknown') {
        conversionByLandingPage[lpId].pc++
      } else if (deviceType === 'mobile') {
        conversionByLandingPage[lpId].mobile++
      } else if (deviceType === 'tablet') {
        conversionByLandingPage[lpId].tablet++
      }
    }
  })

  // Build landing page performance rows
  const landingPageRows = landingPages?.map(lp => {
    const deviceBreakdown = deviceBreakdownByLandingPage[lp.id] || { pc: 0, mobile: 0, tablet: 0 }
    // Use aggregated device breakdown for total to ensure sum matches
    const trafficTotal = deviceBreakdown.pc + deviceBreakdown.mobile + deviceBreakdown.tablet
    const traffic = {
      total: trafficTotal,
      pc: deviceBreakdown.pc,
      mobile: deviceBreakdown.mobile,
      tablet: deviceBreakdown.tablet
    }
    const conversion = conversionByLandingPage[lp.id] || { total: 0, pc: 0, mobile: 0, tablet: 0 }
    return {
      id: lp.id,
      title: lp.title,
      slug: lp.slug,
      createdAt: lp.created_at,
      traffic,
      conversion
    }
  }) || []

  // Convert to sorted arrays
  const trafficRows = Object.entries(trafficByDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))

  const conversionRows = Object.entries(conversionByDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <AnalyticsClient
      trafficRows={trafficRows}
      conversionRows={conversionRows}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      daysInMonth={daysInMonth}
      utmData={utmData}
      landingPageRows={landingPageRows}
    />
  )
}
