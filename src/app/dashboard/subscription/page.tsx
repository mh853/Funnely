import { createClient, getCachedUser, getCachedUserProfile, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewSubscriptionClient from '@/components/subscription/NewSubscriptionClient'
import { pickCurrentSubscription } from '@/lib/subscription-current'

interface SubscriptionPageProps {
  searchParams: Promise<{ discount?: string }>
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await getCachedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile?.company_id) {
    redirect('/dashboard')
  }

  // 만료 winback 이메일의 1회성 10% 할인 링크(?discount=token) 검증 - 서비스클라이언트로
  // company_id 소속을 확인해야 다른 회사 토큰을 훔쳐써도 적용되지 않는다.
  const { discount: discountToken } = await searchParams
  let discountInfo: { token: string; percent: number; expiresAt: string } | null = null
  if (discountToken) {
    const svcForDiscount = createServiceClient() as any
    const { data: grant } = await svcForDiscount
      .from('discount_grants')
      .select('token, discount_percent, expires_at, redeemed_at, company_id')
      .eq('token', discountToken)
      .maybeSingle()

    if (
      grant &&
      grant.company_id === userProfile.company_id &&
      !grant.redeemed_at &&
      new Date(grant.expires_at) > new Date()
    ) {
      discountInfo = { token: grant.token, percent: grant.discount_percent, expiresAt: grant.expires_at }
    }
  }

  // 구독 플랜 조회 (sort_order로 정렬)
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // 현재 구독 정보 조회 (우선순위는 pickCurrentSubscription 참고)
  const { data: allSubs } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans!plan_id(*)')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const currentSubscription = pickCurrentSubscription(allSubs ?? [])

  // 회사 전체 구독에서 빌링키/카드 정보 조회 (만료/취소된 구독 포함)
  let companyBillingKeySubscriptionId: string | null = null
  let companyCardInfo: { number?: string; cardType?: string; ownerType?: string } | null = null

  const currentBillingKey = (currentSubscription as any)?.billing_key
  if (currentBillingKey) {
    // 현재 구독에 빌링키 있음 → 현재 구독 카드 정보 사용
    companyCardInfo = (currentSubscription as any)?.card_info ?? null
  } else {
    // 현재 구독에 빌링키 없음 → 다른 구독에서 조회
    const svc = createServiceClient() as any
    const { data: subWithKey } = await svc
      .from('company_subscriptions')
      .select('id, billing_key, card_info')
      .eq('company_id', userProfile.company_id)
      .not('billing_key', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (subWithKey?.billing_key) {
      companyBillingKeySubscriptionId = subWithKey.id
      companyCardInfo = subWithKey.card_info ?? null
    }
  }

  return (
    <div className="px-4 py-8">
      <NewSubscriptionClient
        plans={plans || []}
        currentSubscription={currentSubscription}
        companyId={userProfile.company_id}
        companyBillingKeySubscriptionId={companyBillingKeySubscriptionId}
        companyCardInfo={companyCardInfo}
        discountInfo={discountInfo}
      />
    </div>
  )
}
