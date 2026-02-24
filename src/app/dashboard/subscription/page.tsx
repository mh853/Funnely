import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewSubscriptionClient from '@/components/subscription/NewSubscriptionClient'

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

  // 구독 플랜 조회 (sort_order로 정렬)
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // 현재 구독 정보 조회 (상태 무관하게 최신 1건 - Free 플랜 포함)
  const { data: currentSubscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="px-4 py-8">
      <NewSubscriptionClient
        plans={plans || []}
        currentSubscription={currentSubscription}
        companyId={userProfile.company_id}
      />
    </div>
  )
}
