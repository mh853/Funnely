import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/support/tickets/[id]/reply
 * 티켓의 공식 답변 조회 (일반 사용자용)
 */
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

    // 답변 조회 (RLS 정책에 의해 자동으로 권한 확인)
    const { data: reply, error: replyError } = await supabase
      .from('support_ticket_replies')
      .select(
        `
        *,
        reply_by:users!support_ticket_replies_reply_by_user_id_fkey(id, full_name)
      `
      )
      .eq('ticket_id', params.id)
      .maybeSingle()

    if (replyError) {
      console.error('Reply fetch error:', replyError)
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reply: reply || null,
    })
  } catch (error) {
    console.error('Reply API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
