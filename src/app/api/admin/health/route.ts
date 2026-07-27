import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { getKSTDayRange } from '@/lib/utils/date'

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
    // riskLevel과 healthStatus 모두 지원 (하위 호환성)
    const riskLevel = searchParams.get('riskLevel') || searchParams.get('healthStatus') // 'low' | 'medium' | 'high' | 'critical'
    const sortBy = searchParams.get('sortBy') || 'calculated_at' // 'calculated_at' | 'score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const date = searchParams.get('date') // Optional: specific date filter (YYYY-MM-DD)

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const validSortColumns = ['calculated_at', 'score']
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : 'calculated_at'

    // customer_health_scores는 회사당 하루(때로는 하루에도 여러 번) 한 건씩 쌓이는
    // 이력 테이블이다(/api/admin/churn/analysis에서 동일한 문제를 먼저 발견·수정함).
    // date 필터가 없는 "현재 상태" 조회에서 dedup 없이 그대로 필터·페이지네이션하면
    // 이력이 많이 쌓인 회사가 결과를 반복 도배하고 count도 실제 회사 수보다 부풀려진다.
    // date 필터가 있는 경우는 특정 날짜의 스냅샷을 보려는 의도이므로 dedup하지 않는다.
    if (!date) {
      let allQuery = supabase
        .from('customer_health_scores')
        .select(
          `
          id,
          company_id,
          score,
          risk_level,
          metrics,
          calculated_at,
          created_at,
          companies!inner(id, name, short_id, is_active)
        `
        )
        .order('calculated_at', { ascending: false })

      if (riskLevel) {
        allQuery = allQuery.eq('risk_level', riskLevel)
      }

      const { data: allScores, error } = await allQuery

      if (error) {
        console.error('[Health API] Query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch health scores' },
          { status: 500 }
        )
      }

      const latestByCompany = new Map<string, any>()
      for (const item of allScores || []) {
        if (!latestByCompany.has(item.company_id)) {
          latestByCompany.set(item.company_id, item)
        }
      }

      const deduped = Array.from(latestByCompany.values()).sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1
        return a[sortColumn] > b[sortColumn] ? dir : a[sortColumn] < b[sortColumn] ? -dir : 0
      })

      const page = deduped.slice(offset, offset + limit)

      const formattedScores = page.map((score: any) => ({
        id: score.id,
        company: {
          id: score.companies.id,
          name: score.companies.name,
          short_id: score.companies.short_id,
          is_active: score.companies.is_active,
        },
        score: score.score,
        risk_level: score.risk_level,
        metrics: score.metrics || {},
        calculated_at: score.calculated_at,
        created_at: score.created_at,
      }))

      return NextResponse.json({
        success: true,
        health_scores: formattedScores,
        pagination: {
          total: deduped.length,
          limit,
          offset,
          hasMore: deduped.length > offset + limit,
        },
      })
    }

    // date 필터가 있는 경우: 해당 날짜의 스냅샷을 그대로 조회(dedup 없음)
    let countQuery = supabase
      .from('customer_health_scores')
      .select('*', { count: 'exact', head: true })

    if (riskLevel) {
      countQuery = countQuery.eq('risk_level', riskLevel)
    }

    // new Date(date)로 직접 파싱하면 "YYYY-MM-DD"가 UTC 자정으로 해석되어 KST 기준
    // 하루(00:00~24:00 KST)가 아니라 KST 09:00~다음날 09:00 범위가 되어버린다.
    const { start: targetDate, end: nextDate } = getKSTDayRange(date)

    countQuery = countQuery
      .gte('calculated_at', targetDate.toISOString())
      .lt('calculated_at', nextDate.toISOString())

    let dataQuery = supabase
      .from('customer_health_scores')
      .select(
        `
        id,
        company_id,
        score,
        risk_level,
        metrics,
        calculated_at,
        created_at,
        companies!inner(id, name, short_id, is_active)
      `
      )
      .range(offset, offset + limit - 1)
      .gte('calculated_at', targetDate.toISOString())
      .lt('calculated_at', nextDate.toISOString())

    if (riskLevel) {
      dataQuery = dataQuery.eq('risk_level', riskLevel)
    }

    dataQuery = dataQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    // count/data 쿼리는 서로 무관하므로 병렬로 실행
    const [{ count }, { data: healthScores, error }] = await Promise.all([countQuery, dataQuery])

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
        short_id: score.companies.short_id,
        is_active: score.companies.is_active,
      },
      score: score.score,
      risk_level: score.risk_level,
      metrics: score.metrics || {},
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
