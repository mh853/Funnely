import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/support/tickets/[id]/reply
 * 티켓의 공식 답변 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 권한 확인 (일반 사용자도 자신의 티켓 답변 조회 가능)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 답변 조회
    const { data: reply, error: replyError } = await supabase
      .from('support_ticket_replies')
      .select(
        `
        *,
        reply_by:users!support_ticket_replies_reply_by_user_id_fkey(id, full_name, email)
      `
      )
      .eq('ticket_id', params.id)
      .maybeSingle()

    if (replyError) {
      console.error('[Support Reply API] Error fetching reply:', replyError)
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reply: reply || null,
    })
  } catch (error) {
    console.error('[Support Reply API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/support/tickets/[id]/reply
 * 공식 답변 작성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Super admin 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reply_message } = body

    if (!reply_message || !reply_message.trim()) {
      return NextResponse.json(
        { error: 'Reply message is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 기존 답변이 있는지 확인
    const { data: existingReply } = await supabase
      .from('support_ticket_replies')
      .select('id')
      .eq('ticket_id', params.id)
      .maybeSingle()

    if (existingReply) {
      return NextResponse.json(
        { error: 'Reply already exists. Use PATCH to update.' },
        { status: 409 }
      )
    }

    // 답변 생성
    const { data: newReply, error: replyError } = await supabase
      .from('support_ticket_replies')
      .insert({
        ticket_id: params.id,
        reply_message: reply_message.trim(),
        reply_by_user_id: adminUser.user.id,
      })
      .select(
        `
        *,
        reply_by:users!support_ticket_replies_reply_by_user_id_fkey(id, full_name, email)
      `
      )
      .single()

    if (replyError) {
      console.error('[Support Reply API] Error creating reply:', replyError)
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reply: newReply,
    })
  } catch (error) {
    console.error('[Support Reply API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/support/tickets/[id]/reply
 * 공식 답변 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Super admin 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reply_message } = body

    if (!reply_message || !reply_message.trim()) {
      return NextResponse.json(
        { error: 'Reply message is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 답변 수정
    const { data: updatedReply, error: replyError } = await supabase
      .from('support_ticket_replies')
      .update({
        reply_message: reply_message.trim(),
      })
      .eq('ticket_id', params.id)
      .select(
        `
        *,
        reply_by:users!support_ticket_replies_reply_by_user_id_fkey(id, full_name, email)
      `
      )
      .single()

    if (replyError) {
      console.error('[Support Reply API] Error updating reply:', replyError)
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reply: updatedReply,
    })
  } catch (error) {
    console.error('[Support Reply API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/support/tickets/[id]/reply
 * 공식 답변 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Super admin 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 답변 삭제
    const { error: deleteError } = await supabase
      .from('support_ticket_replies')
      .delete()
      .eq('ticket_id', params.id)

    if (deleteError) {
      console.error('[Support Reply API] Error deleting reply:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[Support Reply API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
