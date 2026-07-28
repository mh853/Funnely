import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type {
  GrowthOpportunity,
  OpportunityWithCompany,
  GrowthOpportunitiesResponse,
} from '@/types/growth'

/**
 * GET /api/admin/growth-opportunities
 * Fetch all growth opportunities with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_GROWTH_OPPORTUNITIES)
    }
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all' // upsell | downsell_risk | all
    const status = searchParams.get('status') || 'active'
    const minConfidence = parseInt(searchParams.get('min_confidence') || '50')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 목록 조회(페이지네이션 적용)와 요약 통계 조회(전체 필터 결과 기준, 페이지와 무관)는
    // 서로 다른 범위의 데이터가 필요하므로 별도 쿼리로 분리한다. summary를 목록과 같은
    // 배열에서 계산하면 페이지네이션 도입 시 현재 페이지 20건만으로 집계돼 total_opportunities
    // 등 통계가 실제 값보다 훨씬 작게 표시되는 문제가 생긴다.
    let listQuery = supabase
      .from('growth_opportunities')
      .select(
        `
        *,
        companies:company_id (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .gte('confidence_score', minConfidence)
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1)

    let summaryQuery = supabase
      .from('growth_opportunities')
      .select('opportunity_type, estimated_additional_mrr, potential_lost_mrr, confidence_score')
      .gte('confidence_score', minConfidence)

    if (type !== 'all') {
      listQuery = listQuery.eq('opportunity_type', type)
      summaryQuery = summaryQuery.eq('opportunity_type', type)
    }

    if (status !== 'all') {
      listQuery = listQuery.eq('status', status)
      summaryQuery = summaryQuery.eq('status', status)
    }

    const [{ data: opportunities, error, count }, { data: summaryRows, error: summaryError }] =
      await Promise.all([listQuery, summaryQuery])

    if (error) {
      console.error('Error fetching growth opportunities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
        { status: 500 }
      )
    }

    if (summaryError) {
      console.error('Error fetching growth opportunities summary:', summaryError)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities summary' },
        { status: 500 }
      )
    }

    // Transform data to include company info
    const opportunitiesWithCompany: OpportunityWithCompany[] =
      opportunities?.map((opp: any) => ({
        ...opp,
        company: {
          id: opp.companies.id,
          name: opp.companies.name,
          current_plan: opp.current_plan,
          current_mrr: 0, // TODO: fetch from revenue_metrics
        },
      })) || []

    // Calculate summary (전체 필터 결과 기준)
    const summaryData = summaryRows || []
    const summary = {
      total_opportunities: summaryData.length,
      upsell_count: summaryData.filter(
        (o) => o.opportunity_type === 'upsell'
      ).length,
      downsell_risk_count: summaryData.filter(
        (o) => o.opportunity_type === 'downsell_risk'
      ).length,
      expansion_count: summaryData.filter(
        (o) => o.opportunity_type === 'expansion'
      ).length,
      total_potential_mrr: summaryData.reduce(
        (sum, o) => sum + (o.estimated_additional_mrr || 0),
        0
      ),
      total_at_risk_mrr: summaryData.reduce(
        (sum, o) => sum + (o.potential_lost_mrr || 0),
        0
      ),
      avg_confidence_score:
        summaryData.length > 0
          ? Math.round(
              summaryData.reduce((sum, o) => sum + o.confidence_score, 0) /
                summaryData.length
            )
          : 0,
    }

    const total = count || 0
    const response: GrowthOpportunitiesResponse = {
      opportunities: opportunitiesWithCompany,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Growth opportunities API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
