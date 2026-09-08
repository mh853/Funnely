// 구독 갱신 결제·체험 자동전환·만료 처리 태스크 - daily-tasks(하루 1회)와 subscription-billing(분 단위) 두 크론이 공유
import { convertTrialSubscriptionCore } from '@/lib/subscription/convert-trial-core'

/**
 * 정기 결제 갱신 처리 - 기간이 끝난 active 구독에 대해 실제 결제를 시도한다.
 *
 * 원래 supabase/functions/subscription-cron 엣지 함수가 이 역할을 하도록 작성돼
 * 있었지만, 어디에도(pg_cron, Vercel cron, 다른 코드) 스케줄링되어 있지 않아 단 한
 * 번도 자동 실행된 적이 없었다 — 그 결과 구독 기간이 끝나도 아무도 자동으로
 * 청구되지 않고, 다음날 checkSubscriptionExpiry가 결제 시도 없이 곧바로 expired로
 * 처리해버렸다. 유일하게 실제로 매일 실행되는 이 크론에 합쳐서 확실히 동작하게 한다.
 * checkSubscriptionExpiry보다 먼저 실행해야, 갱신에 성공한 구독이 새 기간으로
 * 늘어난 뒤에 곧바로 만료 처리되지 않는다.
 *
 * subscription-cron 자체는 "죽은 코드라 무해하다"는 판단과 달리 verify_jwt=true가
 * anon/service_role을 구분하지 않아 공개 anon key만으로 누구나 실행 가능한 상태였고,
 * 여기(daily-tasks)와 다른 상태값('expired' 대신 'cancelled')으로 만료 처리를 하고
 * 있어 실제 보안 위험이었다(57차 QA 확인) - Supabase 프로젝트에서 완전히 삭제 완료.
 */
export async function processSubscriptionRenewals(
  supabase: any,
  options: { includePastDueRetries?: boolean } = {}
) {
  // past_due(결제 실패 후 유예기간) 재시도는 daily-tasks에서만 하루 1회 수행한다.
  // 분 단위로 도는 subscription-billing 크론이 재시도까지 하면 실패한 카드에
  // 유예기간 내내 10분마다 결제를 시도하게 된다.
  const { includePastDueRetries = true } = options
  const now = new Date().toISOString()

  // 관리자가 회사를 비활성화/탈퇴 처리하면 PATCH /api/admin/companies/[id]가
  // 해당 회사의 company_subscriptions도 함께 suspended로 바꿔주므로 원래는 이
  // 쿼리에 걸리지 않는다. 그래도 데이터 드리프트(과거 데이터, 수동 DB 편집 등)에
  // 대비해 companies.is_active까지 한 번 더 확인하는 방어선을 둔다.
  const [activeDueRes, pastDueInGraceRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select('id, companies!inner(is_active, withdrawn_at)')
      .eq('status', 'active')
      .not('billing_key', 'is', null)
      .lte('current_period_end', now)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null),
    // past_due(유예기간) 구독은 최초 결제 실패로 current_period_end가 이미 과거로
    // 고정된 채 status만 바뀐 것이라 위 쿼리(status='active')에는 절대 걸리지 않는다 -
    // 그 결과 유예기간 7일 내내 재청구 시도가 단 한 번도 없었다(56차 QA 라이브 확인).
    // grace_period_end가 아직 지나지 않은 것만 재시도 대상에 포함한다.
    supabase
      .from('company_subscriptions')
      .select('id, companies!inner(is_active, withdrawn_at)')
      .eq('status', 'past_due')
      .not('billing_key', 'is', null)
      .gt('grace_period_end', now)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null),
  ])

  if (activeDueRes.error) {
    console.error('[Renewal] 갱신 대상(active) 구독 조회 실패:', activeDueRes.error)
  }
  if (pastDueInGraceRes.error) {
    console.error('[Renewal] 갱신 대상(past_due) 구독 조회 실패:', pastDueInGraceRes.error)
  }

  const dueSubs = [
    ...(activeDueRes.data || []),
    ...(includePastDueRetries ? pastDueInGraceRes.data || [] : []),
  ]

  let succeeded = 0
  let failed = 0
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  for (const sub of dueSubs || []) {
    try {
      const response = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId: sub.id }),
      })

      if (response.ok) {
        succeeded++
        console.log(`[Renewal] 갱신 결제 성공: ${sub.id}`)
      } else {
        failed++
        console.error(`[Renewal] 갱신 결제 실패: ${sub.id} (${response.status})`)
      }
    } catch (err) {
      failed++
      console.error(`[Renewal] 갱신 결제 처리 중 오류 (${sub.id}):`, err)
    }
  }

  return { attempted: (dueSubs || []).length, succeeded, failed }
}

