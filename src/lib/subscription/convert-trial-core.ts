// 체험 구독을 유료 구독으로 전환하는 핵심 로직 - 사용자가 대시보드에서 직접 누르는
// /api/subscription/convert-trial(convert-trial/route.ts)와, 체험이 자동으로 만료됐을 때
// 서버가 대신 호출하는 자동전환 경로(daily-tasks 크론, 만료 페이지의 lazy 전환)가 공유한다.
// 인증/권한 확인은 각 호출부의 책임이다 - 이 함수는 이미 전환이 허용된 것으로 가정한다.
import { createServiceClient } from '@/lib/supabase/server'

export interface ConvertTrialParams {
  subscriptionId: string
  // 명시적으로 다른 플랜으로 전환할 때만 지정 (예: 사용자가 대시보드에서 직접 플랜을
  // 골라 "지금 전환"). 생략하면 구독에 이미 저장된 pending_plan_id를 결제 엣지 함수가
  // 스스로 읽어 적용한다 - 체험 시작 시 예약해둔 플랜으로 자동전환할 때 쓰는 경로다.
  planId?: string | null
  billingCycle?: string | null
  billingKeySubscriptionId?: string | null
  // toss-billing-payment 에지 함수 호출에 쓸 Authorization 헤더. 사용자 트리거 경로는
  // 로그인 세션 토큰(`Bearer ${session.access_token}`)을, 서버 트리거 경로(크론 등)는
  // 서비스 롤 키(`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`)를 전달한다.
  authHeader: string
}

export type ConvertTrialResult = { ok: true } | { ok: false; error: string; status: number }

export async function convertTrialSubscriptionCore(
  params: ConvertTrialParams
): Promise<ConvertTrialResult> {
  const { subscriptionId, planId, billingCycle, billingKeySubscriptionId, authHeader } = params
  const svc = createServiceClient() as any

  const { data: currentSub } = await svc
    .from('company_subscriptions')
    .select('id, status, billing_key, customer_key, card_info, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return { ok: false, error: '구독 정보를 찾을 수 없습니다.', status: 404 }
  }

  // 결제 실패 시 되돌릴 원래 상태. trial 사용자뿐 아니라 past_due/cancelled/expired
  // 사용자도 기존 빌링키로 이 경로를 타므로, 무조건 'trial'로 롤백하면 해지된 사용자가
  // 실패한 결제 시도만으로 다시 체험 상태(=무료 이용 가능)가 되어버린다.
  const rollbackStatus = currentSub.status

  // 빌링키 확인 — 다른 구독에서 복사 필요한 경우
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
    return { ok: false, error: '등록된 카드 정보가 없습니다.', status: 400 }
  }

  // 구독 업데이트: 빌링키 설정 + 플랜/주기 반영 + 상태를 active로 전환
  // toss-billing-payment 에지 함수가 trial 상태를 찾지 못하는 문제 해결
  const updateData: Record<string, unknown> = {
    billing_key: billingKey,
    customer_key: customerKey,
    card_info: cardInfo,
    status: 'active',
  }
  if (rollbackStatus !== 'past_due') {
    updateData.grace_period_end = null
  }
  if (planId) {
    updateData.plan_id = planId
    updateData.pending_plan_id = null
    updateData.pending_billing_cycle = null
  }
  if (billingCycle) updateData.billing_cycle = billingCycle

  const { error: updateError } = await svc
    .from('company_subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)

  if (updateError) {
    return { ok: false, error: '구독 업데이트에 실패했습니다.', status: 500 }
  }

  // toss-billing-payment 에지 함수 호출
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    const payRes = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    })

    if (!payRes.ok) {
      const rollbackData: Record<string, unknown> = { status: rollbackStatus }
      if (rollbackStatus !== 'past_due') {
        rollbackData.grace_period_end = null
      }
      await svc.from('company_subscriptions').update(rollbackData).eq('id', subscriptionId)

      let errorMessage = '결제에 실패했습니다.'
      try {
        const err = await payRes.json()
        if (err?.error) errorMessage = err.error
      } catch {
        // 응답 본문을 읽지 못해도 기본 메시지로 진행
      }
      return { ok: false, error: errorMessage, status: 500 }
    }

    return { ok: true }
  } catch (fetchError) {
    try {
      const rollbackData: Record<string, unknown> = { status: rollbackStatus }
      if (rollbackStatus !== 'past_due') {
        rollbackData.grace_period_end = null
      }
      await svc.from('company_subscriptions').update(rollbackData).eq('id', subscriptionId)
    } catch (rollbackError) {
      // 롤백 실패가 원래 오류를 가리지 않도록 무시
    }
    return { ok: false, error: '결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.', status: 500 }
  }
}
