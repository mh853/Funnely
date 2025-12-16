import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import {
  requirePermission,
  getUserWithRoles,
  canAssignRole,
  invalidateUserPermissionCache,
} from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/users/[userId]/roles
 * 특정 사용자의 역할 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_USERS)

    const userWithRoles = await getUserWithRoles(params.userId)

    if (!userWithRoles) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: userWithRoles,
    })
  } catch (error) {
    console.error('[User Roles API] Unexpected error:', error)

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
 * POST /api/admin/users/[userId]/roles
 * 사용자에게 역할 할당
 * 기존 역할을 모두 제거하고 새 역할 목록으로 교체
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
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
    const { roleIds } = body

    // 입력 검증
    if (!roleIds || !Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: 'roleIds must be an array' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', params.userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 할당 권한 확인
    for (const roleId of roleIds) {
      const canAssign = await canAssignRole(adminUser.user.id, roleId)
      if (!canAssign) {
        // 역할 이름 조회
        const { data: role } = await supabase
          .from('admin_roles')
          .select('name')
          .eq('id', roleId)
          .single()

        return NextResponse.json(
          {
            error: `Cannot assign role: ${role?.name || roleId}. Insufficient permissions.`,
          },
          { status: 403 }
        )
      }
    }

    // 기존 역할 할당 모두 제거
    await supabase
      .from('admin_role_assignments')
      .delete()
      .eq('user_id', params.userId)

    // 새 역할 할당
    const assignments = roleIds.map((roleId) => ({
      user_id: params.userId,
      role_id: roleId,
      assigned_by: adminUser.user.id,
    }))

    const { data: newAssignments, error: assignError } = await supabase
      .from('admin_role_assignments')
      .insert(assignments)
      .select()

    if (assignError) {
      console.error('[User Roles API] Error assigning roles:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign roles' },
        { status: 500 }
      )
    }

    // 사용자 권한 캐시 무효화
    invalidateUserPermissionCache(params.userId)

    // 할당된 역할 정보 가져오기
    const { data: roles } = await supabase
      .from('admin_roles')
      .select('*')
      .in('id', roleIds)

    // 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.ROLE_ASSIGN,
      entityType: 'user',
      entityId: params.userId,
      metadata: {
        assignedRoles: roles?.map((r) => ({ id: r.id, name: r.name })) || [],
        targetUser: user.email,
        assignedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      assignments: newAssignments,
      roles: roles || [],
    })
  } catch (error) {
    console.error('[User Roles API] Unexpected error:', error)

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
