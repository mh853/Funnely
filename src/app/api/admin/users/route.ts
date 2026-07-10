import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/users
 * 사용자 목록 조회 (페이지네이션)
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
      await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_USERS)
    }

    // 3. 쿼리 파라미터 파싱
    // 프론트엔드(admin/users/page.tsx)가 실제로 보내는 파라미터명과 일치시킨다.
    // 이전에는 companyId/roleFilter/offset 등 다른 이름을 읽고 있어서 회사/역할
    // 필터와 페이지네이션이 전부 무시되고 있었다.
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const offset = (page - 1) * limit
    const search = searchParams.get('search')
    const companyId = searchParams.get('company_id')
    const roleFilter = searchParams.get('role')
    const statusFilter = searchParams.get('status')
    const dateRange = searchParams.get('dateRange')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 'profiles' 테이블은 존재하지 않는다 (full_name은 users 테이블에 직접 있음).
    // 존재하지 않는 관계를 참조하는 or() 필터는 PostgREST 에러를 유발해, 검색어를
    // 입력할 때마다 목록 조회 자체가 500으로 실패하고 있었다.
    const safeSearch = search ? search.replace(/[,()]/g, '') : null

    // 프론트엔드는 필터 미선택 시 'all'을 보낸다.
    const hasCompanyFilter = !!companyId && companyId !== 'all'
    const hasRoleFilter = !!roleFilter && roleFilter !== 'all'
    const hasStatusFilter = statusFilter === 'active' || statusFilter === 'inactive'
    const hasDateRangeFilter = !!dateRange && dateRange !== 'all'

    let dateRangeStart: string | null = null
    if (hasDateRangeFilter) {
      const now = new Date()
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : null
      if (days !== null) {
        dateRangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    // 모든 목록/카운트 쿼리에 동일한 필터 세트를 적용하기 위한 헬퍼.
    // simple_role은 role 필터(admin/manager/user)가 실제로 가리키는 컬럼이다 —
    // 레거시 role 컬럼(company_owner 등)에는 이 3개 값이 존재하지 않는다.
    // includeStatus=false로 호출하면 status 필터를 제외한 나머지만 적용한다 —
    // 활성/비활성 통계 카드는 현재 선택된 status 필터와 무관하게 항상 두 값을
    // 함께 보여줘야 하므로, is_active를 각자 명시적으로 덧붙인다.
    const applyFilters = <T extends { eq: any; or: any; gte: any }>(
      query: T,
      includeStatus = true
    ): T => {
      let q = query
      if (hasCompanyFilter) q = q.eq('company_id', companyId)
      if (hasRoleFilter) q = q.eq('simple_role', roleFilter)
      if (includeStatus && hasStatusFilter) q = q.eq('is_active', statusFilter === 'active')
      if (dateRangeStart) q = q.gte('created_at', dateRangeStart)
      if (safeSearch) {
        q = q.or(`email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`)
      }
      return q
    }

    // 카운트 쿼리
    const { count } = await applyFilters(
      supabase.from('users').select('id', { count: 'exact', head: true }) as any
    )

    // 활성/비활성 사용자 수는 현재 페이지가 아니라 현재 필터 조건 전체 기준으로
    // 별도 집계해야 한다. 페이지 슬라이스만으로 계산하면 페이지 크기(20~100)를
    // 넘는 순간부터 통계 카드가 실제 값과 어긋난다.
    const { count: activeCount } = await applyFilters(
      supabase.from('users').select('id', { count: 'exact', head: true }) as any,
      false
    ).eq('is_active', true)
    const { count: inactiveCount } = await applyFilters(
      supabase.from('users').select('id', { count: 'exact', head: true }) as any,
      false
    ).eq('is_active', false)

    // 데이터 쿼리
    let dataQuery = applyFilters(
      supabase
        .from('users')
        .select(
          `
        id,
        email,
        full_name,
        company_id,
        role,
        simple_role,
        is_active,
        created_at,
        last_login,
        companies(name)
      `
        ) as any
    )

    dataQuery = dataQuery.range(offset, offset + limit - 1)

    // 정렬
    const validSortColumns = ['created_at', 'email']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    dataQuery = dataQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data: usersData, error } = await dataQuery

    if (error) {
      console.error('[Users API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // 5. 각 사용자의 역할 정보 조회 (simple_role 우선 — admin/manager/user 3단계 체계)
    const usersWithRoles = (usersData || []).map((user: any) => {
      // companies는 배열 또는 단일 객체일 수 있음
      const company = Array.isArray(user.companies)
        ? user.companies[0]
        : user.companies

      const primaryRole = user.simple_role || user.role || '일반 사용자'

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name || null,
        company_id: user.company_id || null,
        company_name: company?.name || null,
        company: company ? { name: company.name } : null,
        role: primaryRole,
        created_at: user.created_at,
        last_sign_in_at: user.last_login,
        last_login_at: user.last_login, // 프론트엔드 호환성
        is_active: user.is_active ?? false,
      }
    })

    const filteredUsers = usersWithRoles

    // 6. 통계 계산 (현재 필터 조건의 전체 사용자 기준 — 페이지 슬라이스가 아님)
    const totalUsers = count || 0
    const activeUsers = activeCount || 0
    const inactiveUsers = inactiveCount || 0

    // 역할별 통계
    const byRole: Record<string, number> = {}
    usersWithRoles.forEach((user: any) => {
      byRole[user.role] = (byRole[user.role] || 0) + 1
    })

    // 회사별 통계
    const byCompanyMap = new Map<string, { name: string; count: number }>()
    usersWithRoles.forEach((user: any) => {
      if (user.company_id && user.company_name) {
        const existing = byCompanyMap.get(user.company_id) || {
          name: user.company_name,
          count: 0,
        }
        existing.count++
        byCompanyMap.set(user.company_id, existing)
      }
    })

    const byCompany = Array.from(byCompanyMap.entries()).map(
      ([company_id, { name, count }]) => ({
        company_id,
        company_name: name,
        count,
      })
    )

    // 7. 응답
    // 프론트엔드(admin/users/page.tsx)는 page/hasPrev/hasNext/totalPages를 읽는다.
    // 이전에는 offset/hasMore만 반환해서 이전/다음 버튼이 항상 비활성화되고
    // 페이지 카운터가 "1 / undefined"로 표시됐다.
    const totalPages = Math.max(1, Math.ceil((count || 0) / limit))
    return NextResponse.json({
      success: true,
      users: filteredUsers,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      summary: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: inactiveUsers,
        by_role: byRole,
        by_company: byCompany,
      },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Users API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users
 * 새 사용자 생성 (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크 (is_super_admin이면 권한 체크 스킵)
    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_USERS)
    }

    // 3. 요청 바디 파싱 및 검증
    const body = await request.json()
    const { email, password, full_name, company_id, role_ids } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: email', field: 'email' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        {
          error: 'Password must be at least 8 characters long',
          field: 'password',
        },
        { status: 400 }
      )
    }

    // 4. Supabase Admin API로 사용자 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists', field: 'email' },
        { status: 409 }
      )
    }

    // 사용자 생성
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      console.error('[Users API] Auth create error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // 프로필 생성/업데이트
    if (full_name || company_id) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: authData.user.id,
        full_name: full_name || null,
        company_id: company_id || null,
      })

      if (profileError) {
        console.error('[Users API] Profile update error:', profileError)
        // 프로필 에러는 사용자 생성을 차단하지 않음
      }
    }

    // 역할 할당
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const roleAssignments = role_ids.map((roleId) => ({
        user_id: authData.user.id,
        role_id: roleId,
      }))

      const { error: roleError } = await supabase
        .from('admin_role_assignments')
        .insert(roleAssignments)

      if (roleError) {
        console.error('[Users API] Role assignment error:', roleError)
        // 역할 할당 에러는 사용자 생성을 차단하지 않음
      }
    }

    // 5. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.USER_CREATE,
      entityType: 'user',
      entityId: authData.user.id,
      companyId: company_id || undefined,
      metadata: {
        email: authData.user.email,
        full_name: full_name || null,
        company_id: company_id || null,
        role_count: role_ids?.length || 0,
        createdBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 6. 응답 구성
    const createdUser = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: full_name || null,
      company_id: company_id || null,
      created_at: authData.user.created_at,
    }

    return NextResponse.json(
      {
        success: true,
        user: createdUser,
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

    console.error('[Users API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
