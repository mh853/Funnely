'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { decryptPhone } from '@/lib/encryption/phone'

interface LeadsClientProps {
  leads: any[]
  landingPages: any[]
  totalCount: number
}

export default function LeadsClient({
  leads,
  landingPages,
  totalCount,
}: LeadsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || '7days')
  const [landingPageId, setLandingPageId] = useState(searchParams.get('landingPageId') || '')
  const [deviceType, setDeviceType] = useState(searchParams.get('deviceType') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: '상담 전',
      pending: '상담 전',
      rejected: '상담 거절',
      contacted: '상담 진행중',
      qualified: '상담 진행중',
      converted: '상담 완료',
      contract_completed: '계약 완료',
      needs_followup: '추가상담 필요',
      other: '기타',
    }
    return labels[status] || status
  }

  const getDateRangeLabel = (range: string) => {
    const now = new Date()
    const labels: { [key: string]: string } = {
      '7days': `${formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))}~${formatDate(now)}`,
      '14days': `${formatDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))}~${formatDate(now)}`,
      '30days': `${formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))}~${formatDate(now)}`,
      all: '전체',
    }
    return labels[range] || labels['7days']
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
  }

  const handleFilterChange = () => {
    const params = new URLSearchParams()
    if (dateRange && dateRange !== '7days') params.set('dateRange', dateRange)
    if (landingPageId) params.set('landingPageId', landingPageId)
    if (deviceType) params.set('deviceType', deviceType)
    if (status) params.set('status', status)
    if (searchQuery) params.set('search', searchQuery)
    params.set('page', '1')

    router.push(`/dashboard/leads?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/dashboard/leads?${params.toString()}`)
    setCurrentPage(page)
  }

  const handleExcelExport = () => {
    // Excel export will be implemented later
    alert('Excel 내보내기 기능은 곧 추가될 예정입니다.')
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 날짜 범위
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7days">{getDateRangeLabel('7days')}</option>
              <option value="14days">최근 14일</option>
              <option value="30days">최근 30일</option>
              <option value="all">전체</option>
            </select>
          </div>

          {/* Landing Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              랜딩페이지 이름
            </label>
            <select
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {landingPages?.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>

          {/* Device */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PC/Mobile
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pc">PC</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* Result */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              결과
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="new">상담 전</option>
              <option value="rejected">상담 거절</option>
              <option value="contacted">상담 진행중</option>
              <option value="converted">상담 완료</option>
              <option value="contract_completed">계약 완료</option>
              <option value="needs_followup">추가상담 필요</option>
              <option value="other">기타</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="이름, 전화번호 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange()
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleFilterChange}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleFilterChange}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            필터 적용
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  랜딩페이지 이름
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  PC/Mobile
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  전화번호
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 1
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 2
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 3
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  결과
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  계약 완료
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!leads || leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-400">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.landing_pages?.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.device_type?.toUpperCase() || 'PC'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.phone ? decryptPhone(lead.phone) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_1 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_2 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_3 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.contract_completed_at
                        ? new Date(lead.contract_completed_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}

              {totalPages > 5 && (
                <>
                  <span className="px-2 text-sm text-gray-500">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
