import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with hospital info (cached)
  const userProfile = await getCachedUserProfile(user.id)

  // Note: 구독 기반 접근 권한 체크는 middleware.ts에서 처리됨

  return (
    <DashboardLayoutClient user={user} userProfile={userProfile}>
      {children}
    </DashboardLayoutClient>
  )
}
