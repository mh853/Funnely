import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
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
    .eq('hospital_id', userProfile.hospital_id)
    .order('start_time', { ascending: true })

  // Get team members for event assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('hospital_id', userProfile.hospital_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
          <p className="mt-1 text-sm text-gray-600">업무 일정과 상담 약속을 관리합니다.</p>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        events={events || []}
        teamMembers={teamMembers || []}
        currentUserId={user.id}
      />
    </div>
  )
}
