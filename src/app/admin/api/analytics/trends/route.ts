import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { toKSTDateStr, getKSTDayRange } from '@/lib/utils/date'
import { getLeadStatusCategoryMapForAdmin } from '@/lib/leadStatusCategory'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    // start_date/end_date는 KST 캘린더 날짜 문자열로 다룬다 — 응답의 period에도
    // 그대로 노출되므로 "YYYY-MM-DD" 형태를 유지하되, 실제 쿼리 경계는
    // getKSTDayRange()로 KST 하루 단위 UTC 인스턴트로 변환해서 써야 한다.
    const startDate = searchParams.get('start_date') || toKSTDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    const endDate = searchParams.get('end_date') || toKSTDateStr(new Date())
    const companyId = searchParams.get('company_id')
    const granularity = searchParams.get('granularity') || 'day' // day, week, month

    const supabase = await createClient()

    // 서버(Vercel)는 UTC라서 "YYYY-MM-DD" 문자열을 그대로 TIMESTAMPTZ 컬럼과
    // 비교하면 Postgres가 UTC 자정으로 캐스팅해 KST 기준 하루와 최대 9시간
    // 어긋난다(하한 쪽은 그날 이른 새벽 리드 누락, 상한 쪽은 그날 밤 리드 누락).
    const queryStart = getKSTDayRange(startDate).start
    const queryEnd = getKSTDayRange(endDate).end // 배타적 상한(다음날 KST 시작)

    // 시계열 데이터 조회
    let query = supabase
      .from('leads')
      .select('created_at, status, company_id')
      .gte('created_at', queryStart.toISOString())
      .lt('created_at', queryEnd.toISOString())
      .order('created_at', { ascending: true })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const [{ data: leads, error }, statusCategoryMap] = await Promise.all([
      query,
      getLeadStatusCategoryMapForAdmin(supabase, companyId),
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 날짜별 집계 함수
    // new Date(date).getDate()/.getDay()/.getMonth()는 서버(UTC) 로컬 게터라서
    // KST 기준 날짜/요일/월과 최대 9시간 어긋난다 — KST 캘린더 날짜 문자열을 먼저
    // 구하고 그 y/m/d로 순수 달력 계산만 해야 한다.
    const getDateKey = (date: string) => {
      const kstStr = toKSTDateStr(new Date(date)) // "YYYY-MM-DD" (KST)
      if (granularity === 'day') {
        return kstStr
      }
      const [y, m, day] = kstStr.split('-').map(Number)
      if (granularity === 'week') {
        const asUTC = new Date(Date.UTC(y, m - 1, day))
        const weekStart = new Date(Date.UTC(y, m - 1, day - asUTC.getUTCDay()))
        return weekStart.toISOString().split('T')[0]
      } else if (granularity === 'month') {
        return `${y}-${String(m).padStart(2, '0')}`
      }
      return kstStr
    }

    // 시계열 데이터 집계
    // 리드 상태는 회사별 커스텀 lead_statuses 기반이며, 시스템 기본값
    // (20250220000000_create_lead_statuses.sql)은
    // new/rejected/contacted/converted/contract_completed/needs_followup/other이다.
    // 이전에는 실제로 존재하지 않는 'qualified'/'lost' 코드를 집계해 항상 0으로
    // 표시됐고, 실제 존재하는 상태의 리드는 total에는 잡히지만 어느 세부 버킷에도
    // 들어가지 않았다.
    const timeSeriesData = new Map<string, {
      date: string
      total: number
      new: number
      contacted: number
      converted: number
      rejected: number
      other: number
    }>()

    leads?.forEach((lead) => {
      const dateKey = getDateKey(lead.created_at)

      if (!timeSeriesData.has(dateKey)) {
        timeSeriesData.set(dateKey, {
          date: dateKey,
          total: 0,
          new: 0,
          contacted: 0,
          converted: 0,
          rejected: 0,
          other: 0,
        })
      }

      const data = timeSeriesData.get(dateKey)!
      data.total++

      const category = statusCategoryMap.get(`${lead.company_id}:${lead.status}`)
      if (category === 'new' || category === 'contacted' || category === 'converted' || category === 'rejected') {
        data[category]++
      } else {
        data.other++
      }
    })

    // 정렬된 배열로 변환
    const trends = Array.from(timeSeriesData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 전환율 추이 계산
    const conversionTrends = trends.map((data) => ({
      date: data.date,
      conversionRate: data.total > 0
        ? parseFloat(((data.converted / data.total) * 100).toFixed(2))
        : 0,
    }))

    // 성장률 계산 (전일 대비)
    const growthRates = trends.map((data, index) => {
      if (index === 0) {
        return {
          date: data.date,
          growthRate: 0,
        }
      }
      const prevData = trends[index - 1]
      const growthRate = prevData.total > 0
        ? parseFloat((((data.total - prevData.total) / prevData.total) * 100).toFixed(2))
        : 0
      return {
        date: data.date,
        growthRate,
      }
    })

    // 요약 통계
    const totalLeads = trends.reduce((sum, data) => sum + data.total, 0)
    const totalConverted = trends.reduce((sum, data) => sum + data.converted, 0)
    const avgLeadsPerPeriod = trends.length > 0
      ? parseFloat((totalLeads / trends.length).toFixed(2))
      : 0

    return NextResponse.json({
      trends,
      conversionTrends,
      growthRates,
      summary: {
        totalLeads,
        totalConverted,
        avgLeadsPerPeriod,
        overallConversionRate: totalLeads > 0
          ? parseFloat(((totalConverted / totalLeads) * 100).toFixed(2))
          : 0,
        dataPoints: trends.length,
      },
      period: {
        start: startDate,
        end: endDate,
        granularity,
      },
    })
  } catch (error) {
    console.error('Trends analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
