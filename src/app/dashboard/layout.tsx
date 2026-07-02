import { createClient, createServiceClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'

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

    // Step 1: 활성/체험 구독 우선 조회, 없으면 최신 구독
    const { data: activeSub } = await serviceSupabase
      .from('company_subscriptions')
      .select('plan_id, status')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let latestSub = activeSub
    if (!latestSub) {
      const { data: fallback } = await serviceSupabase
        .from('company_subscriptions')
        .select('plan_id, status')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      latestSub = fallback
    }

    subscriptionStatus = latestSub?.status ?? null

    // Step 2: Get plan features only for active subscriptions
    if (latestSub?.plan_id && ['active', 'trial', 'past_due'].includes(latestSub.status ?? '')) {
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
    const { data: activeTrial } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, trial_end_date')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let subscription = activeTrial
    if (!subscription) {
      const { data: fallback } = await serviceSupabase
        .from('company_subscriptions')
        .select('status, trial_end_date')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      subscription = fallback
    }

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
    const { data: subWithPlan } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, subscription_plans(name)')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

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
