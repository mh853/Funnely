import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickCurrentSubscription } from '@/lib/subscription-current'

export async function POST() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: profile } = await db
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const { data: candidateSubs } = await db
    .from('company_subscriptions')
    .select('id, status, current_period_end, trial_end_date, cancelled_at, subscription_plans!plan_id(name, price_monthly)')
    .eq('company_id', profile.company_id)
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
    company_id: profile.company_id,
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
