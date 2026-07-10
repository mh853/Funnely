import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * POST /api/admin/support/tickets/[id]/messages
 * 티켓에 새 메시지 추가
 */
export async function POST(
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
    // 관리자 UI가 보내는 필드명은 isInternalNote(camelCase)이다. 이전에는 여기서
    // is_internal(snake_case)을 읽어 항상 undefined → false로 저장되어, 관리자가
    // "내부 메모"로 남긴 글이 실제로는 고객에게 그대로 노출되고 있었다.
    const { message, isInternalNote } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 메시지 생성
    const { data: newMessage, error: messageError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: params.id,
        user_id: adminUser.user.id,
        message: message.trim(),
        is_internal_note: isInternalNote || false,
      })
      .select(
        `
        *,
        sender:users!support_ticket_messages_user_id_fkey(id, full_name, email)
      `
      )
      .single()

    if (messageError) {
      console.error('[Support Message API] Error creating message:', messageError)
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // 티켓 업데이트 시간 갱신
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('[Support Message API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
