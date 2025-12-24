'use client'

import { useState } from 'react'
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
  MagnifyingGlassIcon,
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

interface DepartmentRow {
  department: string
  total: number
  pending: number
  rejected: number
  inProgress: number
  completed: number
  contractCompleted: number
  needsFollowUp: number
  other: number
  paymentAmount: number
  paymentCount: number
}

interface StaffRow {
  staffId: string
  staffName: string
  department: string
  total: number
  pending: number
  rejected: number
  inProgress: number
  completed: number
  contractCompleted: number
  needsFollowUp: number
  other: number
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
  departmentRows: DepartmentRow[]
  staffRows: StaffRow[]
  departmentMonthlyData: Record<string, ResultRow[]>
  staffMonthlyData: Record<string, ResultRow[]>
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
  isAllMonths: boolean
}

export default function ReportsClient({
  resultRows,
  departmentRows,
  staffRows,
  departmentMonthlyData,
  staffMonthlyData,
  summary,
  departments,
  teamMembers,
  selectedYear,
  selectedMonth,
  selectedDepartment,
  selectedAssignedTo,
  daysInMonth,
  isAllMonths,
}: ReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1

  // 탭 상태 관리
  const activeTab = (searchParams.get('tab') as 'monthly' | 'department' | 'staff') || 'monthly'
  const [searchQuery, setSearchQuery] = useState('')

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

  // 탭 전환 핸들러
  const handleTabChange = (tab: 'monthly' | 'department' | 'staff') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)

    // 탭 전환 시 department/search 초기화
    if (tab !== 'staff') {
      params.delete('department')
      params.delete('search')
    }

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
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 리포트</h1>
            <p className="text-xs text-gray-500 mt-0.5">부서별, 담당자별 DB 현황을 분석합니다</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 월 선택 */}
          <button
            onClick={() => changeMonth('prev')}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>

          <div className="relative">
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-')
                updateFilters({ year, month })
              }}
              className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold px-3 py-1.5 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none text-sm"
            >
              {monthOptions.map((opt) => (
                <option
                  key={`${opt.year}-${opt.month}`}
                  value={`${opt.year}-${opt.month}`}
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
          </div>

          <button
            onClick={() => changeMonth('next')}
            disabled={isCurrentMonth}
            className={`p-1.5 rounded-lg transition-colors ${
              isCurrentMonth
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-gray-50">
          <button
            onClick={() => handleTabChange('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'monthly'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            📊 월별 요약
          </button>
          <button
            onClick={() => handleTabChange('department')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'department'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            🏢 부서별
          </button>
          <button
            onClick={() => handleTabChange('staff')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            👤 담당자별
          </button>
        </div>

        {/* Filters Area */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-wrap items-end gap-3">
            {/* 월 필터 (공통) */}
            <div className="flex-shrink-0 w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                📅 월 선택
              </label>
              <select
                value={isAllMonths ? 'all-all' : `${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-')
                  updateFilters({ year, month })
                }}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="all-all">전체</option>
                {monthOptions.map((opt) => (
                  <option
                    key={`${opt.year}-${opt.month}`}
                    value={`${opt.year}-${opt.month}`}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 담당자별 탭 전용 필터 */}
            {activeTab === 'staff' && (
              <>
                {/* 부서 선택 */}
                <div className="flex-shrink-0 w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    📋 부서 선택
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) =>
                      updateFilters({ department: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">전체</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 이름 검색 */}
                <div className="flex-1 min-w-[200px] max-w-md">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🔍 이름 검색
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="이름 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </>
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

      {/* Tab Content */}
      {activeTab === 'monthly' && (
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
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.rejected / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-sky-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=contacted`}
                        className="hover:underline"
                      >
                        {row.inProgress}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.inProgress / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-green-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=converted`}
                        className="hover:underline"
                      >
                        {row.completed}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.completed / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-medium text-emerald-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=contract_completed`}
                        className="hover:underline"
                      >
                        {row.contractCompleted}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.contractCompleted / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-yellow-600">
                      <Link
                        href={`/dashboard/leads?date=${row.date}&status=needs_followup`}
                        className="hover:underline"
                      >
                        {row.needsFollowUp}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.needsFollowUp / row.total) * 100)}%)
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-gray-400">
                      {row.other}
                      {row.total > 0 && row.other > 0 && (
                        <span className="text-xs ml-0.5">
                          ({Math.round((row.other / row.total) * 100)}%)
                        </span>
                      )}
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
            {resultRows.length > 0 && (() => {
              const totalSum = resultRows.reduce((sum, r) => sum + r.total, 0)
              const pendingSum = resultRows.reduce((sum, r) => sum + r.pending, 0)
              const rejectedSum = resultRows.reduce((sum, r) => sum + r.rejected, 0)
              const inProgressSum = resultRows.reduce((sum, r) => sum + r.inProgress, 0)
              const completedSum = resultRows.reduce((sum, r) => sum + r.completed, 0)
              const contractCompletedSum = resultRows.reduce((sum, r) => sum + r.contractCompleted, 0)
              const needsFollowUpSum = resultRows.reduce((sum, r) => sum + r.needsFollowUp, 0)
              const otherSum = resultRows.reduce((sum, r) => sum + r.other, 0)

              return (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {totalSum}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-orange-600">
                      {pendingSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((pendingSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-red-600">
                      {rejectedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((rejectedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-sky-600">
                      {inProgressSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((inProgressSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {completedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((completedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-emerald-600">
                      {contractCompletedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((contractCompletedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-yellow-600">
                      {needsFollowUpSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((needsFollowUpSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-400">
                      {otherSum}
                      {totalSum > 0 && otherSum > 0 && (
                        <span className="text-xs ml-0.5">
                          ({Math.round((otherSum / totalSum) * 100)}%)
                        </span>
                      )}
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
              )
            })()}
          </table>
        </div>
        </div>
      )}

      {/* 부서별 탭 */}
      {activeTab === 'department' && (
        <div className="space-y-6">
          {Object.entries(departmentMonthlyData).map(([dept, monthlyRows]) => (
            <div key={dept} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-purple-600">{dept}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">날짜</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">DB유입</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">상담전</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">거절</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">진행중</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">완료</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">예약확정</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">추가상담</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">기타</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">결제금액</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">결제횟수</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyRows.map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{row.date}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-900">{row.total}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-900">{row.pending} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.pending / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-red-600">{row.rejected} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.rejected / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-blue-600">{row.inProgress} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.inProgress / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-green-600">{row.completed} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.completed / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-purple-600">{row.contractCompleted} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.contractCompleted / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-orange-600">{row.needsFollowUp} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.needsFollowUp / row.total) * 100).toFixed(1) : 0}%)</span></td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{row.other}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">{row.paymentAmount?.toLocaleString() || '-'}원</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-600">{row.paymentCount || 0}건</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totals = monthlyRows.reduce((acc, row) => ({
                        total: acc.total + row.total,
                        pending: acc.pending + row.pending,
                        rejected: acc.rejected + row.rejected,
                        inProgress: acc.inProgress + row.inProgress,
                        completed: acc.completed + row.completed,
                        contractCompleted: acc.contractCompleted + row.contractCompleted,
                        needsFollowUp: acc.needsFollowUp + row.needsFollowUp,
                        other: acc.other + row.other,
                        paymentAmount: acc.paymentAmount + (row.paymentAmount || 0),
                        paymentCount: acc.paymentCount + (row.paymentCount || 0),
                      }), { total: 0, pending: 0, rejected: 0, inProgress: 0, completed: 0, contractCompleted: 0, needsFollowUp: 0, other: 0, paymentAmount: 0, paymentCount: 0 })

                      return (
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                          <td className="px-3 py-2 text-sm text-center text-gray-900">{totals.total}</td>
                          <td className="px-3 py-2 text-sm text-center text-gray-900">{totals.pending}</td>
                          <td className="px-3 py-2 text-sm text-center text-red-600">{totals.rejected}</td>
                          <td className="px-3 py-2 text-sm text-center text-blue-600">{totals.inProgress}</td>
                          <td className="px-3 py-2 text-sm text-center text-green-600">{totals.completed}</td>
                          <td className="px-3 py-2 text-sm text-center text-purple-600">{totals.contractCompleted}</td>
                          <td className="px-3 py-2 text-sm text-center text-orange-600">{totals.needsFollowUp}</td>
                          <td className="px-3 py-2 text-sm text-center text-gray-600">{totals.other}</td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">{totals.paymentAmount.toLocaleString()}원</td>
                          <td className="px-3 py-2 text-sm text-right text-gray-600">{totals.paymentCount}건</td>
                        </tr>
                      )
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 담당자별 탭 */}
      {activeTab === 'staff' && (() => {
        // 부서 필터링
        const filteredStaff = selectedDepartment
          ? staffRows.filter(s => s.department === selectedDepartment)
          : staffRows

        // 검색 필터링
        const searchedStaff = searchQuery
          ? filteredStaff.filter(s => s.staffName.toLowerCase().includes(searchQuery.toLowerCase()))
          : filteredStaff

        return (
          <div className="space-y-6">
            {searchedStaff.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                검색 결과가 없습니다
              </div>
            )}

            {searchedStaff.map((staff) => {
              const monthlyRows = staffMonthlyData[staff.staffId] || []

              return (
                <div key={staff.staffId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-purple-600">
                      {staff.staffName}
                      {staff.department && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({staff.department})
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">날짜</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">DB유입</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">상담전</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">거절</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">진행중</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">완료</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">예약확정</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">추가상담</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">기타</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">결제금액</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">결제횟수</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {monthlyRows.map((row) => (
                          <tr key={row.date} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{row.date}</td>
                            <td className="px-3 py-2 text-sm text-center text-gray-900">{row.total}</td>
                            <td className="px-3 py-2 text-sm text-center text-gray-900">{row.pending} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.pending / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-red-600">{row.rejected} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.rejected / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-blue-600">{row.inProgress} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.inProgress / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-green-600">{row.completed} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.completed / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-purple-600">{row.contractCompleted} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.contractCompleted / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-orange-600">{row.needsFollowUp} <span className="text-xs text-gray-400">({row.total > 0 ? ((row.needsFollowUp / row.total) * 100).toFixed(1) : 0}%)</span></td>
                            <td className="px-3 py-2 text-sm text-center text-gray-600">{row.other}</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900">{row.paymentAmount?.toLocaleString() || '-'}원</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-600">{row.paymentCount || 0}건</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const totals = monthlyRows.reduce((acc, row) => ({
                            total: acc.total + row.total,
                            pending: acc.pending + row.pending,
                            rejected: acc.rejected + row.rejected,
                            inProgress: acc.inProgress + row.inProgress,
                            completed: acc.completed + row.completed,
                            contractCompleted: acc.contractCompleted + row.contractCompleted,
                            needsFollowUp: acc.needsFollowUp + row.needsFollowUp,
                            other: acc.other + row.other,
                            paymentAmount: acc.paymentAmount + (row.paymentAmount || 0),
                            paymentCount: acc.paymentCount + (row.paymentCount || 0),
                          }), { total: 0, pending: 0, rejected: 0, inProgress: 0, completed: 0, contractCompleted: 0, needsFollowUp: 0, other: 0, paymentAmount: 0, paymentCount: 0 })

                          return (
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                              <td className="px-3 py-2 text-sm text-center text-gray-900">{totals.total}</td>
                              <td className="px-3 py-2 text-sm text-center text-gray-900">{totals.pending}</td>
                              <td className="px-3 py-2 text-sm text-center text-red-600">{totals.rejected}</td>
                              <td className="px-3 py-2 text-sm text-center text-blue-600">{totals.inProgress}</td>
                              <td className="px-3 py-2 text-sm text-center text-green-600">{totals.completed}</td>
                              <td className="px-3 py-2 text-sm text-center text-purple-600">{totals.contractCompleted}</td>
                              <td className="px-3 py-2 text-sm text-center text-orange-600">{totals.needsFollowUp}</td>
                              <td className="px-3 py-2 text-sm text-center text-gray-600">{totals.other}</td>
                              <td className="px-3 py-2 text-sm text-right text-gray-900">{totals.paymentAmount.toLocaleString()}원</td>
                              <td className="px-3 py-2 text-sm text-right text-gray-600">{totals.paymentCount}건</td>
                            </tr>
                          )
                        })()}
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
      </div>

      {/* 기존 Department Results Table 제거 - 위에서 부서별 탭으로 통합됨 */}
      {false && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            🏢 부서별 DB ({selectedMonth}월)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  부서
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
              {departmentRows.length > 0 ? (
                departmentRows.map((row) => (
                  <tr
                    key={row.department}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.department}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                      {row.total}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-orange-600">
                      {row.pending}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.pending / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-red-600">
                      {row.rejected}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.rejected / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-sky-600">
                      {row.inProgress}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.inProgress / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-green-600">
                      {row.completed}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.completed / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-medium text-emerald-600">
                      {row.contractCompleted}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.contractCompleted / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-yellow-600">
                      {row.needsFollowUp}
                      {row.total > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((row.needsFollowUp / row.total) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-gray-400">
                      {row.other}
                      {row.total > 0 && row.other > 0 && (
                        <span className="text-xs ml-0.5">
                          ({Math.round((row.other / row.total) * 100)}%)
                        </span>
                      )}
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
            {departmentRows.length > 0 && (() => {
              const totalSum = departmentRows.reduce((sum, r) => sum + r.total, 0)
              const pendingSum = departmentRows.reduce((sum, r) => sum + r.pending, 0)
              const rejectedSum = departmentRows.reduce((sum, r) => sum + r.rejected, 0)
              const inProgressSum = departmentRows.reduce((sum, r) => sum + r.inProgress, 0)
              const completedSum = departmentRows.reduce((sum, r) => sum + r.completed, 0)
              const contractCompletedSum = departmentRows.reduce((sum, r) => sum + r.contractCompleted, 0)
              const needsFollowUpSum = departmentRows.reduce((sum, r) => sum + r.needsFollowUp, 0)
              const otherSum = departmentRows.reduce((sum, r) => sum + r.other, 0)

              return (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {totalSum}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-orange-600">
                      {pendingSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((pendingSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-red-600">
                      {rejectedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((rejectedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-sky-600">
                      {inProgressSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((inProgressSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {completedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((completedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-emerald-600">
                      {contractCompletedSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((contractCompletedSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-yellow-600">
                      {needsFollowUpSum}
                      {totalSum > 0 && (
                        <span className="text-gray-400 text-xs ml-0.5">
                          ({Math.round((needsFollowUpSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-400">
                      {otherSum}
                      {totalSum > 0 && otherSum > 0 && (
                        <span className="text-xs ml-0.5">
                          ({Math.round((otherSum / totalSum) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-blue-600">
                      {departmentRows
                        .reduce((sum, r) => sum + r.paymentAmount, 0)
                        .toLocaleString()}
                      원
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-600">
                      {departmentRows.reduce((sum, r) => sum + r.paymentCount, 0)}건
                    </td>
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
      </div>
      )}

      {/* 기존 Staff Results Table 제거 - 위에서 담당자별 탭으로 통합됨 */}
      {false && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              👤 담당자별 DB ({selectedMonth}월)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    담당자
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    부서
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
                {staffRows.length > 0 ? (
                  staffRows.map((row) => (
                    <tr
                      key={row.staffId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.staffName}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-gray-500">
                        {row.department || '-'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-semibold text-gray-900">
                        {row.total}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-orange-600">
                        {row.pending}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.pending / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-red-600">
                        {row.rejected}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.rejected / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-sky-600">
                        {row.inProgress}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.inProgress / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-green-600">
                        {row.completed}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.completed / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center font-medium text-emerald-600">
                        {row.contractCompleted}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.contractCompleted / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-yellow-600">
                        {row.needsFollowUp}
                        {row.total > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((row.needsFollowUp / row.total) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-sm text-center text-gray-400">
                        {row.other}
                        {row.total > 0 && row.other > 0 && (
                          <span className="text-xs ml-0.5">
                            ({Math.round((row.other / row.total) * 100)}%)
                          </span>
                        )}
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
                      colSpan={12}
                      className="px-3 py-8 text-center text-sm text-gray-400"
                    >
                      데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>

              {/* 합계 행 */}
              {staffRows.length > 0 && (() => {
                const totalSum = staffRows.reduce((sum, r) => sum + r.total, 0)
                const pendingSum = staffRows.reduce((sum, r) => sum + r.pending, 0)
                const rejectedSum = staffRows.reduce((sum, r) => sum + r.rejected, 0)
                const inProgressSum = staffRows.reduce((sum, r) => sum + r.inProgress, 0)
                const completedSum = staffRows.reduce((sum, r) => sum + r.completed, 0)
                const contractCompletedSum = staffRows.reduce((sum, r) => sum + r.contractCompleted, 0)
                const needsFollowUpSum = staffRows.reduce((sum, r) => sum + r.needsFollowUp, 0)
                const otherSum = staffRows.reduce((sum, r) => sum + r.other, 0)

                return (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                      <td className="px-3 py-2 text-sm text-gray-500"></td>
                      <td className="px-3 py-2 text-sm text-center text-gray-900">
                        {totalSum}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-orange-600">
                        {pendingSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((pendingSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-red-600">
                        {rejectedSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((rejectedSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-sky-600">
                        {inProgressSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((inProgressSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-green-600">
                        {completedSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((completedSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-emerald-600">
                        {contractCompletedSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((contractCompletedSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-yellow-600">
                        {needsFollowUpSum}
                        {totalSum > 0 && (
                          <span className="text-gray-400 text-xs ml-0.5">
                            ({Math.round((needsFollowUpSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-400">
                        {otherSum}
                        {totalSum > 0 && otherSum > 0 && (
                          <span className="text-xs ml-0.5">
                            ({Math.round((otherSum / totalSum) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-blue-600">
                        {staffRows
                          .reduce((sum, r) => sum + r.paymentAmount, 0)
                          .toLocaleString()}
                        원
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-600">
                        {staffRows.reduce((sum, r) => sum + r.paymentCount, 0)}건
                      </td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
