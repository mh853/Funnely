import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickCurrentSubscription } from '@/lib/subscription-current'
import { requireSubscriptionAdmin } from '@/lib/subscription/require-subscription-admin'

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 서비스 롤로 쓴다 - 예전엔 세션 클라이언트 + RLS(company_subscriptions_admin)가
  // owner/admin 이외의 쓰기를 막아줬지만, 그 정책은 클라이언트가 구독 행을 임의로
  // 고칠 수 있는 구멍이라 제거했다(노션 36번). 이제 아래 역할 검사가 유일한 인가 장치다.
  const actor = await requireSubscriptionAdmin(user.id)
  if ('error' in actor) {
    return NextResponse.json({ error: actor.error }, { status: actor.status })
  }
  const { db, companyId } = actor

  const { data: candidateSubs } = await db
    .from('company_subscriptions')
    .select('id, status, current_period_end, trial_end_date, cancelled_at, subscription_plans!plan_id(name, price_monthly)')
    .eq('company_id', companyId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(10)

  const candidates: any[] = candidateSubs ?? []
  const subscription = pickCurrentSubscription(candidates)

  if (!subscription) {
    return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 })
  }

  const plan = subscription.subscription_plans as { name: string; price_monthly: number }

  if (plan.name === 'Free' && plan.price_monthly === 0) {
    return NextResponse.json(
      { error: 'Free 플랜은 취소할 수 없습니다.' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  // 예약된 다운그레이드가 남아있으면 이후 결제(갱신/체험전환)가 취소된 구독의
  // 예전 예약 플랜 가격으로 청구되는 것을 막기 위해 함께 비운다.
  const { data: updatedRows, error: updateError } = await db
    .from('company_subscriptions')
    .update({ status: 'cancelled', cancelled_at: now, pending_plan_id: null, pending_billing_cycle: null })
    .eq('id', subscription.id)
    .select('id')

  if (updateError || !updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: '구독 취소에 실패했습니다.' }, { status: 500 })
  }

  await db.from('company_activity_logs').insert({
    company_id: companyId,
    user_id: user.id,
    activity_type: 'subscription_cancelled',
    activity_description: `구독 취소: ${plan.name} 플랜`,
    metadata: {
      subscription_id: subscription.id,
      plan_name: plan.name,
      access_until: subscription.current_period_end,
    },
  })

  return NextResponse.json({
    success: true,
    accessUntil: subscription.current_period_end,
  })
}
