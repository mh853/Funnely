import { redirect } from 'next/navigation'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import AdminNav from './components/AdminNav'
import NotificationBell from './components/NotificationBell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await getSuperAdminUser()

  if (!adminUser) {
    redirect('/dashboard')
  }

  const userProfile = {
    name: adminUser.profile.full_name || 'Admin User',
    email: adminUser.profile.email || adminUser.user.email || 'admin@example.com',
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav user={userProfile} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
          <div className="px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Indigo accent bar */}
              <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-600 to-blue-400 rounded-full" />
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">퍼널리 어드민</h1>
                <p className="text-[11px] text-gray-400">시스템 전체 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{userProfile.name}</p>
                <p className="text-[11px] text-indigo-500 font-medium">슈퍼 어드민</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
