import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
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

  // 플랜 기능 조회
  let planFeatures: { [key: string]: boolean } = {}
  if (userProfile?.company_id) {
    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select(`
        subscription_plans (
          features
        )
      `)
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'trial', 'past_due'])
      .single()

    if (subscription?.subscription_plans) {
      planFeatures = (subscription.subscription_plans as any).features || {}
    }
  }

  // Note: 구독 기반 접근 권한 체크는 middleware.ts에서 처리됨

  return (
    <DashboardLayoutClient user={user} userProfile={userProfile} planFeatures={planFeatures}>
      {children}
    </DashboardLayoutClient>
  )
}
