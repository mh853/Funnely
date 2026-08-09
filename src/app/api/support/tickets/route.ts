import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']
const VALID_CATEGORIES = ['technical', 'billing', 'feature_request', 'bug', 'general']

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

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
      .eq('messages.is_internal_note', false)
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

    if (!checkRateLimit(`support-ticket-create:${userData.company_id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    if (typeof body.subject !== 'string' || typeof body.description !== 'string' || !body.subject.trim() || !body.description.trim()) {
      return NextResponse.json({ error: '제목과 내용을 입력해주세요.' }, { status: 400 })
    }

    if (body.subject.length > 200 || body.description.length > 5000) {
      return NextResponse.json({ error: '입력 내용이 너무 깁니다.' }, { status: 400 })
    }

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: '올바른 우선순위를 선택해주세요.' }, { status: 400 })
    }

    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: '올바른 카테고리를 선택해주세요.' }, { status: 400 })
    }

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
