import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { CompanyActivitiesResponse } from '@/types/admin'

/**
 * GET /api/admin/companies/[id]/activities
 * 회사 활동 로그 조회 (관리자 companies 상세 페이지의 "활동" 탭이 호출하는 엔드포인트.
 * 이 라우트가 존재하지 않아 항상 404로 실패하고 있었다.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params

    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // company_activity_logs의 실제 컬럼명은 action/description/ip_address가 아니라
    // activity_type/activity_description이며, ip_address 컬럼은 아예 존재하지 않는다.
    let query = supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        company_id,
        user_id,
        activity_type,
        activity_description,
        metadata,
        created_at,
        users(full_name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)

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
        case '90d':
          startDate = new Date(now.setDate(now.getDate() - 90))
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
      console.error('[Company Activities API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    const response: CompanyActivitiesResponse = {
      activities: (activities || []).map((activity: any) => ({
        id: activity.id,
        company_id: activity.company_id,
        user_id: activity.user_id,
        user_name: activity.users?.full_name || 'Unknown',
        action: activity.activity_type,
        description: activity.activity_description || activity.activity_type,
        metadata: activity.metadata,
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

    console.error('Error in GET /api/admin/companies/[id]/activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
