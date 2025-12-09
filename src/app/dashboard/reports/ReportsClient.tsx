'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

interface ResultRow {
  date: string
  total: number
  pending: number
  rejected: number
  inProgress: number
  completed: number
  contractCompleted: number
  needsFollowUp: number
  other: number
  pcCount: number
  mobileCount: number
  paymentAmount: number
  paymentCount: number
}

interface TeamMember {
  id: string
  full_name: string
  department: string | null
}

interface ReportsClientProps {
  resultRows: ResultRow[]
  summary: {
    totalDB: number
    completed: number
    contractCompleted: number
    conversionRate: string
  }
  departments: string[]
  teamMembers: TeamMember[]
  selectedYear: number
  selectedMonth: number
  selectedDepartment: string
  selectedAssignedTo: string
  daysInMonth: number
}

export default function ReportsClient({
  resultRows,
  summary,
  departments,
  teamMembers,
  selectedYear,
  selectedMonth,
  selectedDepartment,
  selectedAssignedTo,
  daysInMonth,
}: ReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1

  // URL 업데이트 함수
  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/dashboard/reports?${params.toString()}`)
  }

  // 월 변경
  const changeMonth = (direction: 'prev' | 'next') => {
    let newYear = selectedYear
    let newMonth = selectedMonth

    if (direction === 'prev') {
      if (selectedMonth === 1) {
        newYear = selectedYear - 1
        newMonth = 12
      } else {
        newMonth = selectedMonth - 1
      }
    } else {
      if (selectedMonth === 12) {
        newYear = selectedYear + 1
        newMonth = 1
      } else {
        newMonth = selectedMonth + 1
      }
    }

    // 미래 월은 선택 불가
    const targetDate = new Date(newYear, newMonth - 1, 1)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), 1)
    if (targetDate > nowDate) return

    updateFilters({ year: String(newYear), month: String(newMonth) })
  }

  // 월 선택 목록 (최근 12개월)
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthOptions.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
    })
  }

  // 엑셀 다운로드
  const handleExport = () => {
    // CSV 생성
    const headers = [
      '날짜',
      'DB유입',
      '상담전',
      '상담거절',
      '상담진행중',
      '상담완료',
      '예약확정',
      '추가상담필요',
      '기타',
      '결제금액',
      '결제횟수',
    ]

    const rows = resultRows.map((row) => [
      row.date,
      row.total,
      row.pending,
      row.rejected,
      row.inProgress,
      row.completed,
      row.contractCompleted,
      row.needsFollowUp,
      row.other,
      row.paymentAmount,
      row.paymentCount,
    ])

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `결과별DB_${selectedYear}년${selectedMonth}월.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 부서별 담당자 필터링
  const filteredTeamMembers = selectedDepartment
    ? teamMembers.filter((m) => m.department === selectedDepartment)
    : teamMembers

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">결과별 DB 리포트</h1>
            <p className="mt-1 text-sm text-indigo-100">
              부서별, 담당자별 DB 현황을 분석합니다
            </p>
          </div>

          {/* 월 선택 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeMonth('prev')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className="relative">
              <select
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-')
                  updateFilters({ year, month })
                }}
                className="appearance-none bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none"
              >
                {monthOptions.map((opt) => (
                  <option
                    key={`${opt.year}-${opt.month}`}
                    value={`${opt.year}-${opt.month}`}
                    className="text-gray-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
            </div>

            <button
              onClick={() => changeMonth('next')}
              disabled={isCurrentMonth}
              className={`p-2 rounded-lg transition-colors ${
                isCurrentMonth
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* 부서 필터 */}
          <div className="flex-shrink-0 w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              🏢 부서
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) =>
                updateFilters({ department: e.target.value, assignedTo: '' })
              }
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 담당자 필터 */}
          <div className="flex-shrink-0 w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              👤 담당자
            </label>
            <select
              value={selectedAssignedTo}
              onChange={(e) => updateFilters({ assignedTo: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {filteredTeamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* 필터 초기화 */}
          {(selectedDepartment || selectedAssignedTo) && (
            <button
              onClick={() => updateFilters({ department: '', assignedTo: '' })}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          )}

          {/* 엑셀 다운로드 */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">총 DB</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {summary.totalDB}건
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">상담 완료</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {summary.completed}건
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">예약 확정</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {summary.contractCompleted}건
              </p>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DocumentCheckIcon className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">전환율</p>
              <p className="mt-1 text-xl font-bold text-purple-600">
                {summary.conversionRate}%
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            결과별 DB ({selectedMonth}월)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  날짜
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  DB유입
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  상담전
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  거절
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  진행중
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  완료
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  예약확정
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  추가상담
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                  기타
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                  결제금액
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                  결제횟수
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultRows.length > 0 ? (
                resultRows.map((row) => (
                  <tr
                    key={row.date}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link
                        href={`/dashboard/leads?date=${row.date}`}
                        className="hover:text-indigo-600 hover:underline"
                      >
                        {row.date}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                      <Link
                        href={`/dashboard/leads?date=${row.date}`}
                        className="hover:text-indigo-600"
                      >
                        {row.total}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-orange-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=new`}
                        className="hover:underline"
                      >
                        {row.pending}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.pending / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-red-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=rejected`}
                        className="hover:underline"
                      >
                        {row.rejected}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-sky-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=contacted`}
                        className="hover:underline"
                      >
                        {row.inProgress}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-green-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=converted`}
                        className="hover:underline"
                      >
                        {row.completed}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-medium text-emerald-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=contract_completed`}
                        className="hover:underline"
                      >
                        {row.contractCompleted}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-yellow-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=needs_followup`}
                        className="hover:underline"
                      >
                        {row.needsFollowUp}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-gray-400">
                      {row.other}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      {row.paymentAmount > 0
                        ? `${row.paymentAmount.toLocaleString()}원`
                        : '-'}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-right text-gray-600">
                      {row.paymentCount > 0 ? `${row.paymentCount}건` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-sm text-gray-400"
                  >
                    데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>

            {/* 합계 행 */}
            {resultRows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                  <td className="px-3 py-2 text-sm text-center text-gray-900">
                    {resultRows.reduce((sum, r) => sum + r.total, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-orange-600">
                    {resultRows.reduce((sum, r) => sum + r.pending, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-red-600">
                    {resultRows.reduce((sum, r) => sum + r.rejected, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-sky-600">
                    {resultRows.reduce((sum, r) => sum + r.inProgress, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-green-600">
                    {resultRows.reduce((sum, r) => sum + r.completed, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-emerald-600">
                    {resultRows.reduce((sum, r) => sum + r.contractCompleted, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-yellow-600">
                    {resultRows.reduce((sum, r) => sum + r.needsFollowUp, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-gray-400">
                    {resultRows.reduce((sum, r) => sum + r.other, 0)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-blue-600">
                    {resultRows
                      .reduce((sum, r) => sum + r.paymentAmount, 0)
                      .toLocaleString()}
                    원
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-600">
                    {resultRows.reduce((sum, r) => sum + r.paymentCount, 0)}건
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
