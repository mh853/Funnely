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

    // Step 1: Get active subscription
    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .select('plan_id')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial', 'past_due'])
      .single()

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

  // 구독 배너 데이터 계산
  let subscriptionBanner: {
    type: 'trial' | 'trial_ended' | null
    trialEndDate?: string | null
    daysLeft?: number
  } = { type: null }

  if (userProfile?.company_id) {
    const serviceSupabase = createServiceClient()
    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .select('status, trial_end_date, has_used_trial')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscription) {
      const now = new Date()

      if (subscription.status === 'trial' && subscription.trial_end_date) {
        const trialEnd = new Date(subscription.trial_end_date)
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        subscriptionBanner = {
          type: 'trial',
          trialEndDate: subscription.trial_end_date,
          daysLeft: Math.max(0, daysLeft),
        }
      } else if (
        subscription.status === 'active' &&
        subscription.has_used_trial === true &&
        !subscription.trial_end_date
      ) {
        // 체험 종료 후 Free로 자동 전환된 경우: trial_end_date가 null로 정리된 상태
        // 세션 내 1회만 표시 (클라이언트에서 dismiss 가능)
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
