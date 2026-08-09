import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { escapeIlike } from '@/lib/utils/search'
import { pickCurrentSubscription } from '@/lib/subscription-current'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// company_id IN(...) 집계 쿼리 4곳(관리자/유저수/구독/결제) 모두 .range() 없이
// 조회하고 있어, 대상 회사들의 users/company_subscriptions/payment_transactions
// 행이 합쳐서 1000건을 넘으면 PostgREST의 기본 max_rows 캡에 조용히 잘렸다
// (다른 라운드에서 반복 확인된 것과 동일한 패턴, 68차 QA 확인). 회사 목록
// 자체는 위 fetchAll 분기처럼 이미 배치 반복을 쓰고 있으므로 동일한 방식을
// 적용한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllInBatches(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const BATCH_SIZE = 1000
  const MAX_TOTAL_ROWS = 50000
  const all: any[] = []
  let offset = 0
  while (true) {
    const { data, error } = await buildQuery(offset, offset + BATCH_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < BATCH_SIZE || all.length >= MAX_TOTAL_ROWS) break
    offset += BATCH_SIZE
  }
  return all
}

/**
 * GET /api/admin/companies
 * 회사 목록 조회 (배치 쿼리로 N+1 제거)
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    // 구독/결제 등 join으로 계산되는 컬럼으로 정렬할 때는 프론트엔드가 전체 목록을
    // 받아 직접 정렬해야 하므로(DB 레벨 정렬 불가) 페이지 단위가 아닌 전체를 반환한다.
    const fetchAll = searchParams.get('all') === 'true'

    const supabase = getServiceClient()

    const validSortColumns = ['created_at', 'name', 'updated_at', 'withdrawn_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'

    let baseQuery = supabase.from('companies').select('id, name, short_id, is_active, created_at, withdrawn_at', { count: 'exact' })

    if (search) baseQuery = baseQuery.ilike('name', `%${escapeIlike(search)}%`)
    if (status === 'active') baseQuery = baseQuery.eq('is_active', true).is('withdrawn_at', null)
    else if (status === 'inactive') baseQuery = baseQuery.eq('is_active', false)
    else if (status === 'withdrawn') baseQuery = baseQuery.not('withdrawn_at', 'is', null)

    const orderedQuery = baseQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    let companies: any[] | null
    let count: number | null

    if (fetchAll) {
      // range(0,999) 상한 하나로는 필터에 맞는 회사가 1000개를 넘으면 조용히 잘린다
      // (leads/export, DB리포트 등과 동일한 PostgREST max_rows 캡 패턴, 55차 QA 확인) -
      // 배치 반복으로 진짜 전체를 가져온다.
      const BATCH_SIZE = 1000
      const MAX_TOTAL_ROWS = 20000 // 메모리/응답시간 보호용 상한
      const all: any[] = []
      let fetchOffset = 0
      let totalCount = 0
      while (true) {
        const { data: batch, count: batchCount, error: batchError } = await orderedQuery.range(fetchOffset, fetchOffset + BATCH_SIZE - 1)
        if (batchError) {
          console.error('[Companies API] Query error:', batchError)
          return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
        }
        totalCount = batchCount ?? totalCount
        if (!batch || batch.length === 0) break
        all.push(...batch)
        if (batch.length < BATCH_SIZE || all.length >= MAX_TOTAL_ROWS) break
        fetchOffset += BATCH_SIZE
      }
      companies = all
      count = totalCount
    } else {
      const { data, count: singleCount, error } = await orderedQuery.range(offset, offset + limit - 1)
      if (error) {
        console.error('[Companies API] Query error:', error)
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
      }
      companies = data
      count = singleCount
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        companies: [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: false,
          hasPrev: page > 1,
        },
      })
    }

    const companyIds = companies.map((c) => c.id)

    // Batch queries in parallel — no more N+1 (각 쿼리는 fetchAllInBatches로 내부적으로
    // .range() 배치 반복하므로 1000행을 넘는 회사 목록에서도 조용히 잘리지 않는다)
    const [adminUsersRows, userCountsRows, subscriptionsRows, paymentsRows] =
      await Promise.all([
        // Admin users (company_owner) for all companies
        fetchAllInBatches((from, to) =>
          supabase
            .from('users')
            .select('id, full_name, email, company_id')
            .in('company_id', companyIds)
            .eq('role', 'company_owner')
            .range(from, to)
        ),

        // User counts per company
        fetchAllInBatches((from, to) =>
          supabase
            .from('users')
            .select('company_id')
            .in('company_id', companyIds)
            .range(from, to)
        ),

        // Subscriptions for all companies
        // status 필터를 걸면 expired/cancelled/suspended만 있는 회사는 subscriptionMap에서
        // 아예 빠져 목록에 "구독 없음"으로 잘못 표시된다. 모든 상태를 가져와 회사별로
        // 가장 최근 레코드(생성일 desc + 최초 발견분 채택)만 사용한다.
        fetchAllInBatches((from, to) =>
          supabase
            .from('company_subscriptions')
            .select(`
              id, plan_id, status, billing_cycle, trial_end_date,
              current_period_end, created_at, cancelled_at, company_id,
              locked_plan_id, locked_price_monthly, locked_price_yearly,
              subscription_plans!plan_id(id, name, price_monthly, price_yearly)
            `)
            .in('company_id', companyIds)
            .order('created_at', { ascending: false })
            .range(from, to)
        ),

        // Payment transactions for all companies
        fetchAllInBatches((from, to) =>
          supabase
            .from('payment_transactions')
            .select('total_amount, approved_at, company_id')
            .in('company_id', companyIds)
            .eq('status', 'success')
            .order('approved_at', { ascending: false })
            .range(from, to)
        ),
      ])

    // Build lookup maps
    const adminUserMap: Record<string, { id: string; full_name: string; email: string }> = {}
    for (const u of adminUsersRows) {
      if (!adminUserMap[u.company_id]) adminUserMap[u.company_id] = u
    }

    const userCountMap: Record<string, number> = {}
    for (const u of userCountsRows) {
      userCountMap[u.company_id] = (userCountMap[u.company_id] || 0) + 1
    }

    // 단순히 created_at 기준 첫 행(가장 최근 생성된 행)을 고르면, 실제 유효한
    // 구독보다 나중에 생성된 만료/취소 이력 행이 뽑혀 요금이 잘못 표시될 수 있다 -
    // admin/subscriptions/metrics와 동일하게 pickCurrentSubscription으로 통일한다
    // (83차 QA 확인, 위 order('created_at', desc)로 이미 정렬돼 있어 그대로 재사용 가능).
    const subsByCompanyForPick: Record<string, typeof subscriptionsRows> = {}
    for (const s of subscriptionsRows) {
      (subsByCompanyForPick[s.company_id] ||= []).push(s)
    }
    const subscriptionMap: Record<string, any> = {}
    for (const [companyId, subs] of Object.entries(subsByCompanyForPick)) {
      const picked = pickCurrentSubscription(subs)
      if (picked) subscriptionMap[companyId] = picked
    }

    // Payment stats per company
    const paymentMap: Record<string, { total_paid: number; payment_count: number; first_payment_date: string | null; last_payment_date: string | null }> = {}
    for (const p of paymentsRows) {
      if (!paymentMap[p.company_id]) {
        paymentMap[p.company_id] = {
          total_paid: 0,
          payment_count: 0,
          first_payment_date: null,
          last_payment_date: null,
        }
      }
      const pm = paymentMap[p.company_id]
      pm.total_paid += p.total_amount || 0
      pm.payment_count += 1
      // last is already set (ordered desc), first is the last one we see
      pm.last_payment_date = pm.last_payment_date ?? p.approved_at
      pm.first_payment_date = p.approved_at
    }

    const result = companies.map((company) => {
      const sub = subscriptionMap[company.id]
      const pm = paymentMap[company.id] || { total_paid: 0, payment_count: 0, first_payment_date: null, last_payment_date: null }
      const plan = sub?.subscription_plans as any

      return {
        id: company.id,
        name: company.name,
        is_active: company.is_active,
        created_at: company.created_at,
        withdrawn_at: company.withdrawn_at || null,
        admin_user: adminUserMap[company.id] || null,
        stats: {
          total_users: userCountMap[company.id] || 0,
        },
        subscription: sub
          ? (() => {
              // 그랜드파더링(61차): locked_plan_id가 현재 plan_id와 일치하면
              // 카탈로그 최신가가 아니라 이 값으로 실제 청구된다 - 여기서 항상
              // 카탈로그가만 반환하면 관리자가 고객에게 실제와 다른 요금을 안내할
              // 수 있다(63차 QA 확인).
              const lockValid =
                sub.locked_plan_id === sub.plan_id &&
                sub.locked_price_monthly !== null &&
                sub.locked_price_yearly !== null
              return {
                plan_name: plan?.name || null,
                monthly_price: (lockValid ? sub.locked_price_monthly : plan?.price_monthly) || 0,
                yearly_price: (lockValid ? sub.locked_price_yearly : plan?.price_yearly) || 0,
                is_grandfathered: lockValid,
                billing_cycle: sub.billing_cycle,
                status: sub.status,
                trial_end_date: sub.trial_end_date,
                current_period_end: sub.current_period_end,
                subscribed_at: sub.created_at,
                canceled_at: sub.cancelled_at,
              }
            })()
          : null,
        payment_stats: {
          total_paid: pm.total_paid,
          payment_count: pm.payment_count,
          first_payment_date: pm.first_payment_date,
          last_payment_date: pm.last_payment_date,
        },
      }
    })

    const totalPages = fetchAll ? 1 : Math.ceil((count || 0) / limit)

    return NextResponse.json({
      companies: result,
      pagination: {
        total: count || 0,
        page: fetchAll ? 1 : page,
        limit: fetchAll ? result.length : limit,
        totalPages,
        hasNext: fetchAll ? false : page < totalPages,
        hasPrev: fetchAll ? false : page > 1,
      },
    })
  } catch (error) {
    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
