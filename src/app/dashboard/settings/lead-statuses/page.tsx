import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeadStatusManager from '@/components/settings/LeadStatusManager'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default async function LeadStatusesPage() {
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
    .select('company_id, simple_role')
    .eq('id', user.id)
    .single()

  if (!userProfile?.company_id) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-red-700">회사 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const canEdit = userProfile.simple_role === 'admin'

  return (
    <div className="px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">리드 상태 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">DB현황 페이지의 결과 컬럼에 표시되는 상태 항목을 관리합니다</p>
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
                상태를 수정하려면 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lead Status Manager */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <LeadStatusManager canEdit={canEdit} />
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">도움말</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>상태를 추가하면 DB현황 페이지의 결과 드롭다운에 표시됩니다.</li>
          <li>코드는 영문으로 입력하며, 시스템 내부에서 사용됩니다.</li>
          <li>기본값으로 설정된 상태는 새 리드 생성 시 자동으로 적용됩니다.</li>
          <li>리드가 사용 중인 상태는 삭제되지 않고 비활성화됩니다.</li>
          <li>순서 변경 버튼으로 표시 순서를 조정할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  )
}
