import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import {
  calculateChurnRate,
  calculateAverageTenure,
  calculateMedianTenure,
  analyzeChurnReasons,
  analyzePreventableChurn,
  calculateLostRevenue,
} from '@/lib/churn/calculations'
import type { ChurnAnalysisResponse } from '@/types/churn'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') ||
      'monthly') as 'monthly' | 'quarterly' | 'yearly'

    // 4. 기간 설정
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
    }

    // 5+6+8 준비: 12개월 트렌드 루프가 매달 2개씩(총 24회) 순차 조회하던 것을,
    // 전체 회사 생성일 + 12개월 윈도우 이탈 기록을 한 번씩만 가져와 루프 안에서는
    // JS로 필터링하도록 바꿨다. 원래 루프의 월 경계(monthStart/monthEnd) 계산과
    // 집계 로직 자체는 그대로 두고 "어떻게 가져오는지"만 바꿔, 출력값은 기존과
    // 동일하다. period=yearly는 트렌드 윈도우(최근 12개월)보다 1개월 더 앞선
    // 시점까지 봐야 하므로 6번(churnRecords)은 별도 쿼리로 유지한다.
    const trendWindowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const trendWindowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [
      { data: allCompanies, error: allCompaniesError },
      { data: allTrendChurnRecords, error: trendChurnError },
      { data: churnRecords, error: churnError },
    ] = await Promise.all([
      supabase.from('companies').select('created_at'),
      supabase
        .from('churn_records')
        .select('*')
        .gte('churn_date', trendWindowStart.toISOString())
        .lte('churn_date', trendWindowEnd.toISOString()),
      supabase
        .from('churn_records')
        .select('*')
        .gte('churn_date', startDate.toISOString())
        .lte('churn_date', now.toISOString())
        .order('churn_date', { ascending: false }),
    ])

    if (allCompaniesError) throw allCompaniesError
    if (trendChurnError) throw trendChurnError
    if (churnError) throw churnError

    // Postgres의 .toISOString() 문자열 비교가 아니라 getTime() 숫자 비교로 맞춰야
    // "+00:00"과 "Z" 표기 차이 등으로 결과가 갈리지 않는다
    const companyCreatedMs = (allCompanies || [])
      .map((c) => (c.created_at ? new Date(c.created_at).getTime() : null))
      .filter((t): t is number => t !== null)

    // 5. 기간 시작 시점 총 회사 수 계산
    const totalAtStart = companyCreatedMs.filter((t) => t <= startDate.getTime()).length

    // 7. 메트릭 계산
    const churnedCount = churnRecords?.length || 0
    const churnRate = calculateChurnRate(churnedCount, totalAtStart)
    const { lost_mrr, lost_arr } = calculateLostRevenue(churnRecords || [])
    const averageTenure = calculateAverageTenure(churnRecords || [])
    const medianTenure = calculateMedianTenure(churnRecords || [])
    const reasons = analyzeChurnReasons(churnRecords || [])
    const preventableAnalysis = analyzePreventableChurn(churnRecords || [])

    // 8. 12개월 트렌드 계산 (더 이상 루프 안에서 쿼리하지 않음)
    const trends = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const startMs = monthStart.getTime()
      const endMs = monthEnd.getTime()

      const monthRecords = (allTrendChurnRecords || []).filter((r) => {
        const t = new Date(r.churn_date).getTime()
        return t >= startMs && t <= endMs
      })

      const monthChurnedCount = monthRecords.length
      const monthLostMrr = monthRecords.reduce(
        (sum, r) => sum + (r.metadata?.last_mrr || 0),
        0
      )

      // 해당 월 시작 시점 총 회사 수
      const monthTotalAtStart = companyCreatedMs.filter((t) => t <= startMs).length

      trends.push({
        period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        churn_rate: calculateChurnRate(monthChurnedCount, monthTotalAtStart),
        churned_count: monthChurnedCount,
        lost_mrr: monthLostMrr,
      })
    }

    // 9. 고위험 회사 식별 (customer_health_scores 활용)
    const { data: atRiskCompanies } = await supabase
      .from('customer_health_scores')
      .select(
        `
        company_id,
        score,
        risk_level,
        metrics,
        companies:company_id (
          name,
          created_at
        )
      `
      )
      .in('risk_level', ['high', 'critical'])
      .order('score', { ascending: true })
      .limit(10)

    const atRisk = (atRiskCompanies || []).map((item: any) => {
      const tenureDays = Math.floor(
        (now.getTime() - new Date(item.companies.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      return {
        company_id: item.company_id,
        company_name: item.companies.name,
        risk_score: item.score,
        risk_factors: [], // TODO: Extract from metrics
        current_mrr: 0, // TODO: Calculate from subscription
        tenure_days: tenureDays,
        last_login: item.metrics?.lastLoginAt || null,
      }
    })

    // 10. 응답 구성
    const response: ChurnAnalysisResponse = {
      current: {
        period,
        churn_rate: churnRate,
        churned_count: churnedCount,
        total_companies_at_start: totalAtStart || 0,
        lost_mrr,
        lost_arr,
        average_tenure_days: averageTenure,
        median_tenure_days: medianTenure,
        reasons,
        preventable_analysis: preventableAnalysis,
      },
      trends: {
        last_12_months: trends,
      },
      at_risk_companies: atRisk,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching churn analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch churn analysis' },
      { status: 500 }
    )
  }
}
