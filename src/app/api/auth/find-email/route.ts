import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/encryption/phone'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return '***@***'
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  const masked = local[0] + '*'.repeat(Math.min(local.length - 1, 3))
  return `${masked}@${domain}`
}

export async function POST(request: Request) {
  try {
    // 이름 고정 + 전화번호를 바꿔가며 계정 존재 여부와 마스킹된 이메일을 알아낼
    // 수 있는 브루트포스 경로라 요청 제한이 없으면 실질적인 개인정보 노출 위험이 있다.
    const ip = getClientIp(request)
    if (!checkRateLimit(`find-email:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { fullName, phone } = body

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: '이름을 2자 이상 입력해주세요.' },
        { status: 400 }
      )
    }

    // 화면(find-email 폼)은 전화번호를 필수로 강제하지만, API는 이 값이 없으면
    // 이름만으로 매칭된 계정의 마스킹 이메일을 그대로 반환했다 - 이름만 아는
    // 공격자가 "이름+전화번호 2단계 확인" 설계를 우회해 계정 존재여부·이메일
    // 일부를 알아낼 수 있었다(87차 QA). 서버에서도 필수로 강제한다.
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json(
        { error: '전화번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from('users')
      .select('email, phone')
      .eq('full_name', fullName.trim())
      .eq('is_active', true)
      .limit(5)

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ maskedEmails: [] })
    }

    const normalizedPhone = normalizePhone(phone.trim())
    const filtered = users.filter((u: any) => {
      if (!u.phone) return false
      return normalizePhone(u.phone) === normalizedPhone
    })

    if (filtered.length === 0) {
      return NextResponse.json({ maskedEmails: [] })
    }

    const maskedEmails = filtered.map((u: any) => maskEmail(u.email))

    return NextResponse.json({ maskedEmails })
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
}
