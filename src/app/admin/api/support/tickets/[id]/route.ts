import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// 티켓 상세 조회 (어드민용 - 내부 노트 포함)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()

    // 티켓 상세 정보 조회
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(
        `
        *,
        company:companies(id, name, business_number, phone),
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

    // 모든 메시지 조회 (내부 노트 포함)
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select(
        `
        *,
        user:users(id, full_name, is_super_admin)
      `
      )
      .eq('ticket_id', params.id)
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
    console.error('Admin ticket detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 티켓 상태 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 현재 티켓 상태 가져오기
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('status')
      .eq('id', params.id)
      .single()

    // 티켓 업데이트
    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else if (body.status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
    }

    if (body.assigned_admin_id !== undefined) {
      updateData.assigned_admin_id = body.assigned_admin_id
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority
    }

    const { data: ticket, error: updateError } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 상태 변경 시 이력 기록
    if (body.status && currentTicket) {
      await supabase.from('support_ticket_status_history').insert({
        ticket_id: params.id,
        changed_by_user_id: user.id,
        old_status: currentTicket.status,
        new_status: body.status,
        notes: body.notes || '',
      })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Ticket update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
