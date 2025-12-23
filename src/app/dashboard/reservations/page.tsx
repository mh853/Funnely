import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReservationsClient from './ReservationsClient'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'

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

  // 기능 접근 권한 체크
  const hasAccess = await hasFeatureAccess(userProfile.company_id, 'reservation_schedule')
  if (!hasAccess) {
    return <UpgradeNotice featureName="예약 스케줄" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
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
      created_at,
      notes,
      call_assigned_to,
      counselor_assigned_to,
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

  // Get team members for counselor assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('full_name')

  // 디버깅용 로그
  console.log('Reservations query result:', { contractLeads, error, companyId: userProfile.company_id })

  return (
    <ReservationsClient
      initialLeads={contractLeads || []}
      companyId={userProfile.company_id}
      teamMembers={teamMembers || []}
    />
  )
}
