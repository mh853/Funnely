'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Building2, Users, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CompaniesListResponse, CompanyListItem } from '@/types/admin'

export default function CompaniesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<CompaniesListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || 'all')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  useEffect(() => {
    fetchCompanies()
  }, [search, status, dateRange, page])

  async function fetchCompanies() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        status,
        dateRange,
        page: page.toString(),
        limit: '20',
        sortBy: 'created_at',
        sortOrder: 'desc',
      })

      const response = await fetch(`/admin/api/companies?${params}`)
      if (!response.ok) throw new Error('Failed to fetch companies')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('회사 목록을 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchCompanies()
  }

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    setPage(1)
  }

  function handleDateRangeChange(newRange: string) {
    setDateRange(newRange)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">회사 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          전체 회사 목록을 관리하고 상세 정보를 확인할 수 있습니다
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="회사명 또는 담당자 이메일로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit">검색</Button>
        </form>

        <div className="flex gap-4">
          {/* 활성 상태 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                status === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleStatusChange('active')}
              className={`px-3 py-1 text-sm rounded-md ${
                status === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              활성
            </button>
            <button
              onClick={() => handleStatusChange('inactive')}
              className={`px-3 py-1 text-sm rounded-md ${
                status === 'inactive'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              비활성
            </button>
          </div>

          {/* 가입일 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleDateRangeChange('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                dateRange === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 기간
            </button>
            <button
              onClick={() => handleDateRangeChange('7d')}
              className={`px-3 py-1 text-sm rounded-md ${
                dateRange === '7d'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              최근 7일
            </button>
            <button
              onClick={() => handleDateRangeChange('30d')}
              className={`px-3 py-1 text-sm rounded-md ${
                dateRange === '30d'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              최근 30일
            </button>
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">총 회사</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.pagination.total}
                </p>
              </div>
              <Building2 className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* 회사 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : data && data.companies.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      회사명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      담당자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      리드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      페이지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      가입일
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/companies/${company.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{company.name}</div>
                          <div className="text-sm text-gray-500">ID: {company.id.substring(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">
                            {company.admin_user.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {company.admin_user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {company.stats.total_users}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {company.stats.total_leads}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {company.stats.landing_pages_count}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                          {company.is_active ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(company.created_at), 'yyyy-MM-dd', { locale: ko })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                총 {data.pagination.total}개 중 {(page - 1) * 20 + 1}-
                {Math.min(page * 20, data.pagination.total)}개 표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <span className="px-4 py-2 text-sm">
                  {page} / {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">회사가 없습니다</div>
        )}
      </div>
    </div>
  )
}
