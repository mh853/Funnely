// 체험 구독을 유료 구독으로 전환하는 API (기존 빌링키 재사용)
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

  const { subscriptionId, planId, billingCycle, billingKeySubscriptionId } =
    await request.json()
  if (!subscriptionId)
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 400 })

  const svc = createServiceClient() as any

  // 현재 구독 확인
  const { data: currentSub } = await svc
    .from('company_subscriptions')
    .select('id, status, billing_key, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사용자 권한 확인
  const { data: profile } = await svc
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.company_id !== currentSub.company_id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // 빌링키 확인 — 다른 구독에서 복사 필요한 경우
  let billingKey: string | null = currentSub.billing_key
  if (!billingKey && billingKeySubscriptionId) {
    const { data: sourceSubData } = await svc
      .from('company_subscriptions')
      .select('billing_key')
      .eq('id', billingKeySubscriptionId)
      .eq('company_id', currentSub.company_id)
      .maybeSingle()
    billingKey = sourceSubData?.billing_key ?? null
  }

  if (!billingKey) {
    return NextResponse.json({ error: '등록된 카드 정보가 없습니다.' }, { status: 400 })
  }

  // 구독 업데이트: 빌링키 설정 + 플랜/주기 반영 + 상태를 active로 전환
  // toss-billing-payment 에지 함수가 trial 상태를 찾지 못하는 문제 해결
  const updateData: Record<string, unknown> = {
    billing_key: billingKey,
    status: 'active',
  }
  if (planId) updateData.plan_id = planId
  if (billingCycle) updateData.billing_cycle = billingCycle

  const { error: updateError } = await svc
    .from('company_subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)

  if (updateError) {
    return NextResponse.json({ error: '구독 업데이트에 실패했습니다.' }, { status: 500 })
  }

  // toss-billing-payment 에지 함수 호출
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const payRes = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscriptionId }),
  })

  if (!payRes.ok) {
    // 결제 실패 시 trial 상태로 롤백
    await svc
      .from('company_subscriptions')
      .update({ status: 'trial' })
      .eq('id', subscriptionId)

    const err = await payRes.json()
    return NextResponse.json(
      { error: err.error || '결제에 실패했습니다.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
