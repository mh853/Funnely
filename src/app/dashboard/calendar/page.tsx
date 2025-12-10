import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarViewWrapper from '@/components/calendar/CalendarViewWrapper'

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
    .select(`
      id, name, phone, status, created_at, preferred_date, preferred_time, landing_page_id, contract_completed_at,
      call_assigned_user:users!leads_call_assigned_to_fkey(id, full_name),
      counselor_assigned_user:users!leads_counselor_assigned_to_fkey(id, full_name)
    `)
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
    <CalendarViewWrapper
      events={events || []}
      leads={leads || []}
      teamMembers={teamMembers || []}
      currentUserId={user.id}
      statusFilter={statusFilter}
    />
  )
}
