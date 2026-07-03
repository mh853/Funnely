import { createClient, getCachedUserProfile, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsClient from '@/components/payments/PaymentsClient'

export default async function PaymentsPage() {
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

  // 현재 구독 정보
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans!plan_id(*)')
    .eq('company_id', userProfile.company_id)
    .in('status', ['trial', 'active', 'past_due'])
    .maybeSingle()

  // 현재 구독에 카드 정보가 없으면 회사 전체 구독에서 최근 등록된 카드 조회
  // (만료/취소된 구독에 등록된 카드 포함)
  let displaySubscription: typeof subscription = subscription
  if (subscription && !subscription.billing_key) {
    const svc = createServiceClient() as any
    const { data: subWithKey } = await svc
      .from('company_subscriptions')
      .select('billing_key, card_info, customer_key')
      .eq('company_id', userProfile.company_id)
      .not('billing_key', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (subWithKey?.billing_key) {
      displaySubscription = {
        ...subscription,
        billing_key: subWithKey.billing_key,
        card_info: subWithKey.card_info,
        customer_key: subWithKey.customer_key,
      }
    }
  }

  // 결제 거래 내역
  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PaymentsClient
      subscription={displaySubscription}
      transactions={transactions || []}
      companyId={userProfile.company_id}
    />
  )
}
