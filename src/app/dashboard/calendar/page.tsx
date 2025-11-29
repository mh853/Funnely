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
    .eq('company_id', userProfile.company_id)
    .order('start_time', { ascending: true })

  // Get team members for event assignment
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">DB 스케줄</h1>
            <p className="mt-2 text-indigo-100">
              DB 상담 일정과 약속을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <CalendarView
          events={events || []}
          teamMembers={teamMembers || []}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
