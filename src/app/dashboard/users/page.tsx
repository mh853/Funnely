import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersList from '@/components/users/UsersList'
import InviteUserButton from '@/components/users/InviteUserButton'

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*, companies(id, name)')
    .eq('id', user.id)
    .single()

  if (!userProfile || !userProfile.companies) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">회사 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get all users in the same hospital
  const { data: hospitalUsers, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  }

  // Check if user can manage team members
  const canManage = ['hospital_owner', 'hospital_admin'].includes(userProfile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀원 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            {userProfile.companies.name}의 팀원을 관리합니다.
          </p>
        </div>
        {canManage && (
          <div className="mt-4 sm:mt-0">
            <InviteUserButton companyId={userProfile.company_id} />
          </div>
        )}
      </div>

      {/* Permission Warning */}
      {!canManage && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                팀원을 관리하려면 회사 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white shadow rounded-lg">
        <UsersList
          users={hospitalUsers || []}
          currentUserId={user.id}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
