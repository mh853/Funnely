// 특정 플랜으로 전환할 때 실제로 청구될 가격을 미리 확인하는 API - 업그레이드
// 확인 모달이 항상 subscription_plans의 현재 카탈로그 가격만 보여주면, 과거에
// 그 플랜을 쓴 적 있어 가격이 이력(company_subscription_price_locks, 63차)에
// 그랜드파더링돼 있는 경우 모달에 뜬 예상 금액과 실제 청구액이 달라진다(65차 QA
// 확인). 이 이력 테이블은 서비스롤 전용이라(RLS 정책 없음) 클라이언트가 직접
// 조회할 수 없어, 세션 인증 + 소유권 확인을 거친 뒤 서비스 클라이언트로 대신
// 조회해준다.
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { pickCurrentSubscription } from '@/lib/subscription-current'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const planId = request.nextUrl.searchParams.get('planId')
  if (!planId) {
    return NextResponse.json({ error: 'planId가 필요합니다.' }, { status: 400 })
  }

  const svc = createServiceClient() as any

  const { data: profile } = await svc
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: candidateSubs } = await svc
    .from('company_subscriptions')
    .select('id, status, current_period_end, trial_end_date, cancelled_at')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const candidates: any[] = candidateSubs ?? []
  const subscription = pickCurrentSubscription(candidates)
  if (!subscription) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: plan } = await svc
    .from('subscription_plans')
    .select('price_monthly, price_yearly')
    .eq('id', planId)
    .maybeSingle()
  if (!plan) {
    return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 })
  }

  const { data: lock } = await svc
    .from('company_subscription_price_locks')
    .select('price_monthly, price_yearly')
    .eq('subscription_id', subscription.id)
    .eq('plan_id', planId)
    .maybeSingle()

  if (lock) {
    return NextResponse.json({
      price_monthly: lock.price_monthly,
      price_yearly: lock.price_yearly,
      isGrandfathered: true,
    })
  }

  return NextResponse.json({
    price_monthly: plan.price_monthly,
    price_yearly: plan.price_yearly,
    isGrandfathered: false,
  })
}
