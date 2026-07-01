import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile for company_id
  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get notifications: both user-specific AND company-wide
  // company_id가 null이면 company-wide 조건 제외하여 불필요한 전체 조회 방지
  const orFilter = userProfile.company_id
    ? `user_id.eq.${user.id},and(user_id.is.null,company_id.eq.${userProfile.company_id})`
    : `user_id.eq.${user.id}`

  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('*')
    .or(orFilter)
    .order('created_at', { ascending: false })

  // Log error for debugging
  if (notificationsError) {
    console.error('Notifications error:', notificationsError)
  }

  return <NotificationsClient initialNotifications={notifications || []} userId={user.id} companyId={userProfile.company_id} />
}
