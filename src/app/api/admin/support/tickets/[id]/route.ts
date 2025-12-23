import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/support/tickets/[id]
 * 특정 티켓 상세 정보 및 메시지 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 티켓 조회
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(
        `
        *,
        company:companies!support_tickets_company_id_fkey(id, name, business_number),
        created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email),
        assigned_admin:users!support_tickets_assigned_admin_id_fkey(id, full_name)
      `
      )
      .eq('id', params.id)
      .single()

    if (ticketError) {
      console.error('[Support Ticket Detail API] Error fetching ticket:', ticketError)
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select(
        `
        *,
        user:users!support_ticket_messages_user_id_fkey(id, full_name, email, is_super_admin)
      `
      )
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[Support Ticket Detail API] Error fetching messages:', messagesError)
    }

    return NextResponse.json({
      success: true,
      ticket,
      messages: messages || [],
    })
  } catch (error) {
    console.error('[Support Ticket Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/support/tickets/[id]
 * 티켓 상태, 우선순위, 담당자 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, priority, assigned_admin_id } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 업데이트할 필드 준비
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (status) updates.status = status
    if (priority) updates.priority = priority
    if (assigned_admin_id !== undefined) updates.assigned_admin_id = assigned_admin_id

    // 티켓 업데이트
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[Support Ticket Update API] Error updating ticket:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error('[Support Ticket Update API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
