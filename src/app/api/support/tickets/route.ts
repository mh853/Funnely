import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 티켓 목록 조회 (고객사용)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 현재 사용자 정보 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 company_id 가져오기
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 티켓 목록 조회
    let query = supabase
      .from('support_tickets')
      .select(
        `
        *,
        created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
        assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name),
        messages:support_ticket_messages(count)
      `,
        { count: 'exact' }
      )
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Tickets query error:', error)
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
    console.error('Support tickets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 새 티켓 생성 (고객사용)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()

    // 티켓 생성
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        company_id: userData.company_id,
        created_by_user_id: user.id,
        subject: body.subject,
        description: body.description,
        priority: body.priority || 'medium',
        category: body.category || 'technical',
        attachments: body.attachments || [],
        tags: body.tags || [],
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Ticket creation error:', ticketError)
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    // 상태 변경 이력 기록
    await supabase.from('support_ticket_status_history').insert({
      ticket_id: ticket.id,
      changed_by_user_id: user.id,
      old_status: null,
      new_status: 'open',
      notes: 'Ticket created',
    })

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Ticket creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
