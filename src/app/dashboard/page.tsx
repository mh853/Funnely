import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import DashboardFilter from '@/components/dashboard/DashboardFilter'

// ISR: Revalidate every 30 seconds for real-time dashboard updates
export const revalidate = 30

interface DashboardPageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with company (cached to avoid duplicate query with layout)
  const userProfile = await getCachedUserProfile(user.id)

  // 현재 날짜
  const now = new Date()

  // URL 파라미터에서 년월 가져오기 (기본값: 현재 월)
  const selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

  // 선택된 월의 시작일과 종료일 계산
  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0) // 해당 월의 마지막 날
  const daysInMonth = selectedMonthEnd.getDate()

  // 현재 월인지 확인
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1

  // Calculate date boundaries for stats cards (항상 현재 기준)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // 선택된 월의 데이터를 가져오기 위한 쿼리 범위
  const queryStart = selectedMonthStart.toISOString()
  const queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString() // 다음달 1일

  // 선택된 월의 리드 데이터 조회
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, created_at, status, device_type')
    .eq('company_id', userProfile?.company_id)
    .gte('created_at', queryStart)
    .lt('created_at', queryEnd)
    .order('created_at', { ascending: true })

  // 현재 월 통계용 데이터 (Stats Cards는 항상 현재 월 기준)
  let todayCount = 0
  let yesterdayCount = 0
  let thisWeekCount = 0
  let thisMonthCount = 0

  // 현재 월 통계를 위한 별도 쿼리 (선택된 월이 현재 월이 아닐 경우)
  if (!isCurrentMonth) {
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: currentMonthLeads } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('company_id', userProfile?.company_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    currentMonthLeads?.forEach(lead => {
      const leadDate = new Date(lead.created_at)
      const leadTime = leadDate.getTime()

      if (leadTime >= today.getTime()) todayCount++
      if (leadTime >= yesterday.getTime() && leadTime < today.getTime()) yesterdayCount++
      if (leadTime >= thisWeekStart.getTime()) thisWeekCount++
      if (leadTime >= thisMonthStart.getTime()) thisMonthCount++
    })
  }

  const dailyStats: { [key: string]: number } = {}
  const resultsByDate: { [key: string]: any } = {}

  // 선택된 월 1일부터 말일까지 모든 날짜 생성
  const monthlyDates: { date: string; day: number }[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${selectedMonth}/${day}`
    dailyStats[dateKey] = 0
    monthlyDates.push({ date: dateKey, day })
  }

  // 선택된 월의 총 DB 수
  let selectedMonthCount = 0

  allLeads?.forEach(lead => {
    const leadDate = new Date(lead.created_at)
    const leadTime = leadDate.getTime()

    // 현재 월인 경우에만 Stats Cards 통계 계산
    if (isCurrentMonth) {
      if (leadTime >= today.getTime()) todayCount++
      if (leadTime >= yesterday.getTime() && leadTime < today.getTime()) yesterdayCount++
      if (leadTime >= thisWeekStart.getTime()) thisWeekCount++
      if (leadTime >= thisMonthStart.getTime()) thisMonthCount++
    }

    // 선택된 월의 총 개수
    selectedMonthCount++

    // Daily chart data
    const dateKey = `${leadDate.getMonth() + 1}/${leadDate.getDate()}`
    dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1

    // Results table data
    const dateStr = leadDate.toISOString().split('T')[0]
    if (!resultsByDate[dateStr]) {
      resultsByDate[dateStr] = {
        date: dateStr,
        total: 0,
        pending: 0,
        rejected: 0,
        inProgress: 0,
        completed: 0,
        contractCompleted: 0,
        needsFollowUp: 0,
        other: 0,
        // Device type counts
        pcCount: 0,
        mobileCount: 0,
        tabletCount: 0,
        unknownDeviceCount: 0,
      }
    }
    resultsByDate[dateStr].total++

    // Count by device type
    const deviceType = lead.device_type || 'unknown'
    if (deviceType === 'pc') resultsByDate[dateStr].pcCount++
    else if (deviceType === 'mobile') resultsByDate[dateStr].mobileCount++
    else if (deviceType === 'tablet') resultsByDate[dateStr].tabletCount++
    else resultsByDate[dateStr].unknownDeviceCount++

    const status = lead.status || 'pending'
    if (status === 'new' || status === 'pending') resultsByDate[dateStr].pending++
    else if (status === 'rejected') resultsByDate[dateStr].rejected++
    else if (status === 'contacted' || status === 'qualified') resultsByDate[dateStr].inProgress++
    else if (status === 'converted') resultsByDate[dateStr].completed++
    else if (status === 'contract_completed') resultsByDate[dateStr].contractCompleted++
    else if (status === 'needs_followup') resultsByDate[dateStr].needsFollowUp++
    else resultsByDate[dateStr].other++
  })

  // 정렬된 선택된 월 차트 데이터 배열 생성
  const sortedDailyStats = monthlyDates.map(({ date }) => ({
    date,
    count: dailyStats[date] || 0
  }))

  const resultRows = Object.values(resultsByDate)
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Header with Title and Filter */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">대시보드</h1>
            <p className="mt-1 text-sm text-indigo-100">
              {userProfile?.companies?.name || '회사'} 데이터 현황을 확인하세요
            </p>
          </div>
          <DashboardFilter />
        </div>
        {/* 선택된 월 표시 (현재 월이 아닌 경우) */}
        {!isCurrentMonth && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm">
            <span className="font-medium">{selectedYear}년 {selectedMonth}월</span>
            <span className="text-indigo-200">데이터 조회 중</span>
          </div>
        )}
      </div>

      {/* Stats Cards - 4 Cards in a row (현재 월일 때만 표시) */}
      {isCurrentMonth && (() => {
        // 통계 카드 링크용 날짜 문자열 생성
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
        const thisWeekStartStr = `${thisWeekStart.getFullYear()}-${String(thisWeekStart.getMonth() + 1).padStart(2, '0')}-${String(thisWeekStart.getDate()).padStart(2, '0')}`
        const thisMonthStartStr = `${thisMonthStart.getFullYear()}-${String(thisMonthStart.getMonth() + 1).padStart(2, '0')}-${String(thisMonthStart.getDate()).padStart(2, '0')}`

        return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today */}
          <Link href={`/dashboard/leads?date=${todayStr}`} className="block">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">오늘</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{todayCount || 0}건</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
                    <CalendarDaysIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2">
                <p className="text-xs text-blue-700 font-medium">금일 DB 유입</p>
              </div>
            </div>
          </Link>

          {/* Yesterday */}
          <Link href={`/dashboard/leads?date=${yesterdayStr}`} className="block">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">어제</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{yesterdayCount || 0}건</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-2">
                <p className="text-xs text-purple-700 font-medium">전일 DB 유입</p>
              </div>
            </div>
          </Link>

          {/* This Week */}
          <Link href={`/dashboard/leads?startDate=${thisWeekStartStr}&endDate=${todayStr}`} className="block">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">이번주</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{thisWeekCount || 0}건</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2">
                <p className="text-xs text-emerald-700 font-medium">주간 DB 유입</p>
              </div>
            </div>
          </Link>

          {/* This Month */}
          <Link href={`/dashboard/leads?startDate=${thisMonthStartStr}&endDate=${todayStr}`} className="block">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">이번달</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{thisMonthCount || 0}건</p>
                  </div>
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2">
                <p className="text-xs text-amber-700 font-medium">월간 DB 유입</p>
              </div>
            </div>
          </Link>
        </div>
        )
      })()}

      {/* Daily DB Chart - Modern Design */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">일자별 DB</h2>
            <p className="text-sm text-gray-500 mt-0.5">{selectedMonth}월 1일 ~ {daysInMonth}일</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {isCurrentMonth && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"></div>
                <span className="text-gray-600">오늘</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"></div>
              <span className="text-gray-600">데이터</span>
            </div>
            <div className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-medium">
              총 {selectedMonthCount}건
            </div>
          </div>
        </div>

        {/* Chart with Y-axis */}
        <div className="relative h-72">
          {(() => {
            const maxCount = Math.max(...sortedDailyStats.map(d => d.count), 1)
            const yAxisSteps = 5
            const stepValue = Math.ceil(maxCount / yAxisSteps)
            const adjustedMax = stepValue * yAxisSteps

            return (
              <>
                {/* Y-axis labels and grid lines */}
                <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-right pr-2">
                  {[...Array(yAxisSteps + 1)].map((_, i) => {
                    const value = adjustedMax - (i * stepValue)
                    return (
                      <div key={i} className="relative flex items-center justify-end">
                        <span className="text-[11px] text-gray-400 font-medium">{value}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Grid lines */}
                <div className="absolute left-10 right-0 top-0 bottom-8">
                  {[...Array(yAxisSteps + 1)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${(i / yAxisSteps) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute left-12 right-0 top-0 bottom-8 flex items-end gap-[2px]">
                  {sortedDailyStats.map(({ date, count }, index) => {
                    const heightPercent = adjustedMax > 0 ? (count / adjustedMax) * 100 : 0
                    const isToday = isCurrentMonth && date === `${now.getMonth() + 1}/${now.getDate()}`
                    const showLabel = index === 0 || (index + 1) % 5 === 0 || index === sortedDailyStats.length - 1
                    // 날짜를 YYYY-MM-DD 형식으로 변환
                    const day = parseInt(date.split('/')[1])
                    const filterDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                    return (
                      <div key={date} className="flex-1 min-w-[8px] group relative h-full flex flex-col justify-end">
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                            <div className="font-semibold">{date}</div>
                            <div className="text-gray-300">{count}건</div>
                            {count > 0 && <div className="text-cyan-300 text-[10px] mt-1">클릭하여 상세보기</div>}
                          </div>
                          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>

                        {/* Bar with animation - Link로 감싸서 클릭 시 해당 날짜 DB현황으로 이동 */}
                        {count > 0 ? (
                          <Link
                            href={`/dashboard/leads?date=${filterDate}`}
                            className={`w-full rounded-t-sm transition-all duration-500 ease-out cursor-pointer relative overflow-hidden ${
                              isToday
                                ? 'bg-gradient-to-t from-violet-600 via-purple-500 to-fuchsia-400 shadow-lg shadow-purple-200'
                                : 'bg-gradient-to-t from-cyan-500 via-blue-400 to-sky-300 hover:from-cyan-600 hover:via-blue-500 hover:to-sky-400'
                            }`}
                            style={{
                              height: `${Math.max(heightPercent, 2)}%`,
                              display: 'block',
                            }}
                          >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <div
                            className="w-full rounded-t-sm bg-gray-200 hover:bg-gray-300"
                            style={{ height: '3px' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div className="absolute left-12 right-0 bottom-0 h-6 flex">
                  {sortedDailyStats.map(({ date }, index) => {
                    const isToday = date === `${now.getMonth() + 1}/${now.getDate()}`
                    const showLabel = index === 0 || (index + 1) % 5 === 0 || index === sortedDailyStats.length - 1

                    return (
                      <div key={`label-${date}`} className="flex-1 min-w-[8px] flex justify-center">
                        {showLabel && (
                          <span className={`text-[10px] ${isToday ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                            {date.split('/')[1]}일
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">결과별 DB</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    DB 유입
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 전
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 거절
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 진행중
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    상담 완료
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    예약 확정
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    추가상담 필요
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    기타
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resultRows.length > 0 ? (
                  resultRows.map((row: any, index: number) => (
                    <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                          {row.date}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                          {row.total}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <Link href={`/dashboard/leads?date=${row.date}&status=new`} className="hover:text-indigo-600 hover:underline">
                          {row.pending} {row.total > 0 ? `(${Math.round((row.pending / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <Link href={`/dashboard/leads?date=${row.date}&status=rejected`} className="hover:text-indigo-600 hover:underline">
                          {row.rejected} {row.total > 0 ? `(${Math.round((row.rejected / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <Link href={`/dashboard/leads?date=${row.date}&status=contacted`} className="hover:text-indigo-600 hover:underline">
                          {row.inProgress} {row.total > 0 ? `(${Math.round((row.inProgress / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <Link href={`/dashboard/leads?date=${row.date}&status=converted`} className="hover:text-indigo-600 hover:underline">
                          {row.completed} {row.total > 0 ? `(${Math.round((row.completed / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-green-600 font-medium">
                        <Link href={`/dashboard/leads?date=${row.date}&status=contract_completed`} className="hover:text-green-700 hover:underline">
                          {row.contractCompleted} {row.total > 0 ? `(${Math.round((row.contractCompleted / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                        <Link href={`/dashboard/leads?date=${row.date}&status=needs_followup`} className="hover:text-indigo-600 hover:underline">
                          {row.needsFollowUp} {row.total > 0 ? `(${Math.round((row.needsFollowUp / row.total) * 100)}%)` : ''}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-400">
                        {row.other}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View All Link */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
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

      {/* Traffic Source Chart - Modern Design */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">트래픽 유입</h2>
            <p className="text-sm text-gray-500 mt-0.5">{selectedMonth}월 1일 ~ {daysInMonth}일</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {isCurrentMonth && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                <span className="text-gray-600">오늘</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"></div>
              <span className="text-gray-600">데이터</span>
            </div>
          </div>
        </div>

        {/* Chart with Y-axis */}
        <div className="relative h-72">
          {(() => {
            const maxCount = Math.max(...sortedDailyStats.map(d => d.count), 1)
            const yAxisSteps = 5
            const stepValue = Math.ceil(maxCount / yAxisSteps)
            const adjustedMax = stepValue * yAxisSteps

            return (
              <>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-right pr-2">
                  {[...Array(yAxisSteps + 1)].map((_, i) => {
                    const value = adjustedMax - (i * stepValue)
                    return (
                      <div key={i} className="relative flex items-center justify-end">
                        <span className="text-[11px] text-gray-400 font-medium">{value}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Grid lines */}
                <div className="absolute left-10 right-0 top-0 bottom-8">
                  {[...Array(yAxisSteps + 1)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${(i / yAxisSteps) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute left-12 right-0 top-0 bottom-8 flex items-end gap-[2px]">
                  {sortedDailyStats.map(({ date, count }, index) => {
                    const heightPercent = adjustedMax > 0 ? (count / adjustedMax) * 100 : 0
                    const isToday = isCurrentMonth && date === `${now.getMonth() + 1}/${now.getDate()}`
                    const hasData = count > 0
                    // 날짜를 YYYY-MM-DD 형식으로 변환
                    const day = parseInt(date.split('/')[1])
                    const filterDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                    return (
                      <div key={`traffic-${date}`} className="flex-1 min-w-[8px] group relative h-full flex flex-col justify-end">
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                            <div className="font-semibold">{date}</div>
                            <div className="text-gray-300">{count}건</div>
                            {hasData && <div className="text-emerald-300 text-[10px] mt-1">클릭하여 상세보기</div>}
                          </div>
                          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>

                        {/* Bar with animation - Link로 감싸서 클릭 시 해당 날짜 DB현황으로 이동 */}
                        {hasData ? (
                          <Link
                            href={`/dashboard/leads?date=${filterDate}`}
                            className={`w-full rounded-t-sm transition-all duration-500 ease-out cursor-pointer relative overflow-hidden ${
                              isToday
                                ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-green-400 shadow-lg shadow-emerald-200'
                                : 'bg-gradient-to-t from-teal-500 via-cyan-400 to-sky-300 hover:from-teal-600 hover:via-cyan-500 hover:to-sky-400'
                            }`}
                            style={{
                              height: `${Math.max(heightPercent, 2)}%`,
                              display: 'block',
                            }}
                          >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <div
                            className="w-full rounded-t-sm bg-gray-200 hover:bg-gray-300"
                            style={{ height: '3px' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div className="absolute left-12 right-0 bottom-0 h-6 flex">
                  {sortedDailyStats.map(({ date }, index) => {
                    const isToday = isCurrentMonth && date === `${now.getMonth() + 1}/${now.getDate()}`
                    const showLabel = index === 0 || (index + 1) % 5 === 0 || index === sortedDailyStats.length - 1

                    return (
                      <div key={`traffic-label-${date}`} className="flex-1 min-w-[8px] flex justify-center">
                        {showLabel && (
                          <span className={`text-[10px] ${isToday ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                            {date.split('/')[1]}일
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Traffic Efficiency Section */}
      <div className="bg-white rounded-xl shadow-lg p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">트래픽 효율</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Traffic Source Table (Page Type) */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">트래픽 유입 (페이지별)</h3>
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
                      const total = row.total || 0
                      const otherDevices = (row.tabletCount || 0) + (row.unknownDeviceCount || 0)

                      return (
                        <tr key={`traffic-source-${row.date}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                              {row.date}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                              {total}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            <Link href={`/dashboard/leads?date=${row.date}&deviceType=pc`} className="hover:text-indigo-600 hover:underline">
                              {row.pcCount || 0}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            <Link href={`/dashboard/leads?date=${row.date}&deviceType=mobile`} className="hover:text-indigo-600 hover:underline">
                              {row.mobileCount || 0}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {otherDevices}
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
            <h3 className="text-base font-semibold text-gray-800 mb-3">DB 유입 전환</h3>
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
                      const total = row.total || 0
                      const otherDevices = (row.tabletCount || 0) + (row.unknownDeviceCount || 0)

                      return (
                        <tr key={`db-conversion-${row.date}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                              {row.date}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            <Link href={`/dashboard/leads?date=${row.date}`} className="hover:text-indigo-600 hover:underline">
                              {total}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            <Link href={`/dashboard/leads?date=${row.date}&deviceType=pc`} className="hover:text-indigo-600 hover:underline">
                              {row.pcCount || 0}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            <Link href={`/dashboard/leads?date=${row.date}&deviceType=mobile`} className="hover:text-indigo-600 hover:underline">
                              {row.mobileCount || 0}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {otherDevices}
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
        </div>
      </div>

      {/* DB Confirmation Button */}
      <div className="flex justify-center">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center justify-center px-10 py-3 text-sm font-medium text-white bg-gradient-to-r from-gray-500 to-gray-600 rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          DB 확인
        </Link>
      </div>
    </div>
  )
}
