import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { CompaniesListResponse } from '@/types/admin'

export async function GET(request: Request) {
  try {
    // 슈퍼 어드민 권한 확인
    await requireSuperAdmin()

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터 파싱
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const dateRange = searchParams.get('dateRange') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 기본 쿼리 시작
    let query = supabase
      .from('companies')
      .select(
        `
        id,
        name,
        slug,
        is_active,
        created_at,
        users!inner(
          id,
          full_name,
          email,
          role
        )
      `,
        { count: 'exact' }
      )

    // 활성 상태 필터
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // 가입일 범위 필터
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

    // 검색 (회사명 또는 담당자 이메일)
    if (search) {
      query = query.or(`name.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    // 정렬
    const validSortColumns = ['created_at', 'name']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, {
      ascending: sortOrder === 'asc',
    })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: companies, error, count } = await query

    if (error) {
      console.error('Companies fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 각 회사의 통계 데이터 가져오기
    const companiesWithStats = await Promise.all(
      (companies || []).map(async (company: any) => {
        // 사용자 수 조회
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // 리드 수 조회
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // 랜딩페이지 수 조회
        const { count: pagesCount } = await supabase
          .from('landing_pages')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // 관리자 사용자 찾기 (role = 'admin')
        const adminUser = company.users.find((u: any) => u.role === 'admin') || company.users[0]

        return {
          id: company.id,
          name: company.name,
          slug: company.slug,
          is_active: company.is_active,
          created_at: company.created_at,
          admin_user: {
            id: adminUser?.id || '',
            full_name: adminUser?.full_name || '',
            email: adminUser?.email || '',
          },
          stats: {
            total_users: usersCount || 0,
            total_leads: leadsCount || 0,
            landing_pages_count: pagesCount || 0,
          },
        }
      })
    )

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

    const response: CompaniesListResponse = {
      companies: companiesWithStats,
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
