import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReservationsClient from './ReservationsClient'

export default async function ReservationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get contract completed leads with scheduled dates
  const { data: contractLeads, error } = await supabase
    .from('leads')
    .select(
      `
      id,
      name,
      phone,
      status,
      contract_completed_at,
      landing_pages (
        id,
        title,
        slug
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    .eq('status', 'contract_completed')
    .not('contract_completed_at', 'is', null)
    .order('contract_completed_at', { ascending: true })

  // 디버깅용 로그
  console.log('Reservations query result:', { contractLeads, error, companyId: userProfile.company_id })

  return (
    <ReservationsClient
      initialLeads={contractLeads || []}
      companyId={userProfile.company_id}
    />
  )
}
