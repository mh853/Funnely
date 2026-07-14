import { createClient, createServiceClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { pickCurrentSubscription, hasValidPlanAccess } from '@/lib/subscription-current'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with hospital info (cached)
  const userProfile = await getCachedUserProfile(user.id)

  // 플랜 기능 조회 (2단계 쿼리) - Service Role 사용 (RLS 우회)
  let planFeatures: { [key: string]: boolean } = {}
  let subscriptionStatus: string | null = null

  if (userProfile?.company_id) {
    const serviceSupabase = createServiceClient()

    // 현재 구독 조회 (우선순위는 pickCurrentSubscription 참고)
    const { data: subsForFeatures } = await serviceSupabase
      .from('company_subscriptions')
      .select('plan_id, status, current_period_end, trial_end_date, cancelled_at')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const latestSub = pickCurrentSubscription(subsForFeatures ?? [])

    subscriptionStatus = latestSub?.status ?? null

    // Step 2: 구독이 지금 접근 권한을 부여하는 동안만 플랜 기능 적용
    // (cancelled라도 결제한 기간이 남아있으면 계속 사용 가능해야 한다)
    if (latestSub?.plan_id && hasValidPlanAccess(latestSub)) {
      const { data: plan } = await serviceSupabase
        .from('subscription_plans')
        .select('features')
        .eq('id', latestSub.plan_id)
        .single()

      if (plan?.features) {
        planFeatures = plan.features
      }
    }
  }

  // 체험 만료 모달용 배너 계산 (만료된 경우에만 표시)
  let subscriptionBanner: {
    type: 'trial_ended' | null
  } = { type: null }

  if (userProfile?.company_id) {
    const serviceSupabase = createServiceClient()
    const { data: subsForBanner } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, trial_end_date, current_period_end, cancelled_at')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const subscription = pickCurrentSubscription(subsForBanner ?? [])

    if (subscription?.status === 'trial' && subscription.trial_end_date) {
      const trialEnd = new Date(subscription.trial_end_date)
      if (trialEnd < new Date()) {
        subscriptionBanner = { type: 'trial_ended' }
      }
    }
  }

  // Note: 구독 기반 접근 권한 체크는 middleware.ts에서 처리됨

  // 헤더 배지용 플랜명 조회
  let currentPlanName: string | null = null
  if (userProfile?.company_id) {
    const serviceSupabase = createServiceClient()
    const { data: subsWithPlan } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, current_period_end, trial_end_date, cancelled_at, subscription_plans!plan_id(name)')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const subWithPlan = pickCurrentSubscription(subsWithPlan ?? [])

    if (subWithPlan) {
      const planName = (subWithPlan.subscription_plans as any)?.name
      currentPlanName = planName ? `${planName}${subWithPlan.status === 'trial' ? ' (체험)' : ''}` : null
    }
  }

  return (
    <DashboardLayoutClient
      user={user}
      userProfile={userProfile}
      planFeatures={planFeatures}
      subscriptionBanner={subscriptionBanner}
      subscriptionStatus={subscriptionStatus}
      currentPlanName={currentPlanName}
    >
      {children}
    </DashboardLayoutClient>
  )
}
