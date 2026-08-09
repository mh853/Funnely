import { createClient, getCachedUser, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReservationsClient from './ReservationsClient'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'
import { decryptPhone } from '@/lib/encryption/phone'

export default async function ReservationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await getCachedUser()

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
  const { data: contractLeads } = await supabase
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
      updated_at,
      landing_pages (
        id,
        title,
        slug
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    // status를 'contract_completed' 리터럴로 한 번 더 거르면, 이 카테고리를 커스텀
    // 코드(예: 'signed')로 쓰는 회사의 리드가 전부 빠진다 - contract_completed_at은
    // 이미 category 기준(leads/update/route.ts)으로만 채워지고 그 범주를 벗어나면
    // null로 비워지므로, 이 필드 하나만으로 정확히 "현재 계약완료 범주인 리드"를
    // 가려낼 수 있다(77차 QA).
    .not('contract_completed_at', 'is', null)
    .order('contract_completed_at', { ascending: true })

  // Get team members for counselor assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('full_name')

  // leads.phone은 암호화 저장되므로 클라이언트로 넘기기 전에 서버에서 복호화한다
  // (복호화 키는 서버 전용이라 클라이언트 컴포넌트에서 직접 복호화할 수 없음)
  const decryptedLeads = (contractLeads || []).map((lead: any) => ({
    ...lead,
    phone: lead.phone ? decryptPhone(lead.phone) : lead.phone,
  }))

  return (
    <ReservationsClient
      initialLeads={decryptedLeads}
      companyId={userProfile.company_id}
      teamMembers={teamMembers || []}
    />
  )
}
