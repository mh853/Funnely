import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, GlobeAltIcon, PencilIcon } from '@heroicons/react/24/outline'

type PeriodFilter = 'today' | 'week' | 'month'

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: { period?: PeriodFilter }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get period filter (default to week)
  const period = searchParams.period || 'week'

  // Calculate date range based on period
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  // Get landing pages
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Get statistics for each landing page
  const landingPagesWithStats = await Promise.all(
    (landingPages || []).map(async (page) => {
      // Get DB inflow (total leads)
      const { count: dbInflow } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('landing_page_id', page.id)
        .gte('created_at', startDate.toISOString())

      // Get rejected count (consultation rejected)
      const { count: rejectedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('landing_page_id', page.id)
        .eq('status', 'rejected')
        .gte('created_at', startDate.toISOString())

      // Get contract completion count
      const { count: contractCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('landing_page_id', page.id)
        .eq('status', 'contract_completed')
        .gte('created_at', startDate.toISOString())

      return {
        ...page,
        pageViews: page.views_count || 0,
        dbInflow: dbInflow || 0,
        rejectedCount: rejectedCount || 0,
        contractCount: contractCount || 0,
      }
    })
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">랜딩 페이지 관리</h1>
            <p className="mt-2 text-indigo-100">
              DB 수집용 랜딩 페이지를 만들고 관리합니다
            </p>
          </div>
          <Link
            href="/dashboard/landing-pages/new"
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            새 랜딩 페이지
          </Link>
        </div>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex gap-3">
          <Link
            href="/dashboard/landing-pages?period=today"
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              period === 'today'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            오늘
          </Link>
          <Link
            href="/dashboard/landing-pages?period=week"
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              period === 'week'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            주간
          </Link>
          <Link
            href="/dashboard/landing-pages?period=month"
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              period === 'month'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            월간
          </Link>
        </div>
      </div>

      {/* Landing Pages Table */}
      {!landingPagesWithStats || landingPagesWithStats.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <GlobeAltIcon className="h-10 w-10 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">랜딩 페이지 없음</h3>
          <p className="mt-2 text-sm text-gray-600">
            DB 수집을 위한 첫 랜딩 페이지를 만들어보세요.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard/landing-pages/new"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              랜딩 페이지 만들기
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    생성 날짜
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    랜딩페이지 이름
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    페이지 뷰
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    DB 유입
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    상담 거절
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    계약완료
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    수정
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {landingPagesWithStats.map((page, index) => {
                  const createdDate = new Date(page.created_at)
                  const formattedDate = createdDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })

                  return (
                    <tr
                      key={page.id}
                      className={`transition-colors hover:bg-indigo-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {page.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              /{page.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {page.pageViews.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {page.dbInflow.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                          {page.rejectedCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                          {page.contractCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center text-sm">
                        <Link
                          href={`/dashboard/landing-pages/${page.id}/edit`}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm gap-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                          수정
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
