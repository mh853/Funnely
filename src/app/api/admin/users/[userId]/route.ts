import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission, getUserPermissions } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/users/[userId]
 * 특정 사용자 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_USERS)

    // 3. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 사용자 기본 정보
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at, last_sign_in_at')
      .eq('id', params.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 프로필 정보
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, company_id')
      .eq('user_id', params.userId)
      .single()

    // 회사 정보
    let companyInfo = null
    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profile.company_id)
        .single()
      companyInfo = company
    }

    // 관리자 역할
    const { data: roleAssignments } = await supabase
      .from('admin_role_assignments')
      .select('role:admin_roles(*)')
      .eq('user_id', params.userId)

    const adminRoles =
      roleAssignments?.map((ra: any) => ra.role).filter(Boolean) || []

    // 권한 목록
    const permissions = await getUserPermissions(params.userId)

    // 활동 통계
    // 로그인 수 (감사 로그)
    const { count: loginCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('action', 'admin.login')

    // 마지막 로그인
    const { data: lastLogin } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('user_id', params.userId)
      .eq('action', 'admin.login')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 생성한 리드 수
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', params.userId)

    // 4. 응답 구성
    const userDetail = {
      ...user,
      profile: {
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
      },
      company: companyInfo,
      admin_roles: adminRoles,
      permissions,
      activity: {
        login_count: loginCount || 0,
        last_login_at: lastLogin?.created_at || null,
        lead_count: leadCount || 0,
      },
    }

    return NextResponse.json({
      success: true,
      user: userDetail,
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
 * PUT /api/admin/users/[userId]
 * 사용자 정보 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_USERS)

    // 3. 요청 바디 파싱
    const body = await request.json()
    const { email, full_name, company_id, password } = body

    // 4. Supabase 쿼리
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

    // 사용자 존재 확인
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', params.userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let passwordChanged = false

    // 이메일 업데이트
    if (email !== undefined && email !== existingUser.email) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Invalid email format', field: 'email' },
          { status: 400 }
        )
      }

      // 이메일 중복 확인
      const { data: duplicateUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', params.userId)
        .single()

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Email already in use', field: 'email' },
          { status: 409 }
        )
      }

      const { error: emailError } = await supabase.auth.admin.updateUserById(
        params.userId,
        { email }
      )

      if (emailError) {
        console.error('[Users API] Email update error:', emailError)
        return NextResponse.json(
          { error: 'Failed to update email' },
          { status: 500 }
        )
      }
    }

    // 비밀번호 업데이트
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return NextResponse.json(
          {
            error: 'Password must be at least 8 characters long',
            field: 'password',
          },
          { status: 400 }
        )
      }

      const { error: passwordError } =
        await supabase.auth.admin.updateUserById(params.userId, { password })

      if (passwordError) {
        console.error('[Users API] Password update error:', passwordError)
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        )
      }

      passwordChanged = true
    }

    // 프로필 업데이트
    if (full_name !== undefined || company_id !== undefined) {
      const profileUpdate: any = {}
      if (full_name !== undefined) profileUpdate.full_name = full_name
      if (company_id !== undefined) profileUpdate.company_id = company_id

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: params.userId,
          ...profileUpdate,
        })

      if (profileError) {
        console.error('[Users API] Profile update error:', profileError)
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        )
      }
    }

    // 5. 감사 로그 생성
    const action = passwordChanged
      ? AUDIT_ACTIONS.USER_PASSWORD_RESET
      : AUDIT_ACTIONS.USER_UPDATE

    await createAuditLog(request, {
      userId: adminUser.user.id,
      action,
      entityType: 'user',
      entityId: params.userId,
      metadata: {
        targetUserEmail: email || existingUser.email,
        updatedFields: Object.keys(body),
        passwordChanged,
        updatedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 6. 업데이트된 사용자 정보 조회
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', params.userId)
      .single()

    return NextResponse.json({
      success: true,
      user: updatedUser,
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
 * DELETE /api/admin/users/[userId]
 * 사용자 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_USERS)

    // 3. 제약 조건 확인
    // 자기 자신 삭제 방지
    if (params.userId === adminUser.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      )
    }

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

    // 사용자 존재 확인
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', params.userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 슈퍼 관리자 보호
    const targetPermissions = await getUserPermissions(params.userId)
    if (targetPermissions.includes(PERMISSIONS.SUPER_ADMIN)) {
      const adminPermissions = await getUserPermissions(adminUser.user.id)
      if (!adminPermissions.includes(PERMISSIONS.SUPER_ADMIN)) {
        return NextResponse.json(
          { error: 'Cannot delete super admin account' },
          { status: 403 }
        )
      }
    }

    // 4. 사용자 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      params.userId
    )

    if (deleteError) {
      console.error('[Users API] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // 5. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.USER_DELETE,
      entityType: 'user',
      entityId: params.userId,
      metadata: {
        targetUserEmail: targetUser.email,
        deletedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 6. 응답
    return NextResponse.json({
      success: true,
      deletedUserId: params.userId,
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
