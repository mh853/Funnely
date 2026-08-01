import { createClient, getCachedUser, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsClient from '@/components/payments/PaymentsClient'

export default async function PaymentsPage() {
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

  // 현재 구독 정보
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans!plan_id(*)')
    .eq('company_id', userProfile.company_id)
    .in('status', ['trial', 'active', 'past_due'])
    .maybeSingle()

  // 결제 거래 내역 - count도 함께 받아 51번째 이상(더 오래된) 내역이 있는지
  // 클라이언트가 알 수 있게 한다(51차 QA: 이전에는 잘려도 아무 신호가 없었음)
  const { data: transactions, count: totalCount } = await supabase
    .from('payment_transactions')
    .select('*', { count: 'exact' })
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .range(0, 49)

  return (
    <PaymentsClient
      subscription={subscription}
      transactions={transactions || []}
      totalCount={totalCount ?? 0}
      companyId={userProfile.company_id}
    />
  )
}