// 체험 중 카드를 미리 등록해둔 구독(신규가입 시 "체험 후 자동전환" 선택)이 체험
// 기간을 넘기면, 사용자가 아무것도 하지 않아도 pending_plan_id에 저장해둔 요금제로
// 자동 결제/전환한다. 카드가 없는 체험은 그대로 두어 기존처럼 checkSubscriptionExpiry가
// expired로 전환하고 이용을 제한한다.
export async function autoConvertExpiredTrials(supabase: any) {
  const now = new Date().toISOString()

  // pending_plan_id가 없는 카드등록된 체험은 건드리지 않는다 - 신규가입 "체험 후
  // 자동전환" 경로로 시작한 체험이 아니라(예: 대시보드에서 카드만 등록/변경한 경우)
  // pending_plan_id가 비어 있으면 결제 엣지 함수가 subscription.plan_id(프로)로
  // 폴백해, 동의 없이 프로 정가가 청구된다.
  const { data: expiredTrialsWithCard, error } = await supabase
    .from('company_subscriptions')
    .select('id, companies!inner(is_active, withdrawn_at)')
    .eq('status', 'trial')
    .lt('trial_end_date', now)
    .not('billing_key', 'is', null)
    .not('pending_plan_id', 'is', null)
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)

  if (error) {
    console.error('[Trial Auto-Convert] 대상 조회 실패:', error)
    return { attempted: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  for (const sub of expiredTrialsWithCard || []) {
    try {
      const result = await convertTrialSubscriptionCore({
        subscriptionId: sub.id,
        authHeader: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      })
      if (result.ok) {
        succeeded++
        console.log(`[Trial Auto-Convert] 전환 성공: ${sub.id}`)
      } else {
        failed++
        console.error(`[Trial Auto-Convert] 전환 실패: ${sub.id} (${result.error})`)
      }
    } catch (err) {
      failed++
      console.error(`[Trial Auto-Convert] 전환 처리 중 오류 (${sub.id}):`, err)
    }
  }

  return { attempted: (expiredTrialsWithCard || []).length, succeeded, failed }
}

/**
 * Check subscription expiry and send notifications
 * Integrated from /api/cron/check-subscriptions
 */
export async function checkSubscriptionExpiry(supabase: any) {
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  console.log(`[Subscription] 구독 체크 시작: ${now.toISOString()}`)

  // 1. 만료 7일 전 구독 찾기
  // active 구독은 current_period_end 기준, trial 구독은 trial_end_date 기준으로
  // 만료를 판단해야 한다 (trial 구독은 current_period_end가 채워지지 않으므로
  // 하나의 쿼리·조건으로 합쳐서 찾을 수 없다). trial 결과는 아래 공용 처리 로직이
  // 그대로 재사용할 수 있도록 current_period_end 필드에 trial_end_date 값을 채워 반환한다.
  const [activeExpiringSoonRes, trialExpiringSoonRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        current_period_end,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', sevenDaysLater.toISOString()),
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        trial_end_date,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'trial')
      .gte('trial_end_date', now.toISOString())
      .lte('trial_end_date', sevenDaysLater.toISOString()),
  ])

  if (activeExpiringSoonRes.error) {
    throw new Error(`만료 예정 구독 조회 실패: ${activeExpiringSoonRes.error.message}`)
  }
  if (trialExpiringSoonRes.error) {
    throw new Error(`만료 예정 체험 구독 조회 실패: ${trialExpiringSoonRes.error.message}`)
  }

  const expiringSoon = [
    ...(activeExpiringSoonRes.data || []),
    ...(trialExpiringSoonRes.data || []).map((s: any) => ({
      ...s,
      current_period_end: s.trial_end_date,
    })),
  ]

  console.log(`[Subscription] 만료 예정 구독 발견: ${expiringSoon?.length || 0}개`)

  // 2. 만료 예정 알림 생성 (중복 체크)
  let notificationsCreated = 0
  for (const sub of expiringSoon || []) {
    // 중복 체크
    const { data: alreadySent } = await supabase
      .from('notification_sent_logs')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('notification_type', 'subscription_expiring_soon')
      .gte('period_end', sub.current_period_end)
      .single()

    if (!alreadySent) {
      const periodEnd = new Date(sub.current_period_end)
      const daysRemaining = Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 알림 생성
      const { error: notifError } = await supabase.from('notifications').insert({
        company_id: sub.company_id,
        title: `구독 만료 예정 알림`,
        message: `${(sub.companies as any)?.name || '회사'}의 구독이 ${daysRemaining}일 후 만료됩니다. 서비스 중단을 방지하려면 결제를 진행해주세요.`,
        type: 'subscription_expiring_soon',
        metadata: { subscription_id: sub.id },
      })

      if (notifError) {
        console.error(`[Subscription] 알림 생성 실패 (subscription_id: ${sub.id}):`, notifError)
        continue
      }

      // 로그 기록
      await supabase.from('notification_sent_logs').insert({
        subscription_id: sub.id,
        notification_type: 'subscription_expiring_soon',
        period_end: sub.current_period_end,
      })

      notificationsCreated++
      console.log(`[Subscription] 만료 예정 알림 생성: ${sub.id} (${daysRemaining}일 남음)`)
    }
  }

  // 3. 만료된 구독 찾기 (active/past_due는 current_period_end, trial은 trial_end_date 기준)
  //
  // 'cancelled'도 포함해야 한다 - 구독취소는 즉시 접근을 막지 않고 이미 결제한
  // 기간이 끝날 때까지는 계속 이용 가능하게 해주는데(cancel/route.ts), 기존
  // 쿼리가 'active'/'past_due'만 봐서 취소된 구독은 기간이 다 지나도 status가
  // 'cancelled'로 영원히 남아 데이터 삭제 파이프라인(softDeleteExpiredCompanyData,
  // status='expired' 기준)을 절대 타지 못했다(노션 34번 문구 작업 중 발견 - "취소
  // 시 데이터가 삭제됩니다" 안내를 넣으려면 실제로 삭제되게 만드는 게 먼저다).
  const [activeExpiredRes, trialExpiredRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        current_period_end,
        grace_period_end,
        companies (
          id,
          name
        )
      `)
      .in('status', ['active', 'past_due', 'cancelled'])
      .lt('current_period_end', now.toISOString()),
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        trial_end_date,
        current_period_start,
        companies (
          id,
          name
        )
      `)
      .in('status', ['trial', 'cancelled'])
      // 유료 전환 이력이 있는(current_period_start가 채워진) 취소 구독은 위
      // active 쿼리가 current_period_end 기준으로 이미 담당한다 - 여기서는 한 번도
      // 결제한 적 없이 체험 중에 취소한 경우만 trial_end_date 기준으로 잡는다.
      .is('current_period_start', null)
      .lt('trial_end_date', now.toISOString()),
  ])

  if (activeExpiredRes.error) {
    throw new Error(`만료된 구독 조회 실패: ${activeExpiredRes.error.message}`)
  }
  if (trialExpiredRes.error) {
    throw new Error(`만료된 체험 구독 조회 실패: ${trialExpiredRes.error.message}`)
  }

  // trial은 유예 기간 개념이 없으므로 grace_period_end는 항상 null로 채워
  // 아래 공용 처리 로직이 바로 'expired'로 전환하도록 한다.
  const expiredSubs = [
    ...(activeExpiredRes.data || []),
    ...(trialExpiredRes.data || []).map((s: any) => ({
      ...s,
      current_period_end: s.trial_end_date,
      grace_period_end: null,
    })),
  ]

  console.log(`[Subscription] 만료된 구독 발견: ${expiredSubs?.length || 0}개`)

  // 4. 만료된 구독 처리
  let subscriptionsExpired = 0
  for (const sub of expiredSubs || []) {
    const graceEnd = sub.grace_period_end ? new Date(sub.grace_period_end) : null
    const isInGracePeriod = graceEnd && graceEnd > now

    if (isInGracePeriod) {
      // Grace period 중이면 'past_due' 상태로 유지
      if (sub.status !== 'past_due') {
        await supabase
          .from('company_subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id)

        console.log(`[Subscription] Grace period 진입: ${sub.id}`)
      }
    } else {
      // Grace period 없거나 종료 → 'expired'로 변경. grace_period_end도 함께 비운다 -
      // 안 비우면 이 구독이 나중에 재구독될 때 오래된 값이 그대로 남아 toss-billing-payment의
      // isFirstFailure 판정(값 존재 여부로 "최초 실패"를 가림)을 오판시켜 다음 결제
      // 실패 시 유예기간이 사실상 0일로 붕괴한다(58차 QA 확인).
      const { error: updateError } = await supabase
        .from('company_subscriptions')
        .update({ status: 'expired', grace_period_end: null })
        .eq('id', sub.id)

      if (updateError) {
        console.error(`[Subscription] 구독 만료 처리 실패 (subscription_id: ${sub.id}):`, updateError)
        continue
      }

      // 만료 알림 생성 (중복 체크)
      const { data: expiredNotifSent } = await supabase
        .from('notification_sent_logs')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('notification_type', 'subscription_expired')
        .gte('period_end', sub.current_period_end)
        .single()

      if (!expiredNotifSent) {
        const companyName = (sub.companies as any)?.name || '회사'

        await supabase.from('notifications').insert({
          company_id: sub.company_id,
          title: `구독이 만료되었습니다`,
          message: `${companyName}의 구독이 만료되어 대시보드 접근이 제한됩니다. 서비스를 계속 이용하려면 플랜을 선택해주세요.`,
          type: 'subscription_expired',
          metadata: { subscription_id: sub.id },
        })

        // 이메일 발송은 더 이상 여기서 하지 않는다 - sendExpiryLifecycleEmails의
        // "당일" 메일(trial_expiring_today/sub_expiring_today)이 같은 자리를
        // 대체한다(실제 삭제 예정 안내까지 포함한 더 정확한 문구). 인앱 알림만 유지.
        await supabase.from('notification_sent_logs').insert({
          subscription_id: sub.id,
          notification_type: 'subscription_expired',
          period_end: sub.current_period_end,
        })
      }

      subscriptionsExpired++
      console.log(`[Subscription] 구독 만료 처리: ${sub.id}`)
    }
  }

  return {
    expiringSoonCount: expiringSoon?.length || 0,
    notificationsCreated,
    expiredCount: expiredSubs?.length || 0,
    subscriptionsExpired,
  }
}
