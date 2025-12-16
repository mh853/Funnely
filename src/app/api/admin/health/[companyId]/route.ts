import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

/**
 * GET /api/admin/health/[companyId]
 * 특정 회사의 건강도 점수 상세 조회 (최신 또는 특정 날짜)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_HEALTH_SCORES)

    // 3. 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // Optional: specific date (YYYY-MM-DD)

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 회사 존재 확인
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, slug, status')
      .eq('id', params.companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 건강도 점수 조회
    let scoreQuery = supabase
      .from('health_scores')
      .select('*')
      .eq('company_id', params.companyId)

    if (date) {
      // 특정 날짜의 점수
      const targetDate = new Date(date)
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)

      scoreQuery = scoreQuery
        .gte('calculated_at', targetDate.toISOString())
        .lt('calculated_at', nextDate.toISOString())
        .order('calculated_at', { ascending: false })
        .limit(1)
    } else {
      // 최신 점수
      scoreQuery = scoreQuery
        .order('calculated_at', { ascending: false })
        .limit(1)
    }

    const { data: healthScore } = await scoreQuery.single()

    // 점수가 없으면 404 반환
    if (!healthScore) {
      return NextResponse.json(
        {
          error: date
            ? `No health score found for date ${date}`
            : 'No health score calculated yet',
        },
        { status: 404 }
      )
    }

    // 히스토리 조회 (최근 30일)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: history } = await supabase
      .from('health_scores')
      .select('calculated_at, overall_score, health_status')
      .eq('company_id', params.companyId)
      .gte('calculated_at', thirtyDaysAgo.toISOString())
      .order('calculated_at', { ascending: true })
      .limit(30)

    // 5. 응답 구성
    const response = {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
      },
      current_score: {
        id: healthScore.id,
        overall_score: healthScore.overall_score,
        engagement_score: healthScore.engagement_score,
        product_usage_score: healthScore.product_usage_score,
        support_score: healthScore.support_score,
        payment_score: healthScore.payment_score,
        health_status: healthScore.health_status,
        risk_factors: healthScore.risk_factors || [],
        recommendations: healthScore.recommendations || [],
        calculated_at: healthScore.calculated_at,
      },
      history: (history || []).map((h) => ({
        calculated_at: h.calculated_at,
        overall_score: h.overall_score,
        health_status: h.health_status,
      })),
    }

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Health API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
