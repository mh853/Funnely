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
    // companies 테이블에는 slug/status 컬럼이 없다 (is_active boolean으로 관리됨).
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, is_active')
      .eq('id', params.companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 건강도 점수 조회
    // 실제 테이블명은 'health_scores'가 아니라 'customer_health_scores'이다.
    let scoreQuery = supabase
      .from('customer_health_scores')
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
      .from('customer_health_scores')
      .select('calculated_at, score, risk_level, metrics')
      .eq('company_id', params.companyId)
      .gte('calculated_at', thirtyDaysAgo.toISOString())
      .order('calculated_at', { ascending: true })
      .limit(30)

    // 5. 응답 구성
    // metrics(JSONB)에 engagement_score 등 세부 점수와 risk_factors/recommendations가 담겨 있다.
    const metrics = (healthScore.metrics || {}) as Record<string, any>
    const response = {
      company: {
        id: company.id,
        name: company.name,
        is_active: company.is_active,
      },
      current_score: {
        id: healthScore.id,
        overall_score: healthScore.score,
        engagement_score: metrics.engagement_score,
        product_usage_score: metrics.product_usage_score,
        support_score: metrics.support_score,
        payment_score: metrics.payment_score,
        health_status: metrics.health_status,
        risk_level: healthScore.risk_level,
        risk_factors: metrics.risk_factors || [],
        recommendations: metrics.recommendations || [],
        calculated_at: healthScore.calculated_at,
      },
      history: (history || []).map((h) => ({
        calculated_at: h.calculated_at,
        overall_score: h.score,
        health_status: (h.metrics as Record<string, any>)?.health_status || h.risk_level,
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
