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

    // 5. 기간 시작 시점 총 회사 수 계산
    const { count: totalAtStart } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', startDate.toISOString())

    // 6. 해당 기간 이탈 기록 조회
    const { data: churnRecords, error: churnError } = await supabase
      .from('churn_records')
      .select('*')
      .gte('churn_date', startDate.toISOString())
      .lte('churn_date', now.toISOString())
      .order('churn_date', { ascending: false })

    if (churnError) throw churnError

    // 7. 메트릭 계산
    const churnedCount = churnRecords?.length || 0
    const churnRate = calculateChurnRate(churnedCount, totalAtStart || 0)
    const { lost_mrr, lost_arr } = calculateLostRevenue(churnRecords || [])
    const averageTenure = calculateAverageTenure(churnRecords || [])
    const medianTenure = calculateMedianTenure(churnRecords || [])
    const reasons = analyzeChurnReasons(churnRecords || [])
    const preventableAnalysis = analyzePreventableChurn(churnRecords || [])

    // 8. 12개월 트렌드 계산
    const trends = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const { data: monthRecords } = await supabase
        .from('churn_records')
        .select('*')
        .gte('churn_date', monthStart.toISOString())
        .lte('churn_date', monthEnd.toISOString())

      const monthChurnedCount = monthRecords?.length || 0
      const monthLostMrr = (monthRecords || []).reduce(
        (sum, r) => sum + (r.metadata?.last_mrr || 0),
        0
      )

      // 해당 월 시작 시점 총 회사 수
      const { count: monthTotalAtStart } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', monthStart.toISOString())

      trends.push({
        period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        churn_rate: calculateChurnRate(
          monthChurnedCount,
          monthTotalAtStart || 0
        ),
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
