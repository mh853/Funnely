'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CompanyUsersResponse } from '@/types/admin'

interface UsersTabProps {
  companyId: string
}

export default function UsersTab({ companyId }: UsersTabProps) {
  const [data, setData] = useState<CompanyUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchUsers()
  }, [companyId, roleFilter, statusFilter])

  async function fetchUsers() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        role: roleFilter,
        status: statusFilter,
        page: '1',
        limit: '50',
      })

      const response = await fetch(
        `/api/admin/companies/${companyId}/users?${params}`
      )
      if (!response.ok) throw new Error('Failed to fetch users')

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 통계 */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">총 사용자</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.pagination.total}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">활성 사용자</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.users.filter((u) => u.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">관리자</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {data.users.filter((u) => u.role === 'admin').length}
            </p>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex gap-2">
            <span className="text-sm text-gray-500 self-center">역할:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                roleFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1 text-sm rounded-md ${
                roleFilter === 'admin'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              관리자
            </button>
            <button
              onClick={() => setRoleFilter('member')}
              className={`px-3 py-1 text-sm rounded-md ${
                roleFilter === 'member'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              멤버
            </button>
          </div>

          <div className="flex gap-2">
            <span className="text-sm text-gray-500 self-center">상태:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-sm rounded-md ${
                statusFilter === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              활성
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-sm rounded-md ${
                statusFilter === 'inactive'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              비활성
            </button>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : data && data.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    부서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    마지막 로그인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          user.role === 'admin'
                            ? 'default'
                            : user.role === 'manager'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {user.role === 'admin'
                          ? '관리자'
                          : user.role === 'manager'
                          ? '매니저'
                          : '멤버'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? '활성' : '비활성'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.last_login_at
                        ? format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm', {
                            locale: ko,
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(user.created_at), 'yyyy-MM-dd', { locale: ko })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">사용자가 없습니다</div>
        )}
      </div>
    </div>
  )
}
