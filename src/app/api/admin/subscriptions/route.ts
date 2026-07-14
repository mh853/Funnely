import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/subscriptions
 * 구독 목록 조회 (페이지네이션)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    // 3. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Count 쿼리
    let countQuery = supabase
      .from('company_subscriptions')
      .select('*', { count: 'exact', head: true })

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    // 데이터 쿼리 (JOIN으로 N+1 방지)
    let dataQuery = supabase
      .from('company_subscriptions')
      .select(
        `
        id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_end_date,
        cancelled_at,
        created_at,
        company:companies(id, name, business_number, phone),
        plan:subscription_plans!plan_id(id, name, plan_type, price_monthly, price_yearly, max_users, max_leads)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      dataQuery = dataQuery.eq('status', status)
    }

    // count/data 쿼리는 서로 무관하므로 병렬로 실행
    const [{ count }, { data: subscriptions, error }] = await Promise.all([countQuery, dataQuery])

    if (error) {
      console.error('[Subscriptions API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // 4. 응답 데이터 정규화
    const subscriptionsWithDetails = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      billing_cycle: sub.billing_cycle,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      trial_end: sub.trial_end_date,
      cancelled_at: sub.cancelled_at,
      company: sub.company || { id: '', name: '알 수 없음', business_number: '', phone: '' },
      plan: sub.plan || { id: '', name: '알 수 없음', plan_type: 'business', price_monthly: 0, price_yearly: 0, max_users: null, max_leads: null },
      created_at: sub.created_at,
    }))

    // 5. 페이지네이션 정보
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      subscriptions: subscriptionsWithDetails,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: (count || 0) > offset + limit,
        hasPrev: offset > 0,
      },
    })
  } catch (error) {
    console.error('[Subscriptions API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
