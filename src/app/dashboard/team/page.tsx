import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamMembersList from '@/components/team/TeamMembersList'
import InviteUserButton from '@/components/users/InviteUserButton'

export default async function TeamPage() {
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
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Check if user has permission to manage team (admin만 팀원 초대 가능)
  const canManage =
    userProfile.simple_role === 'admin' ||
    ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(userProfile.role)

  // Get all team members
  const { data: teamMembers } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Get unique departments for autocomplete
  const existingDepartments = Array.from(
    new Set(
      (teamMembers || [])
        .map((m) => m.department)
        .filter((d): d is string => Boolean(d))
    )
  ).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">팀 관리</h1>
            <p className="mt-1 text-sm text-indigo-100">
              팀원을 초대하고 권한을 관리합니다.
            </p>
          </div>
          {canManage && (
            <InviteUserButton
              companyId={userProfile.company_id}
              existingDepartments={existingDepartments}
            />
          )}
        </div>
      </div>

      {/* Permission Warning */}
      {!canManage && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                팀원을 초대하고 관리하려면 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            팀원 목록 ({teamMembers?.length || 0}명)
          </h2>
          <TeamMembersList
            members={teamMembers || []}
            currentUserId={user.id}
            canManage={canManage}
            existingDepartments={existingDepartments}
          />
        </div>
      </div>
    </div>
  )
}
