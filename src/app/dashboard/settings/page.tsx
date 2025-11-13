import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HospitalSettingsForm from '@/components/settings/HospitalSettingsForm'
import { KeyIcon } from '@heroicons/react/24/outline'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">사용자 정보를 불러올 수 없습니다</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>사용자 프로필이 생성되지 않았습니다.</p>
                {profileError && (
                  <p className="mt-1 text-xs">오류: {profileError.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get hospital info
  const { data: hospital, error: hospitalError } = await supabase
    .from('hospitals')
    .select('*')
    .eq('id', userProfile.hospital_id)
    .single()

  if (hospitalError) {
    console.error('Hospital fetch error:', hospitalError)
  }

  if (!hospital) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-yellow-50 p-4 max-w-md mx-auto">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">병원 정보를 찾을 수 없습니다</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>병원 정보가 설정되지 않았습니다.</p>
                {hospitalError && (
                  <p className="mt-1 text-xs">오류: {hospitalError.message}</p>
                )}
                <p className="mt-2">관리자에게 문의하거나 다시 로그인해보세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check if user has permission to edit hospital settings
  const canEdit = ['hospital_owner', 'hospital_admin'].includes(userProfile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="mt-1 text-sm text-gray-600">
          병원 정보 및 계정 설정을 관리합니다.
        </p>
      </div>

      {/* Permission Warning */}
      {!canEdit && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                병원 정보를 수정하려면 병원 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Credentials Link */}
      <Link
        href="/dashboard/settings/api-credentials"
        className="block bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-md p-6 transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg p-3">
              <KeyIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-white">
              <h3 className="text-lg font-semibold">광고 플랫폼 API 연동 설정</h3>
              <p className="text-sm text-blue-100 mt-1">
                Meta Ads, Kakao Moment, Google Ads API 인증 정보 관리
              </p>
            </div>
          </div>
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Hospital Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">병원 정보</h2>
          <HospitalSettingsForm hospital={hospital} canEdit={canEdit} />
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">계정 정보</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">이메일</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">이름</dt>
              <dd className="mt-1 text-sm text-gray-900">{userProfile.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">권한</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getRoleLabel(userProfile.role)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">가입일</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(userProfile.created_at).toLocaleDateString('ko-KR')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    hospital_owner: '병원 관리자',
    hospital_admin: '병원 어드민',
    marketing_manager: '마케팅 매니저',
    marketing_staff: '마케팅 스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}
