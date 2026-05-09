import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { fullName } = body

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: '이름을 2자 이상 입력해주세요.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
      .from('users')
      .select('email')
      .eq('full_name', fullName.trim())
      .eq('is_active', true)
      .limit(5)

    if (error) {
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ maskedEmails: [] })
    }

    const maskedEmails = users.map((u) => maskEmail(u.email))

    return NextResponse.json({ maskedEmails })
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }
}
