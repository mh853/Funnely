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
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const roleFilter = searchParams.get('roleFilter')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 카운트 쿼리
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(
        `email.ilike.%${search}%,profiles.full_name.ilike.%${search}%`
      )
    }

    const { count } = await countQuery

    // 데이터 쿼리 (role 컬럼 추가)
    let dataQuery = supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        company_id,
        role,
        is_active,
        created_at,
        last_login,
        companies(name)
      `
      )
      .range(offset, offset + limit - 1)

    // 회사 필터
    if (companyId) {
      dataQuery = dataQuery.eq('company_id', companyId)
    }

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

    // 5. 각 사용자의 역할 정보 조회 (users.role 우선 사용)
    const usersWithRoles = await Promise.all(
      (usersData || []).map(async (user: any) => {
        // companies는 배열 또는 단일 객체일 수 있음
        const company = Array.isArray(user.companies)
          ? user.companies[0]
          : user.companies

        // users.role 컬럼의 값을 사용 (실제 업무 역할)
        // role 값이 없으면 기본값으로 '일반 사용자' 사용
        const primaryRole = user.role || '일반 사용자'

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
    )

    // 역할 필터 적용
    let filteredUsers = usersWithRoles
    if (roleFilter) {
      // TODO: admin_roles table doesn't exist yet
      // filteredUsers = usersWithRoles.filter((user: any) =>
      //   user.admin_roles?.some((role: any) => role.id === roleFilter)
      // )
    }

    // 검색 필터 적용 (이름/이메일)
    if (search) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          (user.full_name &&
            user.full_name.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // 6. 통계 계산 (전체 사용자 기준)
    const totalUsers = count || 0
    const activeUsers = usersWithRoles.filter((u) => u.is_active).length
    const inactiveUsers = usersWithRoles.length - activeUsers

    // 역할별 통계
    const byRole: Record<string, number> = {}
    usersWithRoles.forEach((user) => {
      byRole[user.role] = (byRole[user.role] || 0) + 1
    })

    // 회사별 통계
    const byCompanyMap = new Map<string, { name: string; count: number }>()
    usersWithRoles.forEach((user) => {
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
    return NextResponse.json({
      success: true,
      users: filteredUsers,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
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
