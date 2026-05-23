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

  if (userProfile?.company_id) {
    const serviceSupabase = createServiceClient()

    // Step 1: Get active subscription (most recent wins — handles trial→active upgrade)
    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .select('plan_id')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Step 2: Get plan features if subscription exists
    if (subscription?.plan_id) {
      const { data: plan } = await serviceSupabase
        .from('subscription_plans')
        .select('features')
        .eq('id', subscription.plan_id)
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
    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, trial_end_date')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscription?.status === 'trial' && subscription.trial_end_date) {
      const trialEnd = new Date(subscription.trial_end_date)
      if (trialEnd < new Date()) {
        subscriptionBanner = { type: 'trial_ended' }
      }
    }
  }

  // Note: 구독 기반 접근 권한 체크는 middleware.ts에서 처리됨

  return (
    <DashboardLayoutClient
      user={user}
      userProfile={userProfile}
      planFeatures={planFeatures}
      subscriptionBanner={subscriptionBanner}
    >
      {children}
    </DashboardLayoutClient>
  )
}
