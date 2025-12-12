import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// 모든 티켓 조회 (어드민용)
export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const companyId = searchParams.get('company_id')
    const assignedTo = searchParams.get('assigned_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    // 티켓 목록 조회
    let query = supabase
      .from('support_tickets')
      .select(
        `
        *,
        company:companies(id, name, business_number),
        created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
        assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name),
        messages:support_ticket_messages(count)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (assignedTo) {
      query = query.eq('assigned_admin_id', assignedTo)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Admin tickets query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin support tickets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
