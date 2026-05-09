import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

    const supabase = getServiceClient()

    const validSortColumns = ['created_at', 'name', 'updated_at', 'withdrawn_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'

    let baseQuery = supabase.from('companies').select('id, name, short_id, is_active, created_at, withdrawn_at', { count: 'exact' })

    if (search) baseQuery = baseQuery.ilike('name', `%${search}%`)
    if (status === 'active') baseQuery = baseQuery.eq('is_active', true).is('withdrawn_at', null)
    else if (status === 'inactive') baseQuery = baseQuery.eq('is_active', false)
    else if (status === 'withdrawn') baseQuery = baseQuery.not('withdrawn_at', 'is', null)

    const { data: companies, count, error } = await baseQuery
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Companies API] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
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

    // Batch queries in parallel — no more N+1
    const [adminUsersResult, userCountsResult, subscriptionsResult, paymentsResult] =
      await Promise.all([
        // Admin users (company_owner) for all companies
        supabase
          .from('users')
          .select('id, full_name, email, company_id')
          .in('company_id', companyIds)
          .eq('role', 'company_owner'),

        // User counts per company
        supabase
          .from('users')
          .select('company_id')
          .in('company_id', companyIds),

        // Subscriptions for all companies
        supabase
          .from('company_subscriptions')
          .select(`
            id, plan_id, status, billing_cycle, trial_end,
            current_period_end, created_at, cancelled_at, company_id,
            subscription_plans(id, name, price_monthly, price_yearly)
          `)
          .in('company_id', companyIds)
          .in('status', ['trial', 'active', 'past_due'])
          .order('created_at', { ascending: false }),

        // Payment transactions for all companies
        supabase
          .from('payment_transactions')
          .select('total_amount, approved_at, company_id')
          .in('company_id', companyIds)
          .eq('status', 'success')
          .order('approved_at', { ascending: false }),
      ])

    // Build lookup maps
    const adminUserMap: Record<string, { id: string; full_name: string; email: string }> = {}
    for (const u of adminUsersResult.data || []) {
      if (!adminUserMap[u.company_id]) adminUserMap[u.company_id] = u
    }

    const userCountMap: Record<string, number> = {}
    for (const u of userCountsResult.data || []) {
      userCountMap[u.company_id] = (userCountMap[u.company_id] || 0) + 1
    }

    const subscriptionMap: Record<string, any> = {}
    for (const s of subscriptionsResult.data || []) {
      if (!subscriptionMap[s.company_id]) subscriptionMap[s.company_id] = s
    }

    // Payment stats per company
    const paymentMap: Record<string, { total_paid: number; payment_count: number; first_payment_date: string | null; last_payment_date: string | null }> = {}
    for (const p of paymentsResult.data || []) {
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
          ? {
              plan_name: plan?.name || null,
              monthly_price: plan?.price_monthly || 0,
              yearly_price: plan?.price_yearly || 0,
              billing_cycle: sub.billing_cycle,
              status: sub.status,
              trial_end_date: sub.trial_end,
              current_period_end: sub.current_period_end,
              subscribed_at: sub.created_at,
              canceled_at: sub.cancelled_at,
            }
          : null,
        payment_stats: {
          total_paid: pm.total_paid,
          payment_count: pm.payment_count,
          first_payment_date: pm.first_payment_date,
          last_payment_date: pm.last_payment_date,
        },
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      companies: result,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
