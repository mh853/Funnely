// 구독 재개 API - 취소했지만 이미 결제한 기간이 남아있는 구독을 다시 active로 되돌린다.
// (새로 결제하지 않는다 - 이미 그 기간만큼 결제되어 있기 때문)
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
    .select('id, status, current_period_end, trial_end_date, cancelled_at')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const candidates: any[] = candidateSubs ?? []
  const subscription = pickCurrentSubscription(candidates)

  if (!subscription || subscription.status !== 'cancelled') {
    return NextResponse.json({ error: '재구독할 취소된 구독이 없습니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  if (!subscription.current_period_end || subscription.current_period_end <= now) {
    return NextResponse.json(
      { error: '이용 가능 기간이 이미 종료되어 재구독할 수 없습니다. 플랜을 새로 선택해주세요.' },
      { status: 400 }
    )
  }

  const { error: updateError } = await db
    .from('company_subscriptions')
    .update({ status: 'active', cancelled_at: null, cancel_reason: null })
    .eq('id', subscription.id)

  if (updateError) {
    return NextResponse.json({ error: '재구독에 실패했습니다.' }, { status: 500 })
  }

  await db.from('company_activity_logs').insert({
    company_id: profile.company_id,
    user_id: user.id,
    activity_type: 'subscription_reactivated',
    activity_description: '취소된 구독 재개',
    metadata: { subscription_id: subscription.id },
  })

  return NextResponse.json({ success: true })
}
