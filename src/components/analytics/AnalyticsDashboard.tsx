'use client'

import {
  ChartBarIcon,
  UsersIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface AnalyticsDashboardProps {
  overallStats: {
    totalLeads: number
    totalViews: number
    totalSubmissions: number
    overallConversionRate: number
  }
  leadsByStatus: Record<string, number>
  leadsBySource: Record<string, number>
  leadsByCampaign: Record<string, number>
  landingPagePerformance: Array<{
    id: string
    title: string
    slug: string
    views: number
    submissions: number
    conversionRate: number
    status: string
  }>
  leadsByDay: Record<string, number>
}

export default function AnalyticsDashboard({
  overallStats,
  leadsByStatus,
  leadsBySource,
  leadsByCampaign,
  landingPagePerformance,
  leadsByDay,
}: AnalyticsDashboardProps) {
  // Calculate max for chart scaling
  const maxLeadsPerDay = Math.max(...Object.values(leadsByDay), 1)

  // Status labels
  const statusLabels: Record<string, string> = {
    new: '신규',
    assigned: '배정됨',
    contacting: '연락중',
    consulting: '상담중',
    completed: '완료',
    on_hold: '보류',
    cancelled: '취소',
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">총 리드</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {overallStats.totalLeads.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">총 방문</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {overallStats.totalViews.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">총 신청</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {overallStats.totalSubmissions.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전환율</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {overallStats.overallConversionRate.toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">리드 상태별 현황</h3>
          <div className="space-y-3">
            {Object.entries(leadsByStatus).map(([status, count]) => {
              const total = Object.values(leadsByStatus).reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? (count / total) * 100 : 0

              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {statusLabels[status]}
                    </span>
                    <span className="text-sm text-gray-500">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">유입 소스별 리드</h3>
          <div className="space-y-3">
            {Object.entries(leadsBySource)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([source, count]) => {
                const total = Object.values(leadsBySource).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0

                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                        {source}
                      </span>
                      <span className="text-sm text-gray-500">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Leads Timeline - Last 30 Days */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">최근 30일 리드 추이</h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {Object.entries(leadsByDay).map(([date, count]) => {
            const height = maxLeadsPerDay > 0 ? (count / maxLeadsPerDay) * 100 : 0
            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6

            return (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isWeekend ? 'bg-blue-300' : 'bg-blue-600'
                    } hover:bg-blue-700`}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${date}: ${count}건`}
                  />
                </div>
                {new Date(date).getDate() % 5 === 0 && (
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(date).getDate()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          * 주말은 연한 색으로 표시됩니다
        </div>
      </div>

      {/* Campaign Performance */}
      {Object.keys(leadsByCampaign).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">캠페인별 성과</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    캠페인
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    리드 수
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비율
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(leadsByCampaign)
                  .sort(([, a], [, b]) => b - a)
                  .map(([campaign, count]) => {
                    const total = Object.values(leadsByCampaign).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? (count / total) * 100 : 0

                    return (
                      <tr key={campaign}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {percentage.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Landing Page Performance */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">랜딩 페이지 성과</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  페이지
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  방문
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  전환율
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {landingPagePerformance
                .sort((a, b) => b.submissions - a.submissions)
                .map((page) => (
                  <tr key={page.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{page.title}</div>
                      <div className="text-sm text-gray-500">/{page.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          page.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {page.status === 'published' ? '게시됨' : '임시저장'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.submissions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`font-medium ${
                          page.conversionRate >= 10
                            ? 'text-green-600'
                            : page.conversionRate >= 5
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {page.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/landing-pages/${page.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
