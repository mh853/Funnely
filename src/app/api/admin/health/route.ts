import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

/**
 * GET /api/admin/health
 * 건강도 점수 목록 조회 (페이지네이션)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_HEALTH_SCORES)

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const healthStatus = searchParams.get('healthStatus') // 'critical' | 'at_risk' | 'healthy' | 'excellent'
    const sortBy = searchParams.get('sortBy') || 'calculated_at' // 'calculated_at' | 'overall_score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const date = searchParams.get('date') // Optional: specific date filter (YYYY-MM-DD)

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 카운트 쿼리
    let countQuery = supabase
      .from('health_scores')
      .select('*', { count: 'exact', head: true })

    if (healthStatus) {
      countQuery = countQuery.eq('health_status', healthStatus)
    }

    if (date) {
      const targetDate = new Date(date)
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)

      countQuery = countQuery
        .gte('calculated_at', targetDate.toISOString())
        .lt('calculated_at', nextDate.toISOString())
    }

    const { count } = await countQuery

    // 데이터 쿼리
    let dataQuery = supabase
      .from('health_scores')
      .select(
        `
        id,
        company_id,
        overall_score,
        engagement_score,
        product_usage_score,
        support_score,
        payment_score,
        health_status,
        risk_factors,
        recommendations,
        calculated_at,
        created_at,
        companies!inner(id, name, slug, status)
      `
      )
      .range(offset, offset + limit - 1)

    // 필터 적용
    if (healthStatus) {
      dataQuery = dataQuery.eq('health_status', healthStatus)
    }

    if (date) {
      const targetDate = new Date(date)
      const nextDate = new Date(targetDate)
      nextDate.setDate(nextDate.getDate() + 1)

      dataQuery = dataQuery
        .gte('calculated_at', targetDate.toISOString())
        .lt('calculated_at', nextDate.toISOString())
    }

    // 정렬
    const validSortColumns = ['calculated_at', 'overall_score']
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : 'calculated_at'
    dataQuery = dataQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data: healthScores, error } = await dataQuery

    if (error) {
      console.error('[Health API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch health scores' },
        { status: 500 }
      )
    }

    // 5. 응답 포맷팅
    const formattedScores = (healthScores || []).map((score: any) => ({
      id: score.id,
      company: {
        id: score.companies.id,
        name: score.companies.name,
        slug: score.companies.slug,
        status: score.companies.status,
      },
      overall_score: score.overall_score,
      engagement_score: score.engagement_score,
      product_usage_score: score.product_usage_score,
      support_score: score.support_score,
      payment_score: score.payment_score,
      health_status: score.health_status,
      risk_factors: score.risk_factors || [],
      recommendations: score.recommendations || [],
      calculated_at: score.calculated_at,
      created_at: score.created_at,
    }))

    // 6. 응답
    return NextResponse.json({
      success: true,
      health_scores: formattedScores,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
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
