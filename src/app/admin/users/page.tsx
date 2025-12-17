'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Users as UsersIcon, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { UsersListResponse, UserListItem } from '@/types/admin'
import { getRoleLabel, getRoleBadgeColor, ROLE_FILTER_OPTIONS } from '@/lib/admin/role-utils'

export default function UsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<UsersListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  // 필터 상태
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [companyId, setCompanyId] = useState(searchParams.get('company_id') || 'all')
  const [role, setRole] = useState(searchParams.get('role') || 'all')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || 'all')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  useEffect(() => {
    fetchCompanies()
    fetchUsers()
  }, [search, companyId, role, status, dateRange, page])

  async function fetchCompanies() {
    try {
      const response = await fetch('/api/admin/companies?limit=1000')
      if (!response.ok) throw new Error('Failed to fetch companies')

      const result = await response.json()
      setCompanies(result.companies)
    } catch (err) {
      console.error('Companies fetch error:', err)
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search,
        company_id: companyId,
        role,
        status,
        dateRange,
        page: page.toString(),
        limit: '20',
        sortBy: 'created_at',
        sortOrder: 'desc',
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  function handleCompanyChange(newCompanyId: string) {
    setCompanyId(newCompanyId)
    setPage(1)
  }

  function handleRoleChange(newRole: string) {
    setRole(newRole)
    setPage(1)
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
        <h2 className="text-2xl font-bold text-gray-900">사용자 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          전체 사용자 목록을 관리하고 상세 정보를 확인할 수 있습니다
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
              placeholder="이름, 이메일, 전화번호로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit">검색</Button>
        </form>

        <div className="flex gap-4 flex-wrap">
          {/* 회사 필터 */}
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">회사:</label>
            <select
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* 역할 필터 */}
          <div className="flex gap-2 flex-wrap">
            {ROLE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRoleChange(option.value)}
                className={`px-3 py-1 text-sm rounded-md ${
                  role === option.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

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
                <p className="text-sm text-gray-500">총 사용자</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.summary.total_users}
                </p>
              </div>
              <UsersIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">활성 사용자</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.summary.active_users}
                </p>
              </div>
              <UserCheck className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">비활성 사용자</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.summary.inactive_users}
                </p>
              </div>
              <UserX className="h-10 w-10 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* 사용자 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : data && data.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      회사
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      역할
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
                      마지막 로그인
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.company?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.stats?.total_leads ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.stats?.total_landing_pages ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.last_login_at
                          ? format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm', { locale: ko })
                          : '없음'}
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
          <div className="p-8 text-center text-gray-500">사용자가 없습니다</div>
        )}
      </div>
    </div>
  )
}
