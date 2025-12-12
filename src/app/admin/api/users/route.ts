import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { UsersListResponse } from '@/types/admin'

export async function GET(request: Request) {
  try {
    // 슈퍼 어드민 권한 확인
    await requireSuperAdmin()

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터 파싱
    const search = searchParams.get('search') || ''
    const company_id = searchParams.get('company_id') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'
    const dateRange = searchParams.get('dateRange') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 기본 쿼리 시작
    let query = supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        companies!inner(
          id,
          name
        )
      `,
        { count: 'exact' }
      )

    // 회사 필터
    if (company_id && company_id !== 'all') {
      query = query.eq('company_id', company_id)
    }

    // 역할 필터
    if (role !== 'all') {
      query = query.eq('role', role)
    }

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

    // 검색 (이름, 이메일)
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    // 정렬
    const validSortColumns = ['created_at', 'last_login', 'full_name']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, {
      ascending: sortOrder === 'asc',
      nullsFirst: false,
    })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 각 사용자의 통계 데이터 가져오기
    const usersWithStats = await Promise.all(
      (users || []).map(async (user: any) => {
        // 리드 수 조회
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // 랜딩페이지 수 조회
        const { count: pagesCount } = await supabase
          .from('landing_pages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: null, // phone 컬럼이 users 테이블에 없음
          role: user.role,
          is_active: user.is_active,
          last_login_at: user.last_login, // 실제 컬럼명은 last_login
          created_at: user.created_at,
          company: {
            id: user.companies.id,
            name: user.companies.name,
          },
          stats: {
            total_leads: leadsCount || 0,
            total_landing_pages: pagesCount || 0,
          },
        }
      })
    )

    // 요약 통계 계산
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // 역할별 통계
    const { data: roleStats } = await supabase
      .from('users')
      .select('role')

    const byRole: Record<string, number> = {}
    roleStats?.forEach((u: any) => {
      byRole[u.role] = (byRole[u.role] || 0) + 1
    })

    // 회사별 통계
    const { data: companyStats } = await supabase
      .from('users')
      .select('company_id, companies!inner(name)')

    const companyMap = new Map<string, { name: string; count: number }>()
    companyStats?.forEach((u: any) => {
      const existing = companyMap.get(u.company_id)
      if (existing) {
        existing.count++
      } else {
        companyMap.set(u.company_id, {
          name: u.companies.name,
          count: 1,
        })
      }
    })

    const byCompany = Array.from(companyMap.entries()).map(
      ([company_id, { name, count }]) => ({
        company_id,
        company_name: name,
        count,
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

    const response: UsersListResponse = {
      users: usersWithStats,
      pagination,
      summary: {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        inactive_users: (totalUsers || 0) - (activeUsers || 0),
        by_role: byRole,
        by_company: byCompany,
      },
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
