import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdAccountsList from '@/components/ad-accounts/AdAccountsList'
import ConnectAccountButton from '@/components/ad-accounts/ConnectAccountButton'

export default async function AdAccountsPage() {
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
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get all ad accounts for this hospital
  const { data: adAccounts, error } = await supabase
    .from('ad_accounts')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Check if user can manage ad accounts
  const canManage = ['hospital_owner', 'hospital_admin', 'marketing_manager'].includes(
    userProfile.role
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">광고 계정</h1>
          <p className="mt-1 text-sm text-gray-600">
            Meta, Kakao, Google 광고 계정을 연동하고 관리합니다.
          </p>
        </div>
        {canManage && <ConnectAccountButton />}
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
                광고 계정을 연동하려면 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!adAccounts || adAccounts.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            연동된 광고 계정이 없습니다
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            광고 플랫폼 계정을 연동하여 캠페인 관리를 시작하세요.
          </p>
          {canManage && (
            <div className="mt-6">
              <ConnectAccountButton />
            </div>
          )}
        </div>
      )}

      {/* Ad Accounts List */}
      {adAccounts && adAccounts.length > 0 && (
        <AdAccountsList adAccounts={adAccounts} canManage={canManage} />
      )}

      {/* Platform Guide */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            지원하는 광고 플랫폼
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Meta Ads */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">f</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">
                  Meta Ads
                </h4>
              </div>
              <p className="text-sm text-gray-500">
                Facebook과 Instagram 광고를 통합 관리합니다.
              </p>
            </div>

            {/* Kakao Moment */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-10 w-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-lg">K</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">
                  Kakao Moment
                </h4>
              </div>
              <p className="text-sm text-gray-500">
                카카오톡 채널과 디스플레이 광고를 관리합니다.
              </p>
            </div>

            {/* Google Ads */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">
                  Google Ads
                </h4>
              </div>
              <p className="text-sm text-gray-500">
                검색 광고와 디스플레이 네트워크를 관리합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
