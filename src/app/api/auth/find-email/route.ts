import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/encryption/phone'

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
    const body = await request.json()
    const { fullName, phone } = body

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: '이름을 2자 이상 입력해주세요.' },
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

    // 핸드폰 번호가 입력된 경우 번호로 필터링
    let filtered = users
    if (phone && typeof phone === 'string' && phone.trim().length > 0) {
      const normalizedPhone = normalizePhone(phone.trim())
      filtered = users.filter((u: any) => {
        if (!u.phone) return false
        return normalizePhone(u.phone) === normalizedPhone
      })
    }

    if (filtered.length === 0) {
      return NextResponse.json({ maskedEmails: [] })
    }

    const maskedEmails = filtered.map((u: any) => maskEmail(u.email))

    return NextResponse.json({ maskedEmails })
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
}
