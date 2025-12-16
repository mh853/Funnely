import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import {
  requirePermission,
  invalidateUserPermissionCache,
} from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * DELETE /api/admin/users/[userId]/roles/[roleId]
 * 사용자에게서 특정 역할 제거
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; roleId: string } }
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

    // 사용자 존재 확인
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', params.userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 역할 정보 가져오기
    const { data: role } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('id', params.roleId)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 역할 할당 확인
    const { data: assignment } = await supabase
      .from('admin_role_assignments')
      .select('*')
      .eq('user_id', params.userId)
      .eq('role_id', params.roleId)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Role assignment not found' },
        { status: 404 }
      )
    }

    // 역할 할당 제거
    const { error: deleteError } = await supabase
      .from('admin_role_assignments')
      .delete()
      .eq('user_id', params.userId)
      .eq('role_id', params.roleId)

    if (deleteError) {
      console.error('[User Roles API] Error removing role:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove role' },
        { status: 500 }
      )
    }

    // 사용자 권한 캐시 무효화
    invalidateUserPermissionCache(params.userId)

    // 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.ROLE_UNASSIGN,
      entityType: 'user',
      entityId: params.userId,
      metadata: {
        removedRole: { id: role.id, name: role.name },
        targetUser: user.email,
        removedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      removedRoleId: params.roleId,
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
