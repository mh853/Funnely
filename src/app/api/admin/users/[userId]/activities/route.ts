import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { UserActivitiesResponse } from '@/types/admin'

/**
 * GET /api/admin/users/[userId]/activities
 * 사용자 상세 페이지의 "활동" 탭이 호출하는 엔드포인트.
 * 이 라우트가 존재하지 않아 항상 404로 실패하고 있었다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_USERS)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        action,
        description,
        metadata,
        ip_address,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)

    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case '7d':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case '30d':
          startDate = new Date(now.setDate(now.getDate() - 30))
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    query = query.order('created_at', { ascending: false })

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: activities, error, count } = await query

    if (error) {
      console.error('[User Activities API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.max(1, Math.ceil((count || 0) / limit))

    const response: UserActivitiesResponse = {
      activities: (activities || []).map((activity: any) => ({
        id: activity.id,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata,
        ip_address: activity.ip_address,
        created_at: activity.created_at,
      })),
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Forbidden')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }

    console.error('Error in GET /api/admin/users/[userId]/activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
