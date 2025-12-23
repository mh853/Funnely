import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/support/tickets
 * 지원 티켓 조회 (필터링 및 페이지네이션 지원)
 */
export async function GET(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const companyId = searchParams.get('companyId')
    const search = searchParams.get('search')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '20'), 50)
    const offset = (page - 1) * perPage

    // 쿼리 빌드
    let query = supabase
      .from('support_tickets')
      .select(
        `
        *,
        company:companies!support_tickets_company_id_fkey(id, name, business_number),
        created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
        assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name),
        messages:support_ticket_messages(count)
      `,
        { count: 'exact' }
      )

    // 필터 적용
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (category) query = query.eq('category', category)
    if (companyId) query = query.eq('company_id', companyId)

    // 정렬
    query = query.order('created_at', { ascending: false })

    // 검색 구현 (제목과 내용만 검색)
    let filteredTickets: any[] = []
    let filteredCount = 0

    if (search && search.trim()) {
      // ILIKE 검색: 제목과 내용만 검색
      const searchTerm = `%${search.trim()}%`
      let searchQuery = supabase
        .from('support_tickets')
        .select('*', { count: 'exact' })

      if (status) searchQuery = searchQuery.eq('status', status)
      if (priority) searchQuery = searchQuery.eq('priority', priority)
      if (category) searchQuery = searchQuery.eq('category', category)
      if (companyId) searchQuery = searchQuery.eq('company_id', companyId)

      searchQuery = searchQuery.or(
        `subject.ilike.${searchTerm},description.ilike.${searchTerm}`
      )
      searchQuery = searchQuery.order('created_at', { ascending: false })

      const { data: allTickets, error: searchError, count: totalCount } = await searchQuery

      if (searchError) {
        console.error('[Support Tickets API] Search error:', searchError)
        return NextResponse.json({ error: searchError.message }, { status: 500 })
      }

      // JOIN 데이터 가져오기
      const ticketIds = (allTickets || []).map((t) => t.id)

      if (ticketIds.length > 0) {
        const { data: ticketsWithRelations, error: joinError } = await supabase
          .from('support_tickets')
          .select(
            `
            *,
            company:companies!support_tickets_company_id_fkey(id, name, business_number),
            created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
            assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name),
            messages:support_ticket_messages(count)
          `
          )
          .in('id', ticketIds)
          .order('created_at', { ascending: false })

        if (joinError) {
          console.error('[Support Tickets API] Join error:', joinError)
          return NextResponse.json({ error: joinError.message }, { status: 500 })
        }

        filteredTickets = ticketsWithRelations || []
        filteredCount = totalCount || 0

        // 페이지네이션 적용
        const start = offset
        const end = offset + perPage
        filteredTickets = filteredTickets.slice(start, end)
      } else {
        filteredTickets = []
        filteredCount = 0
      }
    } else {
      // 검색 없을 때: 일반 페이지네이션
      query = query.range(offset, offset + perPage - 1)
      const { data: tickets, error, count } = await query

      if (error) {
        console.error('[Support Tickets API] Error fetching tickets:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      filteredTickets = tickets || []
      filteredCount = count || 0
    }

    const totalPages = Math.ceil(filteredCount / perPage)

    return NextResponse.json({
      success: true,
      tickets: filteredTickets,
      pagination: {
        total: filteredCount,
        page,
        perPage,
        totalPages,
        hasMore: page < totalPages,
      },
      ...(search && {
        search: {
          query: search,
          resultsCount: filteredCount,
        },
      }),
    })
  } catch (error) {
    console.error('[Support Tickets API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
