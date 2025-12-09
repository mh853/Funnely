import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HospitalSettingsForm from '@/components/settings/HospitalSettingsForm'
import { KeyIcon, TagIcon, TableCellsIcon, Cog6ToothIcon, BuildingOffice2Icon, UserCircleIcon } from '@heroicons/react/24/outline'
import { formatDate } from '@/lib/utils/date'

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
    .from('companies')
    .select('*')
    .eq('id', userProfile.company_id)
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
              <h3 className="text-sm font-medium text-yellow-800">회사 정보를 찾을 수 없습니다</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>회사 정보가 설정되지 않았습니다.</p>
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
  const isAdmin = userProfile.simple_role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header - team 페이지와 동일한 스타일 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <Cog6ToothIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">설정</h1>
              <p className="mt-1 text-sm text-indigo-100">
                회사 정보 및 계정 설정을 관리합니다.
              </p>
            </div>
          </div>
        </div>
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
                회사 정보를 수정하려면 회사 관리자 권한이 필요합니다.
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

      {/* Lead Status Settings Link - Admin Only */}
      {isAdmin && (
        <Link
          href="/dashboard/settings/lead-statuses"
          className="block bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg shadow-md p-6 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg p-3">
                <TagIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">리드 상태 관리</h3>
                <p className="text-sm text-emerald-100 mt-1">
                  DB현황 페이지의 결과 컬럼에 표시되는 상태 항목 관리
                </p>
              </div>
            </div>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Google Sheets Sync Settings Link - Admin Only */}
      {isAdmin && (
        <Link
          href="/dashboard/settings/sheet-sync"
          className="block bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg shadow-md p-6 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg p-3">
                <TableCellsIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">Google Sheets 동기화</h3>
                <p className="text-sm text-purple-100 mt-1">
                  Meta 광고 데이터를 Google Sheets에서 자동으로 가져옵니다
                </p>
              </div>
            </div>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Hospital Settings */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <BuildingOffice2Icon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">회사 정보</h2>
              <p className="text-sm text-gray-500">회사 기본 정보를 관리합니다</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          <HospitalSettingsForm hospital={hospital} canEdit={canEdit} />
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <UserCircleIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
              <p className="text-sm text-gray-500">로그인 계정 및 권한 정보</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</dt>
              <dd className="mt-2 text-sm font-medium text-gray-900">{user.email}</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">이름</dt>
              <dd className="mt-2 text-sm font-medium text-gray-900">{userProfile.full_name}</dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">권한</dt>
              <dd className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {getRoleLabel(userProfile.role)}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</dt>
              <dd className="mt-2 text-sm font-medium text-gray-900">
                {formatDate(userProfile.created_at)}
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
    hospital_owner: '회사 관리자',
    hospital_admin: '회사 어드민',
    marketing_manager: '마케팅 매니저',
    marketing_staff: '마케팅 스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}
