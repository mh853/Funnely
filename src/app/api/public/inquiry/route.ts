import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 공개 문의 제출 (로그인 불필요)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { name, email, phone, company, inquiry_type, subject, message } = body

    // 입력 검증
    if (!name || !email || !subject || !message || !inquiry_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 공개 문의를 support_tickets 테이블에 저장
    // company_id는 null (비로그인 사용자)
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        company_id: null, // 비로그인 사용자
        created_by_user_id: null, // 비로그인 사용자
        subject: subject,
        description: message,
        priority: inquiry_type === 'sales' ? 'high' : 'medium', // 영업 문의는 높은 우선순위
        category: inquiry_type, // 'general', 'sales', 'technical', 'billing' 등
        status: 'open',
        metadata: {
          is_public_inquiry: true,
          contact_name: name,
          contact_email: email,
          contact_phone: phone || null,
          contact_company: company || null,
        },
        tags: [inquiry_type, 'public_inquiry'],
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Public inquiry creation error:', ticketError)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    // 상태 변경 이력 기록
    await supabase.from('support_ticket_status_history').insert({
      ticket_id: ticket.id,
      changed_by_user_id: null,
      old_status: null,
      new_status: 'open',
      notes: `Public inquiry from ${name} (${email})`,
    })

    // 성공 응답
    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      message: 'Your inquiry has been submitted successfully',
    })
  } catch (error) {
    console.error('Public inquiry API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
