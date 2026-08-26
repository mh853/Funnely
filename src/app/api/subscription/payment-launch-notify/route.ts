// 결제 정식 오픈 알림 신청 API (노션 31번 "홈페이지_결제_릴리즈 전 노티" 후속)
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { email } = await request.json()
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 })
  }

  const svc = createServiceClient() as any
  const { data: profile } = await svc.from('users').select('company_id').eq('id', user.id).maybeSingle()

  const { error } = await svc
    .from('payment_launch_notify_signups')
    .upsert({ email, company_id: profile?.company_id ?? null }, { onConflict: 'email', ignoreDuplicates: false })

  if (error) {
    console.error('payment_launch_notify_signups upsert error:', error)
    return NextResponse.json({ error: '신청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
