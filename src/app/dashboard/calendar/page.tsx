import { createClient, getCachedUser, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarViewWrapper from '@/components/calendar/CalendarViewWrapper'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'
import { decryptPhone } from '@/lib/encryption/phone'
import { getLeadStatusCategoryMap, getCodesForCategory } from '@/lib/leadStatusCategory'

interface SearchParams {
  status?: string
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const statusFilter = searchParams.status

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
  const hasAccess = await hasFeatureAccess(userProfile.company_id, 'db_schedule')
  if (!hasAccess) {
    return <UpgradeNotice featureName="DB 스케줄" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
  }

  // Get events for this hospital (calendar_events의 실제 회사 참조 컬럼명은
  // company_id가 아니라 hospital_id이다 — 이 필터가 항상 매칭에 실패해 캘린더에
  // 등록된 이벤트가 하나도 표시되지 않고 있었다)
  const { data: rawEvents } = await supabase
    .from('calendar_events')
    .select(
      `
      *,
      users!calendar_events_created_by_fkey (
        id,
        full_name
      ),
      leads (
        id,
        name,
        phone
      )
    `
    )
    .eq('hospital_id', userProfile.company_id)
    .order('start_time', { ascending: true })

  // 프론트(EventModal 등)는 여전히 is_all_day 필드명을 사용하므로 응답 형태를 유지한다
  const events = (rawEvents || []).map(({ all_day, ...rest }: any) => ({
    ...rest,
    is_all_day: all_day,
  }))

  // Get leads for this hospital to display on calendar
  let leadsQuery = supabase
    .from('leads')
    .select(`
      *,
      landing_pages (
        id,
        title,
        slug
      ),
      call_assigned_user:users!leads_call_assigned_to_fkey(id, full_name),
      counselor_assigned_user:users!leads_counselor_assigned_to_fkey(id, full_name)
    `)
    .eq('company_id', userProfile.company_id)

  // Apply status filter if provided (e.g., from reservations page)
  if (statusFilter) {
    leadsQuery = leadsQuery.eq('status', statusFilter)
  } else {
    // DB 스케줄은 상담결과가 "추가상담 필요"인 리드만 노출해야 하는데, 필터가
    // 없으면 전체 리드(DB 최초 유입 포함)가 그대로 표시되고 있었다(노션 QA 접수).
    const categoryMap = await getLeadStatusCategoryMap(supabase, userProfile.company_id)
    const followUpCodes = getCodesForCategory(categoryMap, 'needs_followup')
    leadsQuery = leadsQuery.in('status', followUpCodes.length > 0 ? followUpCodes : ['needs_followup'])
  }

  const { data: rawLeads } = await leadsQuery.order('created_at', { ascending: false })

  // leads.phone은 암호화 저장되므로 클라이언트로 넘기기 전에 서버에서 복호화한다
  // (복호화 키는 서버 전용이라 클라이언트 컴포넌트에서 직접 복호화할 수 없음)
  const leads = (rawLeads || []).map((lead: any) => ({
    ...lead,
    phone: lead.phone ? decryptPhone(lead.phone) : lead.phone,
  }))

  // Get team members for event assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('full_name')

  return (
    <CalendarViewWrapper
      events={events || []}
      leads={leads || []}
      teamMembers={teamMembers || []}
      currentUserId={user.id}
      statusFilter={statusFilter}
    />
  )
}
