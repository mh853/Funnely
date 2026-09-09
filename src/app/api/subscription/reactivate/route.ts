// 구독 재개 API - 취소했거나 관리자가 정지했지만 이미 결제한 기간이 남아있는 구독을
// 다시 active로 되돌린다. (새로 결제하지 않는다 - 이미 그 기간만큼 결제되어 있기 때문)
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
    .select('id, status, current_period_end, trial_end_date, cancelled_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  const candidates: any[] = candidateSubs ?? []
  const subscription = pickCurrentSubscription(candidates)

  if (!subscription || (subscription.status !== 'cancelled' && subscription.status !== 'suspended')) {
    return NextResponse.json({ error: '재구독할 취소/정지된 구독이 없습니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  if (!subscription.current_period_end || subscription.current_period_end <= now) {
    return NextResponse.json(
      { error: '이용 가능 기간이 이미 종료되어 재구독할 수 없습니다. 플랜을 새로 선택해주세요.' },
      { status: 400 }
    )
  }

  const wasSuspended = subscription.status === 'suspended'

  // cancel 라우트는 취소 시점에 이미 pending_plan_id/pending_billing_cycle을 비우지만,
  // suspended는 관리자의 회사 비활성화 경로를 거치며 이 컬럼을 전혀 건드리지 않는다 -
  // 안 비우면 정지 전에 예약해둔 다운그레이드가, 이 재구독과 무관한 미래의 정기갱신
  // 시점에 고객이 인지하지 못한 채 조용히 적용된다(admin 재활성화 API는 이미 동일하게
  // 비움, 60차 QA 확인).
  const { error: updateError } = await db
    .from('company_subscriptions')
    .update({
      status: 'active',
      cancelled_at: null,
      cancel_reason: null,
      pending_plan_id: null,
      pending_billing_cycle: null,
    })
    .eq('id', subscription.id)

  if (updateError) {
    return NextResponse.json({ error: '재구독에 실패했습니다.' }, { status: 500 })
  }

  await db.from('company_activity_logs').insert({
    company_id: companyId,
    user_id: user.id,
    activity_type: 'subscription_reactivated',
    activity_description: wasSuspended ? '정지된 구독 재개' : '취소된 구독 재개',
    metadata: { subscription_id: subscription.id },
  })

  return NextResponse.json({ success: true })
}
