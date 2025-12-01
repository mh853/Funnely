import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

// ISR: Revalidate every 30 seconds for real-time dashboard updates
export const revalidate = 30

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with company (cached to avoid duplicate query with layout)
  const userProfile = await getCachedUserProfile(user.id)

  // Calculate date boundaries
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Optimized: Single query to fetch all leads data (instead of 5 separate queries)
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, created_at, status')
    .eq('company_id', userProfile?.company_id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Client-side aggregation for statistics
  let todayCount = 0
  let yesterdayCount = 0
  let thisWeekCount = 0
  let thisMonthCount = 0

  const dailyStats: { [key: string]: number } = {}
  const resultsByDate: { [key: string]: any } = {}

  allLeads?.forEach(lead => {
    const leadDate = new Date(lead.created_at)
    const leadTime = leadDate.getTime()

    // Count statistics
    if (leadTime >= today.getTime()) todayCount++
    if (leadTime >= yesterday.getTime() && leadTime < today.getTime()) yesterdayCount++
    if (leadTime >= thisWeekStart.getTime()) thisWeekCount++
    if (leadTime >= thisMonthStart.getTime()) thisMonthCount++

    // Daily chart data
    const dateKey = `${leadDate.getMonth() + 1}/${leadDate.getDate()}`
    dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1

    // Results table data (last 10 days)
    if (leadTime >= thisMonthStart.getTime()) {
      const dateStr = leadDate.toISOString().split('T')[0]
      if (!resultsByDate[dateStr]) {
        resultsByDate[dateStr] = {
          date: dateStr,
          total: 0,
          pending: 0,
          rejected: 0,
          inProgress: 0,
          completed: 0,
          needsFollowUp: 0,
        }
      }
      resultsByDate[dateStr].total++
      const status = lead.status || 'pending'
      if (status === 'new' || status === 'pending') resultsByDate[dateStr].pending++
      else if (status === 'rejected') resultsByDate[dateStr].rejected++
      else if (status === 'contacted' || status === 'qualified') resultsByDate[dateStr].inProgress++
      else if (status === 'converted') resultsByDate[dateStr].completed++
    }
  })

  const resultRows = Object.values(resultsByDate)
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header with Title */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-2 text-indigo-100">
          {userProfile?.companies?.name || '회사'} 데이터 현황을 확인하세요
        </p>
      </div>

      {/* Stats Cards - 4 Cards in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">오늘</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{todayCount || 0}건</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3">
            <p className="text-xs text-blue-700 font-medium">금일 DB 유입</p>
          </div>
        </div>

        {/* Yesterday */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">어제</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{yesterdayCount || 0}건</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-3">
            <p className="text-xs text-purple-700 font-medium">전일 DB 유입</p>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">이번주</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{thisWeekCount || 0}건</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-3">
            <p className="text-xs text-emerald-700 font-medium">주간 DB 유입</p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">이번달</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{thisMonthCount || 0}건</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl">
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-6 py-3">
            <p className="text-xs text-amber-700 font-medium">월간 DB 유입</p>
          </div>
        </div>
      </div>

      {/* Daily DB Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">일자별 DB</h2>

        {/* Chart */}
        <div className="relative h-80">
          {Object.keys(dailyStats).length > 0 ? (
            <div className="flex items-end justify-between h-full gap-2">
              {Object.entries(dailyStats).map(([date, count], index) => {
                const maxCount = Math.max(...Object.values(dailyStats))
                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

                return (
                  <div key={date} className="flex flex-col items-center flex-1 group">
                    <div className="relative w-full">
                      {/* Value label on hover */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {count}
                        </span>
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full bg-gradient-to-t from-cyan-400 to-blue-500 rounded-t-lg transition-all duration-300 hover:from-cyan-500 hover:to-blue-600 cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {heightPercent > 15 && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-white text-xs font-semibold">{count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date label */}
                    <span className="text-xs text-gray-600 mt-2 whitespace-nowrap">{date}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-lg">데이터가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">결과별 DB</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DB 유입
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 전
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 거절
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 진행중
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 완료
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    계약 완료
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    추가상담 필요
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    기타
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resultRows.length > 0 ? (
                  resultRows.map((row: any, index: number) => (
                    <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {row.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.pending} {row.total > 0 ? `(${Math.round((row.pending / row.total) * 100)}%)` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.rejected} {row.total > 0 ? `(${Math.round((row.rejected / row.total) * 100)}%)` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.inProgress} {row.total > 0 ? `(${Math.round((row.inProgress / row.total) * 100)}%)` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.completed} {row.total > 0 ? `(${Math.round((row.completed / row.total) * 100)}%)` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.needsFollowUp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ...
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View All Link */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <Link
            href="/dashboard/leads"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-2"
          >
            전체 리드 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Traffic Source Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">트래픽 유입</h2>

        {/* Chart */}
        <div className="relative h-80">
          {Object.keys(dailyStats).length > 0 ? (
            <div className="flex items-end justify-between h-full gap-2">
              {Object.entries(dailyStats).map(([date, count], index) => {
                const maxCount = Math.max(...Object.values(dailyStats))
                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

                return (
                  <div key={`traffic-${date}`} className="flex flex-col items-center flex-1 group">
                    <div className="relative w-full">
                      {/* Value label on hover */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {count}
                        </span>
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full bg-gradient-to-t from-teal-400 to-cyan-500 rounded-t-lg transition-all duration-300 hover:from-teal-500 hover:to-cyan-600 cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {heightPercent > 15 && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-white text-xs font-semibold">{count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date label */}
                    <span className="text-xs text-gray-600 mt-2 whitespace-nowrap">{date}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-lg">데이터가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Traffic Efficiency Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">트래픽 효율</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traffic Source Table (Page Type) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">트래픽 유입 (페이지별)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">날짜</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">합계</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">기타</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resultRows.length > 0 ? (
                    resultRows.slice(0, 3).map((row: any) => {
                      const total = row.total || 100
                      const pc = Math.floor(total * 0.3)
                      const mobile = Math.floor(total * 0.7)
                      const other = total - pc - mobile

                      return (
                        <tr key={`traffic-source-${row.date}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {total}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {pc} ({Math.round((pc / total) * 100)}%)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {mobile} ({Math.round((mobile / total) * 100)}%)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {other} ({Math.round((other / total) * 100)}%)
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DB Conversion Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">DB 유입 전환</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">합계</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">PC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">기타</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resultRows.length > 0 ? (
                    resultRows.slice(0, 3).map((row: any) => {
                      const total = Math.floor((row.total || 100) * 0.3) // 30% conversion
                      const pc = Math.floor(total * 0.1)
                      const mobile = Math.floor(total * 0.85)
                      const other = total - pc - mobile

                      return (
                        <tr key={`db-conversion-${row.date}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {total} ({Math.round((total / (row.total || 100)) * 100)}%)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {pc} ({total > 0 ? Math.round((pc / total) * 100) : 0}%)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {mobile} ({total > 0 ? Math.round((mobile / total) * 100) : 0}%)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {other}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* DB Confirmation Button */}
      <div className="flex justify-center">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center justify-center px-12 py-4 text-base font-medium text-white bg-gradient-to-r from-gray-500 to-gray-600 rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          DB 확인
        </Link>
      </div>
    </div>
  )
}
