import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubscriptionClient from '@/components/subscription/SubscriptionClient'

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile?.company_id) {
    redirect('/dashboard')
  }

  // 구독 플랜 조회
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // 현재 구독 정보 조회
  const { data: currentSubscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('company_id', userProfile.company_id)
    .in('status', ['trial', 'active', 'past_due'])
    .single()

  return (
    <SubscriptionClient
      plans={plans || []}
      currentSubscription={currentSubscription}
      companyId={userProfile.company_id}
    />
  )
}
