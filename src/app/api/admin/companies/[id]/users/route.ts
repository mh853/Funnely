import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { CompanyUsersResponse } from '@/types/admin'

/**
 * GET /api/admin/companies/[id]/users
 * 고객사 상세 페이지의 "사용자" 탭이 호출하는 엔드포인트.
 * 이 라우트가 존재하지 않아 항상 404로 실패하고 있었다.
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    // role 필터는 simple_role(admin/manager/user) 3단계 체계를 기준으로 한다.
    // 레거시 role 컬럼(company_owner 등)에는 이 값들이 존재하지 않는다.
    let query = supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        simple_role,
        role,
        department,
        is_active,
        last_login,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)

    if (role !== 'all') {
      query = query.eq('simple_role', role)
    }

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    query = query.order('created_at', { ascending: false })

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error, count } = await query

    if (error) {
      console.error('[Company Users API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.max(1, Math.ceil((count || 0) / limit))

    const response: CompanyUsersResponse = {
      users: (users || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.simple_role || u.role || 'user',
        department: u.department || undefined,
        is_active: u.is_active ?? false,
        last_login_at: u.last_login || undefined,
        created_at: u.created_at,
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

    console.error('Error in GET /api/admin/companies/[id]/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
