import { createClient, getCachedUserProfile, createServiceClient } from '@/lib/supabase/server'
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

  // 현재 구독 정보 조회 - 활성/체험 우선, 없으면 최신
  const { data: activeCurrentSub } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans!plan_id(*)')
    .eq('company_id', userProfile.company_id)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let currentSubscription = activeCurrentSub
  if (!currentSubscription) {
    const { data: fallback } = await supabase
      .from('company_subscriptions')
      .select('*, subscription_plans!plan_id(*)')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    currentSubscription = fallback
  }

  // 회사 전체 구독에서 빌링키 조회 (만료/취소된 구독 포함)
  // 현재 구독에 빌링키가 없어도 이전 결제 이력의 빌링키 재사용 가능
  let companyBillingKeySubscriptionId: string | null = null
  if (!((currentSubscription as any)?.billing_key)) {
    const svc = createServiceClient() as any
    const { data: subWithKey } = await svc
      .from('company_subscriptions')
      .select('id, billing_key')
      .eq('company_id', userProfile.company_id)
      .not('billing_key', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (subWithKey?.billing_key) {
      companyBillingKeySubscriptionId = subWithKey.id
    }
  }

  return (
    <div className="px-4 py-8">
      <NewSubscriptionClient
        plans={plans || []}
        currentSubscription={currentSubscription}
        companyId={userProfile.company_id}
        companyBillingKeySubscriptionId={companyBillingKeySubscriptionId}
      />
    </div>
  )
}
