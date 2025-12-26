import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const supabase = await createClient()

    // Find or create a guest company for public inquiries
    // We'll use a special pattern for guest companies
    const guestCompanyName = `[문의] ${companyName}`

    let companyId: string

    // Check if this guest company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', guestCompanyName)
      .single()

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      // Create a new guest company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: guestCompanyName,
          business_number: `GUEST-${Date.now()}`, // Unique identifier for guest
          industry: 'inquiry',
          employee_count: '1-10',
          status: 'active',
        })
        .select('id')
        .single()

      if (companyError || !newCompany) {
        console.error('Error creating guest company:', companyError)
        return NextResponse.json(
          { error: '문의 처리 중 오류가 발생했습니다. 다시 시도해주세요.' },
          { status: 500 }
        )
      }

      companyId = newCompany.id
    }

    // Create support ticket with contact information embedded
    const contactInfo = {
      fullName,
      email,
      phone: phone || null,
      companyName,
    }

    const fullDescription = `
[문의자 정보]
- 이름: ${fullName}
- 이메일: ${email}
- 전화번호: ${phone || '미입력'}
- 회사명: ${companyName}

[문의 내용]
${description}
    `.trim()

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        company_id: companyId,
        created_by_user_id: null, // NULL for public inquiries
        subject,
        description: fullDescription,
        status: 'open',
        priority: 'medium',
        category: category || 'general',
        tags: ['public_inquiry', 'website_contact'],
      })
      .select('id')
      .single()

    if (ticketError || !ticket) {
      console.error('Error creating support ticket:', ticketError)
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
        ticketId: ticket.id,
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
