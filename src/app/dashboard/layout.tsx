import { createClient, getCachedUser, getCachedUserProfile, getCachedCompanySubscriptions } from '@/lib/supabase/server'
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
  } = await getCachedUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with hospital info (cached)
  const userProfile = await getCachedUserProfile(user.id)

  // 플랜 기능/배너/헤더 배지가 전부 같은 구독 조회 결과에서 파생되므로 한 번만 조회한다
  // (우선순위는 pickCurrentSubscription 참고)
  let planFeatures: { [key: string]: boolean } = {}
  let subscriptionStatus: string | null = null
  let subscriptionBanner: { type: 'trial_ended' | null } = { type: null }
  let currentPlanName: string | null = null
  let trialDDay: string | null = null

  if (userProfile?.company_id) {
    const allSubs = await getCachedCompanySubscriptions(userProfile.company_id)
    const currentSub = pickCurrentSubscription(allSubs)

    subscriptionStatus = currentSub?.status ?? null

    // 구독이 지금 접근 권한을 부여하는 동안만 플랜 기능 적용
    // (cancelled라도 결제한 기간이 남아있으면 계속 사용 가능해야 한다)
    if (currentSub && hasValidPlanAccess(currentSub)) {
      const features = (currentSub.subscription_plans as any)?.features
      if (features) {
        planFeatures = features
      }
    }

    // 체험 만료 모달용 배너 (만료된 경우에만 표시)
    if (currentSub?.status === 'trial' && currentSub.trial_end_date) {
      const trialEnd = new Date(currentSub.trial_end_date)
      if (trialEnd < new Date()) {
        subscriptionBanner = { type: 'trial_ended' }
      }
    }

    // 헤더 배지용 플랜명 및 체험 디데이
    if (currentSub) {
      const planName = (currentSub.subscription_plans as any)?.name
      currentPlanName = planName ? `${planName}${currentSub.status === 'trial' ? ' (체험)' : ''}` : null

      if (currentSub.status === 'trial' && currentSub.trial_end_date) {
        const daysRemaining = Math.ceil(
          (new Date(currentSub.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        trialDDay = daysRemaining <= 0 ? 'D-DAY' : `D-${daysRemaining}`
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
      subscriptionStatus={subscriptionStatus}
      currentPlanName={currentPlanName}
      trialDDay={trialDDay}
    >
      {children}
    </DashboardLayoutClient>
  )
}
