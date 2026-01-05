import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BellIcon } from '@heroicons/react/24/outline'
import NotificationEmailSettings from '@/components/settings/NotificationEmailSettings'

export default async function NotificationSettingsPage() {
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
        <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-red-800">사용자 정보를 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, notification_emails')
    .eq('id', userProfile.company_id)
    .single()

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-yellow-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-yellow-800">회사 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  // Check permissions
  const canEdit = ['company_owner', 'company_admin'].includes(userProfile.role)

  return (
    <div className="px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
          <BellIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">이메일 알림 설정</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            리드 유입 시 알림받을 이메일 주소를 관리합니다.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <BellIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">리드 유입 알림</h2>
              <p className="text-sm text-gray-500">
                랜딩페이지에서 리드가 제출되면 즉시 이메일로 알림을 받습니다
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <NotificationEmailSettings
            companyId={company.id}
            initialEmails={company.notification_emails || []}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* 사용 가이드 */}
      <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">📖 사용 가이드</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">1. 이메일 추가</h4>
            <p className="text-xs">
              알림받을 이메일 주소를 입력하고 "추가" 버튼을 클릭하세요. 최대 5개까지 등록
              가능합니다.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">2. 테스트 전송</h4>
            <p className="text-xs">
              "테스트 메일 보내기" 버튼으로 알림이 정상적으로 전송되는지 확인하세요.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">3. 자동 알림</h4>
            <p className="text-xs">
              랜딩페이지에서 고객이 상담을 신청하면 등록된 모든 이메일 주소로 즉시 알림이
              전송됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
