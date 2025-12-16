import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS, PERMISSION_INFO, PERMISSION_CATEGORIES } from '@/types/rbac'

/**
 * GET /api/admin/permissions
 * 사용 가능한 모든 권한 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_ROLES)

    // 모든 권한 정보를 배열로 변환
    const permissions = Object.values(PERMISSION_INFO)

    return NextResponse.json({
      success: true,
      permissions,
      categories: PERMISSION_CATEGORIES,
    })
  } catch (error) {
    console.error('[Permissions API] Unexpected error:', error)

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
