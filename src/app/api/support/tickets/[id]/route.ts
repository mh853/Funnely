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

    if (ticketError || !ticket) {
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

// 티켓 업데이트 (첨부파일 추가 등)
export async function PATCH(
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

    const body = await request.json()
    const { attachments } = body

    // 생성자 본인만 허용하던 체크가 support_tickets에 애초에 UPDATE RLS 정책이
    // 없었던 것과 겹쳐, 티켓 생성자여도 RLS가 조용히 0건 갱신으로 막고 있었다
    // (48차 QA로 라이브 재현 확인). 신규 마이그레이션으로 같은 회사 범위 UPDATE
    // 정책을 추가하고, 앱 체크도 메시지 라우트와 동일하게 같은 회사 기준으로 맞춘다.
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id')
      .eq('id', params.id)
      .single()

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!ticket || !userProfile || ticket.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 첨부파일 업데이트
    const { data: updatedTicket, error } = await supabase
      .from('support_tickets')
      .update({
        attachments: attachments || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Ticket update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!updatedTicket) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    console.error('Ticket update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
