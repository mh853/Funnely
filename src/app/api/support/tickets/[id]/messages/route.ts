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

    // 티켓 생성자만 허용하던 체크(2026-07-01 임시 보안패치, 당시 RLS가 완전개방이라
    // API가 유일한 방어선이었음)가, 이후 RLS 자체가 "같은 회사+본인 명의"로 정상적으로
    // 좁혀진 뒤에도 그대로 남아 같은 회사의 다른 팀원은 티켓을 보고도 답글을 못
    // 남기고 있었다. RLS와 동일한 범위(같은 회사)로 맞춘다.
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id')
      .eq('id', params.id)
      .maybeSingle()

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!ticket || !userProfile || ticket.company_id !== userProfile.company_id) {
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
