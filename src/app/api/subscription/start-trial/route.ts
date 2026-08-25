// 프로 플랜 7일 무료 체험 시작 API — 서비스 롤로 RLS 우회하여 안정적으로 처리
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { PLAN_SLUG_TO_NAME } from '@/lib/subscription/plan-slugs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, planId, billingCycle, companyId, pendingPlanSlug, pendingBillingCycle } = body

    if (!planId) {
      return NextResponse.json({ error: '플랜 정보가 누락되었습니다.' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient()

    // 소유권 확인: 서비스 롤로 RLS를 우회하므로, subscriptionId/companyId가 호출자
    // 소속 회사의 것인지 애플리케이션 레벨에서 직접 검증해야 한다. 이 검증이 없으면
    // 로그인만 되어 있으면 body에 임의의 다른 회사 id를 넣어 그 회사의 구독을
    // trial로 조작할 수 있다. 회사 소속만으로는 부족 - company_subscriptions RLS
    // (admin/owner만 허용, manager 제외)와 일치하는 역할 검증도 함께 해야 한다.
    const { data: profile } = await serviceSupabase
      .from('users')
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .maybeSingle() as { data: { company_id: string; role: string | null; simple_role: string | null } | null }

    if (!profile || !isAdminOrLegacyOwner(profile)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 무료체험 중복 사용 방지: has_used_trial이 true인 회사는 다시 trial 상태로
    // 전환할 수 없다. 이 체크가 없으면 구독 취소 후 재신청을 반복해 무료체험을
    // 무한정 재사용할 수 있다.
    if (subscriptionId) {
      const { data: currentSub } = await serviceSupabase
        .from('company_subscriptions')
        .select('company_id, has_used_trial')
        .eq('id', subscriptionId)
        .maybeSingle() as { data: { company_id: string; has_used_trial: boolean } | null }

      if (!currentSub || currentSub.company_id !== profile.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }

      if (currentSub.has_used_trial) {
        return NextResponse.json({ error: '이미 무료체험을 사용하셨습니다.' }, { status: 400 })
      }
    } else if (companyId) {
      if (companyId !== profile.company_id) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }

      const { data: existingSubs } = await serviceSupabase
        .from('company_subscriptions')
        .select('has_used_trial')
        .eq('company_id', companyId) as { data: { has_used_trial: boolean }[] | null }

      if (existingSubs?.some((s) => s.has_used_trial)) {
        return NextResponse.json({ error: '이미 무료체험을 사용하셨습니다.' }, { status: 400 })
      }
    }

    // 서비스 롤로 플랜 확인
    const { data: plan } = await serviceSupabase
      .from('subscription_plans')
      .select('id, name')
      .eq('id', planId)
      .single() as { data: { id: string; name: string } | null; error: any }

    if (!plan || (plan as any).name !== '프로') {
      return NextResponse.json({ error: '프로 플랜만 무료 체험이 가능합니다.' }, { status: 400 })
    }

    // 신규가입 시 프로가 아닌 다른 요금제를 고르고도 "일단 프로 체험"을 선택한 경우,
    // 체험이 끝나면 자동으로 원래 고른 요금제로 전환되도록 pending_plan_id에 저장해둔다
    // (기존엔 "예약된 다운그레이드" 전용이었던 필드를 재사용 - toss-billing-payment 에지
    // 함수가 결제 시점에 이 값을 읽어 실제 청구 대상을 결정한다). 'pro'거나 알 수 없는
    // slug면 저장하지 않는다 - 프로 그대로 유지되는 게 기본 동작이므로 별도 예약이 필요 없다.
    let pendingPlanId: string | null = null
    if (typeof pendingPlanSlug === 'string' && pendingPlanSlug !== 'pro' && PLAN_SLUG_TO_NAME[pendingPlanSlug]) {
      const { data: pendingPlan } = await serviceSupabase
        .from('subscription_plans')
        .select('id')
        .eq('name', PLAN_SLUG_TO_NAME[pendingPlanSlug])
        .eq('is_active', true)
        .limit(1)
        .single() as { data: { id: string } | null }
      pendingPlanId = pendingPlan?.id ?? null
    }
    const pendingFields = pendingPlanId
      ? {
          pending_plan_id: pendingPlanId,
          pending_billing_cycle: pendingBillingCycle === 'yearly' ? 'yearly' : 'monthly',
        }
      : {}

    const now = new Date()
    const trialEndDate = new Date(now)
    trialEndDate.setDate(trialEndDate.getDate() + 7)

    const svc = serviceSupabase as any
    let resultSubscriptionId: string = subscriptionId ?? ''

    if (subscriptionId) {
      // 기존 구독 업데이트
      const { error } = await svc
        .from('company_subscriptions')
        .update({
          plan_id: planId,
          billing_cycle: billingCycle || 'monthly',
          status: 'trial',
          current_period_start: now.toISOString(),
          current_period_end: null,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          has_used_trial: true,
          ...pendingFields,
        })
        .eq('id', subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (companyId) {
      // 새 구독 생성
      const { data: inserted, error } = await svc
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: planId,
          status: 'trial',
          billing_cycle: billingCycle || 'monthly',
          current_period_start: now.toISOString(),
          current_period_end: null,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          has_used_trial: true,
          ...pendingFields,
        })
        .select('id')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      resultSubscriptionId = inserted.id
    } else {
      return NextResponse.json({ error: '구독 정보가 누락되었습니다.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, subscriptionId: resultSubscriptionId })
  } catch (error: any) {
    console.error('[Start Trial] 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
