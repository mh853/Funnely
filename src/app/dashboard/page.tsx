import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  MegaphoneIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with hospital (cached to avoid duplicate query with layout)
  const userProfile = await getCachedUserProfile(user.id)

  // Get statistics in parallel
  const [
    { count: adAccountCount },
    { count: campaignCount }
  ] = await Promise.all([
    supabase
      .from('ad_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userProfile?.company_id),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userProfile?.company_id)
      .eq('status', 'active')
  ])

  // Check onboarding status
  const hasBusinessNumber = userProfile?.companies?.business_number &&
    !userProfile.companies.business_number.startsWith('TEMP-')

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {userProfile?.full_name || user.email}님! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {userProfile?.companies?.name || '회사'} 대시보드
        </p>
      </div>

      {/* Onboarding Alert */}
      {!hasBusinessNumber && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                회사 정보를 완성하세요
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  사업자번호 등 회사 정보를 등록하면 광고 플랫폼 연동을 시작할 수 있습니다.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/dashboard/settings"
                  prefetch={true}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  설정으로 이동 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Ad Accounts */}
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">광고 계정</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{adAccountCount || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/dashboard/ad-accounts" prefetch={true} className="text-sm font-medium text-blue-600 hover:text-blue-500">
              계정 연동하기 →
            </Link>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MegaphoneIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">활성 캠페인</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{campaignCount || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link href="/dashboard/campaigns" prefetch={true} className="text-sm font-medium text-green-600 hover:text-green-500">
              캠페인 보기 →
            </Link>
          </div>
        </div>

        {/* Total Spend (Placeholder) */}
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">이번 달 광고비</dt>
                  <dd className="text-2xl font-semibold text-gray-900">₩0</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <span className="text-sm text-gray-500">캠페인 연동 후 표시</span>
          </div>
        </div>

        {/* Performance (Placeholder) */}
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전환율</dt>
                  <dd className="text-2xl font-semibold text-gray-900">-</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <span className="text-sm text-gray-500">데이터 수집 대기 중</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            빠른 시작
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/dashboard/ad-accounts"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0">
                <PlusCircleIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">광고 계정 연동</p>
                <p className="text-sm text-gray-500">Meta, Kakao, Google</p>
              </div>
            </Link>

            <Link
              href="/dashboard/campaigns"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-green-400 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0">
                <MegaphoneIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">캠페인 관리</p>
                <p className="text-sm text-gray-500">광고 생성 및 수정</p>
              </div>
            </Link>

            <Link
              href="/dashboard/reports"
              prefetch={true}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-purple-400 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">리포트 보기</p>
                <p className="text-sm text-gray-500">성과 분석</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
