// 클라이언트에서 /api/subscription/prepare-checkout 를 호출하는 얇은 래퍼 (구독 행 직접 쓰기 대체)

export type PrepareCheckoutResult = {
  subscriptionId: string
  wasNewlyCreated: boolean
  originalPlanId: string | null
  originalBillingCycle: string | null
  checkoutRequired: boolean
}

export async function prepareCheckout(params: {
  planId: string
  billingCycle: 'monthly' | 'yearly'
  subscriptionId?: string
}): Promise<PrepareCheckoutResult> {
  const res = await fetch('/api/subscription/prepare-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || '구독 정보 준비에 실패했습니다.')
  }
  return data as PrepareCheckoutResult
}
