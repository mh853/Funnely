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
import { getKSTNow, getKSTMonthStart } from '@/lib/utils/date'

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
    // 서버(Vercel)는 UTC라서 new Date(year, month, 1)을 그대로 쓰면 KST 기준 매월 1일
    // 00:00~09:00 사이의 경계가 하루 밀린다. KST 캘린더 기준 연/월을 먼저 구하고
    // getKSTMonthStart()로 실제 UTC 인스턴트를 계산해야 한다.
    const now = new Date()
    const kstNow = getKSTNow()
    const kstYear = kstNow.getUTCFullYear()
    const kstMonth = kstNow.getUTCMonth() + 1 // 1~12
    let startDate: Date

    switch (period) {
      case 'monthly':
        startDate = getKSTMonthStart(kstYear, kstMonth - 1)
        break
      case 'quarterly':
        startDate = getKSTMonthStart(kstYear, kstMonth - 3)
        break
      case 'yearly':
        startDate = getKSTMonthStart(kstYear - 1, kstMonth)
        break
    }

    // 5+6+8 준비: 12개월 트렌드 루프가 매달 2개씩(총 24회) 순차 조회하던 것을,
    // 전체 회사 생성일 + 12개월 윈도우 이탈 기록을 한 번씩만 가져와 루프 안에서는
    // JS로 필터링하도록 바꿨다. period=yearly는 트렌드 윈도우(최근 12개월)보다 1개월
    // 더 앞선 시점까지 봐야 하므로 6번(churnRecords)은 별도 쿼리로 유지한다.
    // 상한은 "다음 달 KST 시작"을 배타적(exclusive)으로 써야 한다 — 예전처럼
    // "다음달의 0일"(=이번달 마지막날 00:00)을 포함 상한으로 쓰면 마지막 날 00:00
    // 이후 발생한 이탈이 그 달에도, 다음 달에도 속하지 못하고 통째로 누락된다.
    const trendWindowStart = getKSTMonthStart(kstYear, kstMonth - 11)
    const trendWindowEndExclusive = getKSTMonthStart(kstYear, kstMonth + 1)

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
        .lt('churn_date', trendWindowEndExclusive.toISOString()),
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
    // monthEnd를 배타적 상한(다음 달 KST 시작)으로 써야 마지막 날 이탈이 누락되지 않는다.
    const trends = []
    for (let i = 11; i >= 0; i--) {
      const targetMonthIndex = kstMonth - i // 1~12 범위를 벗어나도 아래 두 함수가 정규화한다
      const monthStart = getKSTMonthStart(kstYear, targetMonthIndex)
      const monthEndExclusive = getKSTMonthStart(kstYear, targetMonthIndex + 1)
      const startMs = monthStart.getTime()
      const endMs = monthEndExclusive.getTime()

      const monthRecords = (allTrendChurnRecords || []).filter((r) => {
        const t = new Date(r.churn_date).getTime()
        return t >= startMs && t < endMs
      })

      const monthChurnedCount = monthRecords.length
      const monthLostMrr = monthRecords.reduce(
        (sum, r) => sum + (r.metadata?.last_mrr || 0),
        0
      )

      // 해당 월 시작 시점 총 회사 수
      const monthTotalAtStart = companyCreatedMs.filter((t) => t <= startMs).length

      // 라벨용 연/월 표기 — 실제 타임스탬프가 아니라 순수 달력 계산이므로 UTC 게터로
      // targetMonthIndex(1~12 범위를 벗어날 수 있음)를 정규화해서 읽는다.
      const labelDate = new Date(Date.UTC(kstYear, targetMonthIndex - 1, 1))

      trends.push({
        period: `${labelDate.getUTCFullYear()}-${String(labelDate.getUTCMonth() + 1).padStart(2, '0')}`,
        churn_rate: calculateChurnRate(monthChurnedCount, monthTotalAtStart),
        churned_count: monthChurnedCount,
        lost_mrr: monthLostMrr,
      })
    }

    // 9. 고위험 회사 식별 (customer_health_scores 활용)
    // customer_health_scores는 회사당 하루 한 건씩 쌓이는 이력 테이블이라, risk_level로만
    // 필터링해 score순 10건을 뽑으면 같은 회사의 과거 스냅샷 여러 개가 중복으로 뽑혀
    // "고위험 회사 10곳"이 실제로는 회사 1~2곳의 반복으로 채워지는 문제가 있었다.
    // 회사별 최신 스냅샷만 남기고 나서 필터링·정렬해야 한다.
    const { data: healthScoreHistory } = await supabase
      .from('customer_health_scores')
      .select(
        `
        company_id,
        score,
        risk_level,
        metrics,
        created_at,
        companies:company_id (
          name,
          created_at
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(500)

    const latestByCompany = new Map<string, any>()
    for (const item of healthScoreHistory || []) {
      if (!latestByCompany.has(item.company_id)) {
        latestByCompany.set(item.company_id, item)
      }
    }

    const atRiskCompanies = Array.from(latestByCompany.values())
      .filter((item) => ['high', 'critical'].includes(item.risk_level))
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)

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
