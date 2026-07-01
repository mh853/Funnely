import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 메시지 추가
export async function POST(
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

    // 티켓 소유권 검증 (티켓 생성자만 메시지 추가 가능)
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('created_by_user_id')
      .eq('id', params.id)
      .maybeSingle()

    if (!ticket || ticket.created_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 메시지 추가
    const { data: message, error: messageError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: params.id,
        user_id: user.id,
        message: body.message,
        is_internal_note: false,
        attachments: body.attachments || [],
      })
      .select(
        `
        *,
        user:users(id, full_name, is_super_admin)
      `
      )
      .single()

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // 티켓 updated_at 업데이트
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
