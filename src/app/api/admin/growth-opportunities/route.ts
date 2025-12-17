import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
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

    // TODO: Add proper RBAC permission check for VIEW_GROWTH_OPPORTUNITIES

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all' // upsell | downsell_risk | all
    const status = searchParams.get('status') || 'active'
    const minConfidence = parseInt(searchParams.get('min_confidence') || '50')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Build query
    let query = supabase
      .from('growth_opportunities')
      .select(
        `
        *,
        companies:company_id (
          id,
          name
        )
      `
      )
      .gte('confidence_score', minConfidence)
      .order('detected_at', { ascending: false })

    if (type !== 'all') {
      query = query.eq('opportunity_type', type)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: opportunities, error } = await query

    if (error) {
      console.error('Error fetching growth opportunities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunities' },
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

    // Calculate summary
    const summary = {
      total_opportunities: opportunitiesWithCompany.length,
      upsell_count: opportunitiesWithCompany.filter(
        (o) => o.opportunity_type === 'upsell'
      ).length,
      downsell_risk_count: opportunitiesWithCompany.filter(
        (o) => o.opportunity_type === 'downsell_risk'
      ).length,
      expansion_count: opportunitiesWithCompany.filter(
        (o) => o.opportunity_type === 'expansion'
      ).length,
      total_potential_mrr: opportunitiesWithCompany.reduce(
        (sum, o) => sum + (o.estimated_additional_mrr || 0),
        0
      ),
      total_at_risk_mrr: opportunitiesWithCompany.reduce(
        (sum, o) => sum + (o.potential_lost_mrr || 0),
        0
      ),
      avg_confidence_score:
        opportunitiesWithCompany.length > 0
          ? Math.round(
              opportunitiesWithCompany.reduce(
                (sum, o) => sum + o.confidence_score,
                0
              ) / opportunitiesWithCompany.length
            )
          : 0,
    }

    const response: GrowthOpportunitiesResponse = {
      opportunities: opportunitiesWithCompany,
      summary,
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
