import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import {
  requirePermission,
  canModifyRole,
  canDeleteRole,
  invalidateAllPermissionCaches,
} from '@/lib/admin/rbac-middleware'
import { PERMISSIONS, DEFAULT_ROLES } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/roles/[id]
 * 특정 역할 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { data: role, error } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 할당된 사용자 수 계산
    const { count: userCount } = await supabase
      .from('admin_role_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', params.id)

    return NextResponse.json({
      success: true,
      role,
      userCount: userCount || 0,
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
 * PUT /api/admin/roles/[id]
 * 역할 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 기존 역할 조회
    const { data: existingRole, error: fetchError } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 수정 가능 여부 확인
    const { canModify, reason } = await canModifyRole(
      adminUser.user.id,
      existingRole.code
    )

    if (!canModify) {
      return NextResponse.json({ error: reason }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissions } = body

    // 업데이트할 필드 준비
    const updates: any = {}

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json(
          { error: 'Permissions must be an array' },
          { status: 400 }
        )
      }
      updates.permissions = permissions
    }

    // 업데이트할 내용이 없으면 에러
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // 역할 업데이트
    const { data: updatedRole, error: updateError } = await supabase
      .from('admin_roles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError || !updatedRole) {
      console.error('[Roles API] Error updating role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    // 모든 권한 캐시 무효화 (역할이 수정됨)
    invalidateAllPermissionCaches()

    // 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.ROLE_UPDATE,
      entityType: 'admin_role',
      entityId: updatedRole.id,
      metadata: {
        roleCode: updatedRole.code,
        roleName: updatedRole.name,
        changes: updates,
        updatedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      role: updatedRole,
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
 * DELETE /api/admin/roles/[id]
 * 역할 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 기존 역할 조회
    const { data: existingRole, error: fetchError } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // 삭제 가능 여부 확인
    const { canDelete, reason } = await canDeleteRole(
      adminUser.user.id,
      params.id
    )

    if (!canDelete) {
      return NextResponse.json({ error: reason }, { status: 403 })
    }

    // 역할 삭제
    const { error: deleteError } = await supabase
      .from('admin_roles')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[Roles API] Error deleting role:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      )
    }

    // 모든 권한 캐시 무효화
    invalidateAllPermissionCaches()

    // 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.ROLE_DELETE,
      entityType: 'admin_role',
      entityId: params.id,
      metadata: {
        roleCode: existingRole.code,
        roleName: existingRole.name,
        deletedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      deletedRoleId: params.id,
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
