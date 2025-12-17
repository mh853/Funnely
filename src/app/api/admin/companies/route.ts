import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/companies
 * 회사 목록 조회 (페이지네이션)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크 (is_super_admin이면 권한 체크 스킵)
    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)
    }

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 카운트 쿼리
    let countQuery = supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`)
    }
    if (status && status !== 'all') {
      const isActive = status === 'active'
      countQuery = countQuery.eq('is_active', isActive)
    }

    const { count } = await countQuery

    // 데이터 쿼리
    let dataQuery = supabase
      .from('companies')
      .select(
        `
        id,
        name,
        short_id,
        is_active,
        created_at,
        updated_at
      `
      )
      .range(offset, offset + limit - 1)

    // 검색 조건
    if (search) {
      dataQuery = dataQuery.ilike('name', `%${search}%`)
    }

    // 상태 필터
    if (status && status !== 'all') {
      const isActive = status === 'active'
      dataQuery = dataQuery.eq('is_active', isActive)
    }

    // 정렬
    const validSortColumns = ['created_at', 'name', 'updated_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    dataQuery = dataQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data: companies, error } = await dataQuery

    if (error) {
      console.error('[Companies API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    // 5. 각 회사의 상세 정보 조회
    const companiesWithDetails = await Promise.all(
      (companies || []).map(async (company) => {
        // Admin user (company_owner)
        const { data: adminUser } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('company_id', company.id)
          .eq('role', 'company_owner')
          .limit(1)
          .single()

        // User count
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // Lead count
        const { count: leadCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // Landing pages count
        const { count: pagesCount } = await supabase
          .from('landing_pages')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // Subscription information
        const { data: subscription } = await supabase
          .from('company_subscriptions')
          .select(`
            id,
            plan_id,
            status,
            billing_cycle,
            trial_end,
            current_period_end,
            created_at,
            cancelled_at,
            subscription_plans (
              id,
              name,
              price_monthly,
              price_yearly
            )
          `)
          .eq('company_id', company.id)
          .in('status', ['trial', 'active', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Payment transactions
        const { data: payments } = await supabase
          .from('payment_transactions')
          .select('total_amount, approved_at')
          .eq('company_id', company.id)
          .eq('status', 'success')
          .order('approved_at', { ascending: false })

        const totalPaid = payments?.reduce((sum, p) => sum + p.total_amount, 0) || 0
        const paymentCount = payments?.length || 0
        const lastPaymentDate = payments?.[0]?.approved_at || null

        return {
          id: company.id,
          name: company.name,
          slug: company.short_id || company.id.substring(0, 8),
          is_active: company.is_active,
          created_at: company.created_at,
          admin_user: adminUser || {
            id: '',
            full_name: '없음',
            email: '없음'
          },
          stats: {
            total_users: userCount || 0,
            total_leads: leadCount || 0,
            landing_pages_count: pagesCount || 0
          },
          subscription: subscription ? {
            plan_id: subscription.plan_id,
            plan_name: (subscription.subscription_plans as any)?.name || null,
            monthly_price: (subscription.subscription_plans as any)?.price_monthly || 0,
            yearly_price: (subscription.subscription_plans as any)?.price_yearly || 0,
            billing_cycle: subscription.billing_cycle,
            status: subscription.status,
            trial_end_date: subscription.trial_end,
            current_period_end: subscription.current_period_end,
            subscribed_at: subscription.created_at,
            canceled_at: subscription.cancelled_at,
            payment_stats: {
              total_paid: totalPaid,
              payment_count: paymentCount,
              last_payment_date: lastPaymentDate
            }
          } : null
        }
      })
    )

    // 6. 응답
    const page = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      companies: companiesWithDetails,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: (count || 0) > offset + limit,
        hasPrev: offset > 0
      },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/companies
 * 새 회사 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

    // 3. 요청 바디 파싱 및 검증
    const body = await request.json()
    const { name, slug, status } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: name', field: 'name' },
        { status: 400 }
      )
    }

    // 4. Slug 생성 (미입력 시 name에서 자동 생성)
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

    // 5. Supabase Insert
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Slug 중복 확인
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', finalSlug)
      .single()

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company with this slug already exists', field: 'slug' },
        { status: 409 }
      )
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: name.trim(),
        slug: finalSlug,
        status: status || 'active',
      })
      .select()
      .single()

    if (error || !company) {
      console.error('[Companies API] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      )
    }

    // 6. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.COMPANY_CREATE,
      entityType: 'company',
      entityId: company.id,
      metadata: {
        name: company.name,
        slug: company.slug,
        status: company.status,
        createdBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 7. 응답
    return NextResponse.json(
      {
        success: true,
        company,
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
