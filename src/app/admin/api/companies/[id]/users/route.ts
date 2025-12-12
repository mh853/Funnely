import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { CompanyUsersResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const companyId = params.id
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    // 기본 쿼리
    let query = supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        role,
        department,
        is_active,
        last_login_at,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)

    // 역할 필터
    if (role !== 'all') {
      query = query.eq('role', role)
    }

    // 상태 필터
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // 정렬 (최근 생성순)
    query = query.order('created_at', { ascending: false })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 페이지네이션 정보
    const totalPages = Math.ceil((count || 0) / limit)
    const pagination = {
      total: count || 0,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }

    const response: CompanyUsersResponse = {
      users: users || [],
      pagination,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
