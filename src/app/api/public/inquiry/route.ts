import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// /api/contact와 동일한 in-memory rate limit 패턴(프로덕션에서는 Redis 등으로 대체 필요)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW = 60 * 60 * 1000 // 1시간

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
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, phone, company, inquiry_type, subject, message } = body

    if (!name || !email || !subject || !message || !inquiry_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // public_inquiries.inquiry_type CHECK 제약: general/sales/technical/billing만 허용
    const validInquiryTypes = ['general', 'sales', 'technical', 'billing']
    if (!validInquiryTypes.includes(inquiry_type)) {
      return NextResponse.json(
        { error: 'Invalid inquiry type' },
        { status: 400 }
      )
    }

    // 길이 제한이 없어 임의로 매우 긴 문자열을 그대로 저장할 수 있었다.
    if (
      name.length > 100 ||
      subject.length > 200 ||
      message.length > 5000 ||
      (company && company.length > 200)
    ) {
      return NextResponse.json(
        { error: 'Input too long' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('public_inquiries')
      .insert({
        inquiry_type,
        name,
        email,
        phone: phone || null,
        company: company || null,
        subject,
        message,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Public inquiry insert error:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      inquiry_id: data.id,
    })
  } catch (error) {
    console.error('Public inquiry API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
