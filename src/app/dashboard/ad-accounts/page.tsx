import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdAccountsList from '@/components/ad-accounts/AdAccountsList'
import ConnectAccountButton from '@/components/ad-accounts/ConnectAccountButton'
import MetaConnectionSection from '@/components/ad-accounts/MetaConnectionSection'

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

  // Check if user can manage ad accounts (company_owner, company_admin, hospital_owner, hospital_admin for backward compat)
  const canManage = ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager'].includes(
    userProfile.role
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">광고 계정 연동</h1>
            <p className="mt-1 text-sm text-blue-100">
              Meta, Kakao, Google 광고 계정을 연동하고 관리합니다.
            </p>
          </div>
          {canManage && <ConnectAccountButton />}
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
                광고 계정을 연동하려면 관리자 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Meta Connection Guide - 연동된 Meta 계정이 없을 때 친절한 가이드 표시 */}
      <MetaConnectionSection
        hasMetaAccount={adAccounts?.some(acc => acc.platform === 'meta') || false}
        canManage={canManage}
      />

      {/* Ad Accounts List */}
      {adAccounts && adAccounts.length > 0 && (
        <AdAccountsList adAccounts={adAccounts} canManage={canManage} />
      )}

      {/* Platform Guide - 다른 플랫폼 안내 */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                지원하는 광고 플랫폼
              </h3>
              <p className="text-sm text-gray-500">더 많은 플랫폼이 곧 추가됩니다</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Meta Ads */}
            <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4 relative">
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                추천
              </div>
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">f</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-gray-900">Meta Ads</h4>
                  <span className="text-xs text-blue-600 font-medium">연동 가능</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Facebook과 Instagram 광고를 통합 관리합니다. 가장 많이 사용하는 플랫폼입니다.
              </p>
            </div>

            {/* Kakao Moment */}
            <div className="border border-gray-200 rounded-xl p-4 opacity-75">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-12 w-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-xl">K</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-gray-900">Kakao Moment</h4>
                  <span className="text-xs text-gray-400 font-medium">준비 중</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                카카오톡 채널과 디스플레이 광고를 관리합니다.
              </p>
            </div>

            {/* Google Ads */}
            <div className="border border-gray-200 rounded-xl p-4 opacity-75">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-gray-900">Google Ads</h4>
                  <span className="text-xs text-gray-400 font-medium">준비 중</span>
                </div>
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
