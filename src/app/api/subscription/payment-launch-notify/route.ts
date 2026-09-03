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

  // upsert 자체는 신규/기존 여부를 알려주지 않으므로, 미리 존재 여부를 확인해둔다 -
  // 어드민 알림(노션 33번)은 같은 이메일로 재신청할 때마다 반복 발생하면 안 되고
  // 최초 신청 시 1번만 떠야 한다.
  const { data: existing } = await svc
    .from('payment_launch_notify_signups')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  const isNewSignup = !existing

  const { error } = await svc
    .from('payment_launch_notify_signups')
    .upsert({ email, company_id: profile?.company_id ?? null }, { onConflict: 'email', ignoreDuplicates: false })

  if (error) {
    console.error('payment_launch_notify_signups upsert error:', error)
    return NextResponse.json({ error: '신청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 어드민 알림(벨) - 기존엔 다음날 아침 요약메일로만 확인 가능했는데, 어드민 알림에서도
  // 바로 확인할 수 있어야 한다는 요청(노션 33번). notifications 조회가 user_id 기준이라
  // (company_id.eq&user_id.is.null 브로드캐스트를 지원하는 대시보드쪽과 달리) 슈퍼어드민
  // 전원에게 개별 row를 만들어야 한다.
  if (isNewSignup) {
    const { data: superAdmins } = await svc.from('users').select('id').eq('is_super_admin', true)
    if (superAdmins && superAdmins.length > 0) {
      await svc.from('notifications').insert(
        superAdmins.map((admin: { id: string }) => ({
          user_id: admin.id,
          company_id: profile?.company_id ?? null,
          type: 'payment_launch_notify_signup',
          title: '결제 오픈 알림 신청',
          message: `${email}님이 결제 정식 오픈 알림을 신청했습니다.`,
          metadata: { email },
        }))
      )
    }
  }

  return NextResponse.json({ success: true })
}
