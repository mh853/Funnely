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
    .select('id, status, billing_key, customer_key, card_info, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 결제 실패 시 되돌릴 원래 상태. trial 사용자뿐 아니라 past_due/cancelled/expired
  // 사용자도 기존 빌링키로 이 API를 타므로, 무조건 'trial'로 롤백하면 해지된 사용자가
  // 실패한 결제 시도만으로 다시 체험 상태(=무료 이용 가능)가 되어버린다.
  const rollbackStatus = currentSub.status

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
  // billing_key만 복사하고 customer_key/card_info를 빠뜨리면 결제는 되지만(빌링키는 있음)
  // 카드 정보 UI에는 "등록된 카드 없음"으로 보이는 불일치가 생기므로 세 값을 함께 복사한다.
  let billingKey: string | null = currentSub.billing_key
  let customerKey: string | null = currentSub.customer_key
  let cardInfo: unknown = currentSub.card_info
  if (!billingKey && billingKeySubscriptionId) {
    const { data: sourceSubData } = await svc
      .from('company_subscriptions')
      .select('billing_key, customer_key, card_info')
      .eq('id', billingKeySubscriptionId)
      .eq('company_id', currentSub.company_id)
      .maybeSingle()
    billingKey = sourceSubData?.billing_key ?? null
    customerKey = sourceSubData?.customer_key ?? null
    cardInfo = sourceSubData?.card_info ?? null
  }

  if (!billingKey) {
    return NextResponse.json({ error: '등록된 카드 정보가 없습니다.' }, { status: 400 })
  }

  // 구독 업데이트: 빌링키 설정 + 플랜/주기 반영 + 상태를 active로 전환
  // toss-billing-payment 에지 함수가 trial 상태를 찾지 못하는 문제 해결
  const updateData: Record<string, unknown> = {
    billing_key: billingKey,
    customer_key: customerKey,
    card_info: cardInfo,
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
  try {
    const payRes = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    })

    if (!payRes.ok) {
      // 결제 실패 시 원래 상태로 롤백
      await svc
        .from('company_subscriptions')
        .update({ status: rollbackStatus })
        .eq('id', subscriptionId)

      // 에지 함수가 JSON이 아닌 응답(게이트웨이 502/504 등)을 줄 수도 있으므로
      // 파싱 실패가 아래 catch로 새어나가 중복 롤백을 유발하지 않도록 막는다.
      let errorMessage = '결제에 실패했습니다.'
      try {
        const err = await payRes.json()
        if (err?.error) errorMessage = err.error
      } catch {
        // 응답 본문을 읽지 못해도 기본 메시지로 진행
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (fetchError) {
    // fetch 자체가 실패한 경우(네트워크 오류, 타임아웃 등): best-effort로 원래 상태 롤백
    try {
      await svc
        .from('company_subscriptions')
        .update({ status: rollbackStatus })
        .eq('id', subscriptionId)
    } catch (rollbackError) {
      // 롤백 실패가 원래 오류를 가리지 않도록 무시
    }
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
