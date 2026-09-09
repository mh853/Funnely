// 예약된 플랜 변경(다운그레이드) 취소 API - 실수로 예약했을 때 되돌릴 수 있게 한다
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
    .select('id, pending_plan_id, status, current_period_end, trial_end_date, cancelled_at')
    .eq('company_id', companyId)
    .in('status', ['active', 'trial', 'past_due'])
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
    company_id: companyId,
    user_id: user.id,
    activity_type: 'subscription_pending_change_cancelled',
    activity_description: '예약된 플랜 변경 취소',
    metadata: { subscription_id: subscription.id },
  })

  return NextResponse.json({ success: true })
}
