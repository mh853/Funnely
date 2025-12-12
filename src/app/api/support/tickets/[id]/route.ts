import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 티켓 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 티켓 상세 정보 조회
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(
        `
        *,
        company:companies(id, name),
        created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
        assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name)
      `
      )
      .eq('id', params.id)
      .single()

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // 메시지 조회 (내부 노트 제외)
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select(
        `
        *,
        user:users(id, full_name, is_super_admin)
      `
      )
      .eq('ticket_id', params.id)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      )
    }

    // 상태 변경 이력 조회
    const { data: statusHistory, error: historyError } = await supabase
      .from('support_ticket_status_history')
      .select(
        `
        *,
        changed_by:users(id, full_name)
      `
      )
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false })

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 })
    }

    return NextResponse.json({
      ticket,
      messages: messages || [],
      statusHistory: statusHistory || [],
    })
  } catch (error) {
    console.error('Ticket detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
