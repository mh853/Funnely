import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
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
    .select('*, subscription_plans(*)')
    .eq('company_id', userProfile.company_id)
    .in('status', ['trial', 'active', 'past_due'])
    .single()

  // 결제 거래 내역
  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PaymentsClient
      subscription={subscription}
      transactions={transactions || []}
      companyId={userProfile.company_id}
    />
  )
}
