// 결제수단 등록(Toss 카드등록 팝업) 실패/취소 시 낙관적으로 먼저 커밋했던
// plan_id/billing_cycle을 원상복구하는 API (59차 QA: NewSubscriptionClient.tsx가
// requestBillingAuth 호출 전에 plan_id를 먼저 써버려서, 사용자가 팝업을 닫거나
// 카드가 거절되면 결제 이력 없이 유료 플랜만 영구 활성화되는 문제가 있었음)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSubscriptionAdmin } from '@/lib/subscription/require-subscription-admin'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { subscriptionId, originalPlanId, originalBillingCycle, wasNewlyCreated } =
    await request.json()
  if (!subscriptionId) {
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 400 })
  }

  // 서비스 롤로 쓴다 - 예전엔 세션 클라이언트 + RLS(company_subscriptions_admin)가
  // 인가를 대신했지만, 그 정책은 클라이언트가 구독 행을 임의로 고칠 수 있는 구멍이라
  // 제거했다(노션 36번). 이제 역할 검사 + 아래 소유권/결제여부 검사가 인가 장치다.
  const actor = await requireSubscriptionAdmin(user.id)
  if ('error' in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status })
  }
  const { db, companyId } = actor

  const { data: sub } = await db
    .from('company_subscriptions')
    .select('id, company_id, billing_key, current_period_end')
    .eq('id', subscriptionId)
    .maybeSingle()
  if (!sub || sub.company_id !== companyId) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // 되돌리기는 "이번 시도가 결제로 이어지지 않은" 행에만 허용한다. prepare-checkout은
  // 선커밋 시 current_period_end=now 로 두고, 결제가 성공하면 엣지함수가 미래 시각으로
  // 덮어쓴다. 결제가 끝난 뒤 failUrl을 다시 열거나(브라우저 기록/재전송) 값을 바꿔
  // 호출해도 이미 결제된 행의 플랜을 바꾸거나 행을 지울 수 없어야 한다 - originalPlanId
  // 등은 클라이언트가 보내는 값이라 그 자체는 신뢰하지 않는다.
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null
  const isUnpaid = periodEnd !== null && periodEnd <= Date.now()
  if (!isUnpaid) {
    return NextResponse.json(
      { error: '이미 결제가 완료된 구독은 되돌릴 수 없습니다.' },
      { status: 409 }
    )
  }

  if (wasNewlyCreated) {
    // 원래 구독 행 자체가 없었는데 이번 시도로 새로 만들어진 경우 - 삭제해 원상복구.
    // 카드가 이미 등록된 행(Step1 성공 후)은 지우지 않는다 - 크론이 만료 처리한다.
    if (sub.billing_key) {
      return NextResponse.json({ error: '카드가 등록된 구독은 삭제할 수 없습니다.' }, { status: 409 })
    }
    const { data: deletedRows, error } = await db
      .from('company_subscriptions')
      .delete()
      .eq('id', sub.id)
      .select('id')

    if (error || !deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: '되돌리기에 실패했습니다.' }, { status: 500 })
    }
  } else {
    if (!originalPlanId) {
      return NextResponse.json({ error: 'originalPlanId가 필요합니다.' }, { status: 400 })
    }
    // 카탈로그에 실제로 있는 플랜인지만 본다(is_active는 보지 않는다 - 판매 중단된
    // 옛 플랜으로 되돌리는 경우도 있다). 위 isUnpaid 가드로 어떤 플랜을 넣든 이용
    // 권한이 생기지는 않는다.
    const { data: plan } = await db
      .from('subscription_plans')
      .select('id')
      .eq('id', originalPlanId)
      .maybeSingle()
    if (!plan) {
      return NextResponse.json({ error: '되돌릴 플랜 정보가 올바르지 않습니다.' }, { status: 400 })
    }
    const cycle = originalBillingCycle === 'yearly' ? 'yearly' : 'monthly'

    const { data: updatedRows, error } = await db
      .from('company_subscriptions')
      .update({ plan_id: plan.id, billing_cycle: cycle })
      .eq('id', sub.id)
      .select('id')

    if (error || !updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: '되돌리기에 실패했습니다.' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
