// toss-billing-auth 에지 함수 프록시: 인증 검증 후 에지 함수 호출
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 })

  const { authKey, customerKey, subscriptionId } = await request.json()
  if (!authKey || !customerKey || !subscriptionId) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  const svc = createServiceClient() as any

  const { data: currentSub } = await svc
    .from('company_subscriptions')
    .select('id, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사용자 권한 확인 - company_subscriptions RLS(company_subscriptions_admin, admin/owner만
  // 허용, manager 제외)와 서비스 롤 우회 경로의 인가 기준을 반드시 일치시켜야 한다.
  // company_id만 확인하면 marketing_staff 등 최하위 권한도 카드 등록/결제를 트리거할 수 있었다.
  const { data: profile } = await svc
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !profile ||
    profile.company_id !== currentSub.company_id ||
    (profile.simple_role !== 'admin' &&
      !['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(profile.role))
  ) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // toss-billing-auth 에지 함수 호출 (에지 함수는 status를 필터링하지 않으므로 임시 전환 불필요)
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const authRes = await fetch(`${baseUrl}/functions/v1/toss-billing-auth`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerKey, authKey, subscriptionId }),
  })

  if (!authRes.ok) {
    const err = await authRes.json()
    // toss-billing-auth 엣지함수(supabase/functions는 gitignore 대상이라 별도 배포 필요,
    // 이 레포에서 직접 수정 불가)가 "Toss API Error: {한글메시지}" 형태로 영문 접두사를
    // 붙여 그대로 던져, 사용자에게 영문/한글이 뒤섞인 문구가 노출됐다(81차 QA) - 접두사만
    // 제거해 보여준다.
    const rawMessage = err.error || '카드 등록에 실패했습니다.'
    const cleanMessage = rawMessage.replace(/^Toss API Error:\s*/i, '')
    return NextResponse.json(
      { error: cleanMessage },
      { status: 500 }
    )
  }

  const result = await authRes.json()
  return NextResponse.json(result)
}
