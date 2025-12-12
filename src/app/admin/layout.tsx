import { redirect } from 'next/navigation'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import AdminNav from './components/AdminNav'
import NotificationBell from './components/NotificationBell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check super admin privileges
  const adminUser = await getSuperAdminUser()

  if (!adminUser) {
    redirect('/dashboard')
  }

  // Ensure profile exists with required fields
  const userProfile = {
    name: adminUser.profile.full_name || 'Admin User',
    email: adminUser.profile.email || adminUser.user.email || 'admin@example.com',
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <AdminNav user={userProfile} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  퍼널리 어드민
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  시스템 전체 관리 대시보드
                </p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile.name}
                  </p>
                  <p className="text-xs text-gray-500">슈퍼 어드민</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
