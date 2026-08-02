import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendTicketCustomerReplyNotificationEmail } from '@/lib/email/send-ticket-customer-reply-notification'

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

    // 관리자 알림 - 고객이 후속 메시지를 남겨도 알 방법이 전혀 없어(admin 목록도
    // created_at 정렬이라 활동이 있어도 위로 안 올라옴) 관리자가 매번 직접 목록을
    // 뒤져야 했다(67차 QA 확인). 담당관리자(assigned_admin_id)가 있으면 그에게,
    // 없으면 super admin 전원에게 이메일로 알린다. 다른 회사 소속일 수 있는
    // 관리자 이메일 조회+발송은 실패해도 메시지 작성 자체는 이미 성공했으므로
    // 응답을 막지 않는다(best-effort, non-critical) - 단, serverless 환경에서
    // 응답 반환 후 백그라운드 프로미스가 끊길 수 있어 await로 완료까지 기다린다.
    try {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: ticketDetail } = await serviceClient
        .from('support_tickets')
        .select('subject, assigned_admin_id, company:companies(name)')
        .eq('id', params.id)
        .maybeSingle()

      if (ticketDetail) {
        let recipientEmails: string[] = []
        if (ticketDetail.assigned_admin_id) {
          const { data: assignedAdmin } = await serviceClient
            .from('users')
            .select('email')
            .eq('id', ticketDetail.assigned_admin_id)
            .maybeSingle()
          if (assignedAdmin?.email) recipientEmails = [assignedAdmin.email]
        }
        if (recipientEmails.length === 0) {
          const { data: superAdmins } = await serviceClient
            .from('users')
            .select('email')
            .eq('is_super_admin', true)
          recipientEmails = (superAdmins || []).map((a) => a.email).filter(Boolean)
        }

        if (recipientEmails.length > 0) {
          const adminUrl = process.env.NEXT_PUBLIC_DOMAIN
            ? `${process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '')}/admin/support/${params.id}`
            : `https://funnely.co.kr/admin/support/${params.id}`

          await sendTicketCustomerReplyNotificationEmail({
            recipientEmails,
            companyName: (ticketDetail.company as unknown as { name: string } | null)?.name || '고객사',
            ticketSubject: ticketDetail.subject,
            messageContent: body.message,
            adminUrl,
          })
        }
      }
    } catch (notifyError) {
      console.error('[Support Message API] 관리자 알림 이메일 발송 실패:', notifyError)
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
