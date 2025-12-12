import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// 어드민 메시지/내부 노트 추가
export async function POST(
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

    // 메시지 추가 (내부 노트 옵션 포함)
    const { data: message, error: messageError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: params.id,
        user_id: user.id,
        message: body.message,
        is_internal_note: body.isInternalNote || false,
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
    console.error('Admin message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
