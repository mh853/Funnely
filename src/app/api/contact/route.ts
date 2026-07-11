import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// public_inquiries.inquiry_type CHECK 제약은 general/sales/technical/billing만 허용한다.
// 컨택폼의 문의 유형(feature_request/bug)은 이 중 하나로 매핑한다.
const CATEGORY_TO_INQUIRY_TYPE: Record<string, string> = {
  technical: 'technical',
  billing: 'billing',
  feature_request: 'general',
  bug: 'technical',
  general: 'general',
}

// Rate limiting simple implementation (in production, use Redis or similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5 // max requests
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { companyName, fullName, email, phone, category, subject, description } = body

    // Validation
    if (!companyName || !fullName || !email || !subject || !description) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Category validation
    const validCategories = ['technical', 'billing', 'feature_request', 'bug', 'general']
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: '올바른 문의 유형을 선택해주세요.' },
        { status: 400 }
      )
    }

    // 길이 제한이 없어 임의로 매우 긴 문자열을 그대로 저장할 수 있었다.
    if (companyName.length > 200 || fullName.length > 100 || subject.length > 200 || description.length > 5000) {
      return NextResponse.json(
        { error: '입력 내용이 너무 깁니다.' },
        { status: 400 }
      )
    }

    // /contact 폼은 원래 companies에 존재하지 않는 컬럼(industry/employee_count/status)에
    // insert를 시도하며 "게스트 회사 + support_ticket"을 만들고 있었는데, 이는 어드민이
    // 실제로 보는 "홈페이지 문의" 화면(public_inquiries 테이블)과 완전히 다른 경로였다.
    // 사이트 다른 곳(헤더/요금제/FAQ)의 문의 모달이 쓰는 것과 동일하게 public_inquiries에
    // 저장해 어드민 "홈페이지 문의" 화면에 실제로 노출되도록 한다.
    const supabase = createAdminClient()

    const { data: inquiry, error: inquiryError } = await supabase
      .from('public_inquiries')
      .insert({
        inquiry_type: CATEGORY_TO_INQUIRY_TYPE[category] || 'general',
        name: fullName,
        email,
        phone: phone || null,
        company: companyName,
        subject,
        message: description,
      })
      .select('id')
      .single()

    if (inquiryError || !inquiry) {
      console.error('Error creating public inquiry:', inquiryError)
      return NextResponse.json(
        { error: '문의 등록 중 오류가 발생했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email to customer
    // TODO: Send notification email to admin team

    return NextResponse.json(
      {
        success: true,
        inquiryId: inquiry.id,
        message: '문의가 성공적으로 접수되었습니다. 영업일 기준 24시간 내에 답변드리겠습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
