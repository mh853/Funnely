import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import {
  requirePermission,
  invalidateAllPermissionCaches,
} from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/roles
 * 모든 역할 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // manage_roles 또는 view_roles 권한 필요
    // (현재는 manage_roles만 정의되어 있으므로 이를 사용)
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_ROLES)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const includeUsers = searchParams.get('includeUsers') === 'true'

    // 역할 목록 가져오기
    const { data: roles, error } = await supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Roles API] Error fetching roles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      )
    }

    // 각 역할에 할당된 사용자 수 계산
    let userCounts: Record<string, number> = {}

    if (includeUsers && roles) {
      for (const role of roles) {
        const { count } = await supabase
          .from('admin_role_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)

        userCounts[role.id] = count || 0
      }
    }

    return NextResponse.json({
      success: true,
      roles: roles || [],
      ...(includeUsers && { userCounts }),
    })
  } catch (error) {
    console.error('[Roles API] Unexpected error:', error)

    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles
 * 새 역할 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_ROLES)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { code, name, description, permissions } = body

    // 입력 검증
    if (!code || !name || !permissions) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, permissions' },
        { status: 400 }
      )
    }

    // code 형식 검증 (영문 소문자, 숫자, 언더스코어만 허용)
    if (!/^[a-z0-9_]+$/.test(code)) {
      return NextResponse.json(
        {
          error:
            'Invalid code format: only lowercase letters, numbers, and underscores allowed',
        },
        { status: 400 }
      )
    }

    // permissions 배열 검증
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      )
    }

    // 중복 code 확인
    const { data: existing } = await supabase
      .from('admin_roles')
      .select('id')
      .eq('code', code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Role with code "${code}" already exists` },
        { status: 409 }
      )
    }

    // 역할 생성
    const { data: newRole, error: createError } = await supabase
      .from('admin_roles')
      .insert({
        code,
        name,
        description: description || null,
        permissions,
      })
      .select()
      .single()

    if (createError || !newRole) {
      console.error('[Roles API] Error creating role:', createError)
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      )
    }

    // 모든 권한 캐시 무효화 (새 역할이 추가됨)
    invalidateAllPermissionCaches()

    // 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.ROLE_CREATE,
      entityType: 'admin_role',
      entityId: newRole.id,
      metadata: {
        roleCode: newRole.code,
        roleName: newRole.name,
        permissions: newRole.permissions,
        createdBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      role: newRole,
    })
  } catch (error) {
    console.error('[Roles API] Unexpected error:', error)

    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
