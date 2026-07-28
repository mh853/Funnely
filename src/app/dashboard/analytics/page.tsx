import { createClient, getCachedUser, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'
import { toKSTDateStr, getKSTNow, getKSTMonthStart } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'

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
  } = await getCachedUser()

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
  const hasAccess = await hasFeatureAccess(userProfile.company_id, 'traffic_analytics')
  if (!hasAccess) {
    return <UpgradeNotice featureName="트래픽 분석" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
  }

  const nowKST = getKSTNow()
  const selectedYear = params.year ? parseInt(params.year) : nowKST.getUTCFullYear()
  const selectedMonth = params.month ? parseInt(params.month) : nowKST.getUTCMonth() + 1

  // 선택된 월의 시작일과 종료일
  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0)
  const daysInMonth = selectedMonthEnd.getDate()

  // Date 문자열 생성 (타임존 문제 방지)
  const queryStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
  const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
  const queryEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  // leads.created_at은 TIMESTAMPTZ라 KST 기준 월 경계를 써야 한다. 서버(UTC)의
  // 로컬 월 경계를 그대로 쓰면 매월 1일 KST 00:00~09:00에 생성된 리드가 이번달/
  // 지난달 어느 쪽 집계에도 잡히지 않고 누락된다.
  const queryStart = getKSTMonthStart(selectedYear, selectedMonth).toISOString()
  const queryEnd = getKSTMonthStart(selectedYear, selectedMonth + 1).toISOString()

  // range()/limit() 없이 조회하면 supabase/config.toml의 max_rows(1000)가
  // 암묵적으로 적용돼 결과가 잘린다(api/leads/export/route.ts에서 이미 같은
  // 문제를 겪고 고친 바로 그 이슈) - 트래픽이 많은 회사의 월간 페이지뷰/리드가
  // 1000행을 넘으면 이 페이지의 모든 합계·UTM 분석이 조용히 축소된 값이 된다.
  // 1000행씩 배치로 반복 조회해 전체를 가져온다.
  async function fetchAllRows<T>(
    queryBuilder: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }
  ): Promise<T[]> {
    const BATCH_SIZE = 1000
    const allRows: T[] = []
    let offset = 0
    while (true) {
      const { data, error } = await queryBuilder.range(offset, offset + BATCH_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allRows.push(...data)
      if (data.length < BATCH_SIZE) break
      offset += BATCH_SIZE
    }
    return allRows
  }

  // 날짜별 페이지뷰 데이터 조회 (landing_page_analytics)
  const pageViewsData = await fetchAllRows(
    supabase
      .from('landing_page_analytics')
      .select('date, page_views, desktop_views, mobile_views, tablet_views, landing_page_id, landing_pages!inner(company_id)')
      .eq('landing_pages.company_id', userProfile.company_id)
      .gte('date', queryStartDate)
      .lt('date', queryEndDate)
  )

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
  const leads = await fetchAllRows(
    supabase
      .from('leads')
      .select('id, created_at, device_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page_id')
      .eq('company_id', userProfile.company_id)
      .gte('created_at', queryStart)
      .lt('created_at', queryEnd)
  )

  // Aggregate traffic data by date
  const trafficByDate: Record<string, { total: number; pc: number; mobile: number; tablet: number }> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    trafficByDate[dateStr] = pageViewsByDate[dateStr] || { total: 0, pc: 0, mobile: 0, tablet: 0 }
  }

  // Aggregate conversion data by date
  const conversionByDate: Record<string, { total: number; pc: number; mobile: number; tablet: number }> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    conversionByDate[dateStr] = { total: 0, pc: 0, mobile: 0, tablet: 0 }
  }

  leads?.forEach((lead) => {
    const dateStr = toKSTDateStr(new Date(lead.created_at))
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

  // Aggregate landing page performance data — no date filter here so pages created in prior
  // months are included if they had traffic in the selected month
  const landingPages = await fetchAllRows(
    supabase
      .from('landing_pages')
      .select('id, title, slug, created_at, views_count')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
  )

  // Aggregate monthly device breakdown by landing page
  // (pageViewsData는 위에서 이미 동일 조건(company_id, queryStartDate~queryEndDate)으로
  // landing_page_id/desktop_views/mobile_views/tablet_views를 포함해 조회했으므로 재사용한다)
  const deviceBreakdownByLandingPage: Record<string, { pc: number; mobile: number; tablet: number }> = {}
  pageViewsData?.forEach(analytics => {
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

  // Build landing page performance rows — only include pages that had traffic or conversions this month
  const landingPageRows = landingPages?.filter(lp =>
    deviceBreakdownByLandingPage[lp.id] || conversionByLandingPage[lp.id]
  ).map(lp => {
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
