// 결제수단 등록(Toss 카드등록 팝업) 실패/취소 시 낙관적으로 먼저 커밋했던
// plan_id/billing_cycle을 원상복구하는 API (59차 QA: NewSubscriptionClient.tsx가
// requestBillingAuth 호출 전에 plan_id를 먼저 써버려서, 사용자가 팝업을 닫거나
// 카드가 거절되면 결제 이력 없이 유료 플랜만 영구 활성화되는 문제가 있었음)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const db = supabase as any

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { subscriptionId, originalPlanId, originalBillingCycle, wasNewlyCreated } =
    await request.json()
  if (!subscriptionId) {
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 400 })
  }

  // 세션 스코프 클라이언트로 실행 - company_subscriptions_admin(RLS) 정책이
  // admin/owner가 아니면 쓰기 자체를 막으므로 별도 역할 검사가 필요 없다
  // (subscription/cancel/route.ts와 동일한 패턴).
  if (wasNewlyCreated) {
    // 원래 구독 행 자체가 없었는데 이번 시도로 새로 만들어진 경우 - 삭제해 원상복구
    const { data: deletedRows, error } = await db
      .from('company_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .select('id')

    if (error || !deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: '되돌리기에 실패했습니다.' }, { status: 500 })
    }
  } else {
    if (!originalPlanId) {
      return NextResponse.json({ error: 'originalPlanId가 필요합니다.' }, { status: 400 })
    }
    const { data: updatedRows, error } = await db
      .from('company_subscriptions')
      .update({ plan_id: originalPlanId, billing_cycle: originalBillingCycle })
      .eq('id', subscriptionId)
      .select('id')

    if (error || !updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: '되돌리기에 실패했습니다.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
