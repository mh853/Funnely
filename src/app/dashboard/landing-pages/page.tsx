import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import LandingPageTableRow from '@/components/landing-pages/LandingPageTableRow'
import LandingPageMobileCard from '@/components/landing-pages/LandingPageMobileCard'

type PeriodFilter = 'all' | 'today' | 'week' | 'month'

// ISR: Revalidate every 5 minutes for better performance and reduced server load
export const revalidate = 300

export default async function LandingPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: PeriodFilter }>
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

  // Get period filter (default to all)
  const resolvedSearchParams = await searchParams
  const period = resolvedSearchParams.period || 'all'

  // Calculate date range based on period
  const now = new Date()
  let startDate: Date | null = null

  switch (period) {
    case 'all':
      startDate = null // 전체 기간 - 날짜 필터 없음
      break
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
      startDate = null // 기본값 전체
  }

  // Get landing pages with only needed columns (optimized data transfer)
  // 생성날짜(created_at) 기준으로 필터 적용
  let landingPagesQuery = supabase
    .from('landing_pages')
    .select('id, title, slug, is_active, created_at, views_count, company_id')
    .eq('company_id', userProfile.company_id)

  // 전체가 아닌 경우에만 날짜 필터 적용 (랜딩페이지 생성일 기준)
  if (startDate) {
    landingPagesQuery = landingPagesQuery.gte('created_at', startDate.toISOString())
  }

  const { data: landingPages } = await landingPagesQuery.order('created_at', { ascending: false })

  // Get all leads statistics in a single query (prevents N+1 problem)
  let leadsQuery = supabase
    .from('leads')
    .select('landing_page_id, status, created_at')
    .in('landing_page_id', (landingPages || []).map(p => p.id))

  // 전체가 아닌 경우에만 날짜 필터 적용
  if (startDate) {
    leadsQuery = leadsQuery.gte('created_at', startDate.toISOString())
  }

  const { data: leadsStats } = await leadsQuery

  // Aggregate statistics by landing page ID
  const statsMap = new Map<string, { dbInflow: number; rejectedCount: number; contractCount: number }>()

  leadsStats?.forEach(lead => {
    const pageId = lead.landing_page_id
    if (!statsMap.has(pageId)) {
      statsMap.set(pageId, { dbInflow: 0, rejectedCount: 0, contractCount: 0 })
    }
    const stats = statsMap.get(pageId)!
    stats.dbInflow++
    if (lead.status === 'rejected') stats.rejectedCount++
    if (lead.status === 'contract_completed') stats.contractCount++
  })

  // Combine landing pages with their statistics
  const landingPagesWithStats = (landingPages || []).map(page => {
    const stats = statsMap.get(page.id) || { dbInflow: 0, rejectedCount: 0, contractCount: 0 }
    return {
      ...page,
      pageViews: page.views_count || 0,
      dbInflow: stats.dbInflow,
      rejectedCount: stats.rejectedCount,
      contractCount: stats.contractCount,
    }
  })

  return (
    <div className="space-y-4">
      {/* Header - 모바일 최적화 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-5 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">랜딩 페이지 관리</h1>
            <p className="mt-1 text-sm text-indigo-100">
              DB 수집용 랜딩 페이지를 만들고 관리합니다
            </p>
          </div>
          <Link
            href="/dashboard/landing-pages/new"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            새 랜딩 페이지
          </Link>
        </div>
      </div>

      {/* Period Filter - 모바일 최적화 */}
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Link
            href="/dashboard/landing-pages?period=all"
            className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              period === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            전체
          </Link>
          <Link
            href="/dashboard/landing-pages?period=today"
            className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              period === 'today'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            오늘
          </Link>
          <Link
            href="/dashboard/landing-pages?period=week"
            className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              period === 'week'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            주간
          </Link>
          <Link
            href="/dashboard/landing-pages?period=month"
            className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              period === 'month'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            월간
          </Link>
        </div>
      </div>

      {/* Landing Pages - 모바일 최적화 */}
      {!landingPagesWithStats || landingPagesWithStats.length === 0 ? (
        <div className="text-center py-8 sm:py-10 bg-white rounded-xl shadow-lg px-4">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3">
            <GlobeAltIcon className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">랜딩 페이지 없음</h3>
          <p className="mt-1.5 text-sm text-gray-600">
            DB 수집을 위한 첫 랜딩 페이지를 만들어보세요.
          </p>
          <div className="mt-4 sm:mt-5">
            <Link
              href="/dashboard/landing-pages/new"
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg gap-2 text-sm"
            >
              <PlusIcon className="h-5 w-5" />
              랜딩 페이지 만들기
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 모바일 카드 뷰 */}
          <div className="sm:hidden space-y-4">
            {landingPagesWithStats.map((page) => (
              <LandingPageMobileCard key={page.id} page={page} />
            ))}
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      생성 날짜
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      랜딩페이지 이름
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      상태
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      페이지 뷰
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      DB 유입
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      상담 거절
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      예약확정
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
                    >
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {landingPagesWithStats.map((page, index) => (
                    <LandingPageTableRow key={page.id} page={page} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
