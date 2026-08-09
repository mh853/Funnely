// 계정(회사) 탈퇴 시 Toss에 등록된 빌링키(카드)를 실제로 해지하는 헬퍼.
// 이전엔 DB의 company_subscriptions.billing_key만 상태를 바꿀 뿐 Toss 쪽 빌링키는
// 한 번도 해지 요청을 보내지 않아, 탈퇴 후에도 결제 가능한 빌링키가 Toss 서버에
// 무기한 살아있었다(83차 QA). best-effort로 처리 - 실패해도 계정탈퇴라는 메인
// 동작은 막지 않는다.
//
// 주의: 이 함수는 계정(회사) "완전 탈퇴" 경로에만 써야 한다. 구독 "취소"
// (api/subscription/cancel)는 기간종료형(cancel_at_period_end)이라 같은 기간
// 안에 재개(reactivate) 가능한데, reactivate/route.ts는 billing_key를 그대로
// 재사용한다고 가정하고 있어(80차 QA 확인) 취소 시점에 빌링키를 해지하면
// 재개 시 결제수단이 조용히 무효화되는 새로운 회귀가 생긴다 - 계정탈퇴처럼
// 되돌릴 방법이 없는 경로에서만 안전하다.
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || ''

export async function revokeBillingKey(billingKey: string): Promise<void> {
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`,
      },
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('[revokeBillingKey] Toss 빌링키 해지 실패:', errorData)
    }
  } catch (error) {
    console.error('[revokeBillingKey] Toss 빌링키 해지 요청 중 오류:', error)
  }
}
