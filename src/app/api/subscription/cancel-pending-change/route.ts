// 예약된 플랜 변경(다운그레이드) 취소 API - 실수로 예약했을 때 되돌릴 수 있게 한다
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
    .select('id, pending_plan_id, status, current_period_end, trial_end_date, cancelled_at')
    .eq('company_id', profile.company_id)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(10)

  const candidates: any[] = candidateSubs ?? []
  const subscription = pickCurrentSubscription(candidates)

  if (!subscription) {
    return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 })
  }

  if (!subscription.pending_plan_id) {
    return NextResponse.json({ error: '예약된 플랜 변경이 없습니다.' }, { status: 400 })
  }

  const { error: updateError } = await db
    .from('company_subscriptions')
    .update({ pending_plan_id: null, pending_billing_cycle: null })
    .eq('id', subscription.id)

  if (updateError) {
    return NextResponse.json({ error: '예약 취소에 실패했습니다.' }, { status: 500 })
  }

  await db.from('company_activity_logs').insert({
    company_id: profile.company_id,
    user_id: user.id,
    activity_type: 'subscription_pending_change_cancelled',
    activity_description: '예약된 플랜 변경 취소',
    metadata: { subscription_id: subscription.id },
  })

  return NextResponse.json({ success: true })
}
