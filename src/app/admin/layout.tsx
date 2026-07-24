import { redirect } from 'next/navigation'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import AdminLayoutClient from './components/AdminLayoutClient'

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

  return <AdminLayoutClient user={userProfile}>{children}</AdminLayoutClient>
}
