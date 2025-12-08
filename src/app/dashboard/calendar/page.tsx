import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'

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

  // Get events for this hospital
  const { data: events } = await supabase
    .from('calendar_events')
    .select(
      `
      *,
      users!calendar_events_created_by_fkey (
        id,
        name
      ),
      leads (
        id,
        name,
        phone
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    .order('start_time', { ascending: true })

  // Get leads for this hospital to display on calendar
  let leadsQuery = supabase
    .from('leads')
    .select('id, name, phone, status, created_at, preferred_date, preferred_time, landing_page_id, contract_completed_at')
    .eq('company_id', userProfile.company_id)

  // Apply status filter if provided (e.g., from reservations page)
  if (statusFilter) {
    leadsQuery = leadsQuery.eq('status', statusFilter)
  }

  const { data: leads } = await leadsQuery.order('created_at', { ascending: false })

  // Get team members for event assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DB 스케줄</h1>
            <p className="mt-1 text-sm text-indigo-100">
              DB 상담 일정과 약속을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <CalendarView
          events={events || []}
          leads={leads || []}
          teamMembers={teamMembers || []}
          currentUserId={user.id}
          statusFilter={statusFilter}
        />
      </div>
    </div>
  )
}
