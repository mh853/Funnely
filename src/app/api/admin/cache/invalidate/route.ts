// Cache Invalidation API
// POST /api/admin/cache/invalidate - Clear all permission caches

import { NextResponse } from 'next/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { invalidateAllPermissionCaches } from '@/lib/admin/rbac-middleware'

export async function POST() {
  try {
    // Check authentication only (no specific permission required)
    // This is a development utility that should work even when permissions are cached incorrectly
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Invalidate all permission caches
    invalidateAllPermissionCaches()

    return NextResponse.json({
      success: true,
      message: 'All permission caches have been invalidated. Please refresh the page.',
    })
  } catch (error) {
    console.error('Cache invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
