// 결제(카드등록) 직전에 구독 행을 서버에서 준비하는 API - 클라이언트가 company_subscriptions를 직접 쓰지 않도록 서버 검증 경로로 통일 (노션 36번)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSubscriptionAdmin } from '@/lib/subscription/require-subscription-admin'

/**
 * POST /api/subscription/prepare-checkout
 * body: { planId: string, billingCycle?: 'monthly' | 'yearly', subscriptionId?: string }
 *
 * 기존에는 NewSubscriptionClient/PlanSetupClient가 세션 클라이언트로 company_subscriptions에
 * plan_id/status/current_period_end를 직접 썼다(RLS가 owner/admin에게 ALL을 허용). 그 권한은
 * 곧 "로그인만 하면 자기 회사 구독을 status=active·프리미엄·만료일 2099로 직접 UPDATE 가능"이라는
 * 뜻이라, 쓰기를 전부 서버(서비스 롤)로 옮기고 RLS에서 클라이언트 쓰기를 제거한다.
 *
 * 동작은 기존 클라이언트 코드와 동일하게 유지한다.
 * - 유료 플랜: plan_id/billing_cycle을 선커밋하고 current_period_end=now 로 둔다. 이어지는
 *   카드등록+즉시결제(billing-success)가 성공하면 엣지함수가 정상 주기로 덮어쓰고, 실패해
 *   방치되면 다음 크론이 만료 처리한다(61/73차 QA 안전망).
 * - 가격 0(Free) 플랜: 즉시 적용, 기간 없음(null).
 * - 회사/역할은 세션 프로필에서만 가져오고, 플랜은 DB 카탈로그로 검증한다.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { planId, billingCycle, subscriptionId } = body as {
    planId?: unknown
    billingCycle?: unknown
    subscriptionId?: unknown
  }
  if (typeof planId !== 'string' || !planId) {
    return NextResponse.json({ error: '플랜 정보가 누락되었습니다.' }, { status: 400 })
  }
  const cycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly'

  const actor = await requireSubscriptionAdmin(user.id)
  if ('error' in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status })
  }
  const { db: svc, companyId } = actor

  const { data: plan } = await svc
    .from('subscription_plans')
    .select('id, name, price_monthly, price_yearly, is_active')
    .eq('id', planId)
    .maybeSingle()
  if (!plan || !plan.is_active) {
    return NextResponse.json({ error: '선택할 수 없는 플랜입니다.' }, { status: 400 })
  }
  // 클라이언트(NewSubscriptionClient.handleSelectPlan)와 같은 기준: 월/연 모두 0원인
  // 플랜(커스터마이징 등 "별도 문의")은 이름과 무관하게 거부하고, Free는 이름이 'Free'인
  // 경우에만 인정한다. "가격 0 = Free"로 넓게 잡으면 0원짜리 협의 플랜이 기간 없는
  // active 구독으로 활성화되는 구멍이 된다.
  const monthly = Number(plan.price_monthly)
  const yearly = Number(plan.price_yearly ?? 0)
  if (monthly === 0 && yearly === 0 && plan.name !== 'Free') {
    return NextResponse.json({ error: '이 플랜은 별도 문의가 필요합니다.' }, { status: 400 })
  }
  const isFree = plan.name === 'Free' && monthly === 0
  const now = new Date().toISOString()

  if (typeof subscriptionId === 'string' && subscriptionId) {
    const { data: sub } = await svc
      .from('company_subscriptions')
      .select('id, company_id, status, billing_key, current_period_end, plan_id, billing_cycle')
      .eq('id', subscriptionId)
      .maybeSingle()
    if (!sub || sub.company_id !== companyId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!isFree) {
      // 체험 중 유료 전환은 billing-success의 trial_convert 경로(convert-trial API)가 담당한다.
      if (sub.status === 'trial') {
        return NextResponse.json({ error: '체험 중에는 이 경로로 결제할 수 없습니다.' }, { status: 400 })
      }
      // 카드가 등록된 이용 중 유료 구독의 플랜 변경은 업그레이드 모달/다운그레이드 예약
      // (toss-billing-payment 엣지함수)이 담당한다 - 여기서 current_period_end를 now로
      // 당기면 결제가 끝나기 전까지 이용이 끊긴다.
      if (
        sub.status === 'active' &&
        sub.billing_key &&
        sub.current_period_end &&
        new Date(sub.current_period_end) > new Date()
      ) {
        return NextResponse.json(
          { error: '이용 중인 유료 구독은 플랜 변경 메뉴에서 변경해주세요.' },
          { status: 400 }
        )
      }
    }

    const update = isFree
      ? {
          plan_id: plan.id,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: null,
          current_period_end: null,
          trial_start_date: null,
          trial_end_date: null,
          pending_plan_id: null,
          pending_billing_cycle: null,
        }
      : {
          plan_id: plan.id,
          billing_cycle: cycle,
          current_period_end: now,
          pending_plan_id: null,
          pending_billing_cycle: null,
        }

    const { error } = await svc.from('company_subscriptions').update(update).eq('id', sub.id)
    if (error) {
      console.error('[PrepareCheckout] 구독 업데이트 실패:', error)
      return NextResponse.json({ error: '구독 정보 준비에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      subscriptionId: sub.id,
      wasNewlyCreated: false,
      originalPlanId: sub.plan_id,
      originalBillingCycle: sub.billing_cycle,
      checkoutRequired: !isFree,
    })
  }

  // subscriptionId가 없으면 "구독 행이 아직 없는 회사"만 허용한다(plan-setup 페이지의
  // 재진입 가드와 동일 기준). 행이 이미 있는데 클라이언트가 못 본 것이면 중복 생성을 막는다.
  const { data: existing } = await svc
    .from('company_subscriptions')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: '이미 구독 정보가 있습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' },
      { status: 409 }
    )
  }

  const insert = isFree
    ? { company_id: companyId, plan_id: plan.id, status: 'active', billing_cycle: 'monthly' }
    : { company_id: companyId, plan_id: plan.id, status: 'active', billing_cycle: cycle, current_period_end: now }

  const { data: inserted, error } = await svc
    .from('company_subscriptions')
    .insert(insert)
    .select('id')
    .single()
  if (error || !inserted) {
    console.error('[PrepareCheckout] 구독 생성 실패:', error)
    return NextResponse.json({ error: '구독 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    subscriptionId: inserted.id,
    wasNewlyCreated: true,
    originalPlanId: null,
    originalBillingCycle: null,
    checkoutRequired: !isFree,
  })
}
