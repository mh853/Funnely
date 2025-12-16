'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Users, Shield } from 'lucide-react'
import { AdminRole } from '@/types/rbac'

interface RolesWithCounts extends AdminRole {
  userCount?: number
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RolesWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null)

  // 역할 목록 가져오기
  const fetchRoles = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/roles?includeUsers=true')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch roles')
      }

      const data = await response.json()
      const rolesWithCounts = data.roles.map((role: AdminRole) => ({
        ...role,
        userCount: data.userCounts?.[role.id] || 0,
      }))

      setRoles(rolesWithCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  // 역할 삭제
  const handleDelete = async (role: AdminRole) => {
    if (
      !confirm(
        `정말로 "${role.name}" 역할을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete role')
      }

      // 목록 새로고침
      await fetchRoles()

      alert('역할이 삭제되었습니다.')
    } catch (err) {
      alert(
        `역할 삭제 실패: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  // 기본 역할 여부 확인
  const isDefaultRole = (code: string) => {
    return ['super_admin', 'cs_manager', 'finance', 'analyst'].includes(code)
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">오류 발생</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchRoles}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            역할 관리
          </h1>
          <p className="text-gray-500 mt-1">
            관리자 역할과 권한을 관리합니다
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          새 역할 만들기
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-gray-500 text-sm mb-1">전체 역할</div>
          <div className="text-2xl font-bold text-gray-900">
            {roles.length}개
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-gray-500 text-sm mb-1">기본 역할</div>
          <div className="text-2xl font-bold text-gray-900">
            {roles.filter((r) => isDefaultRole(r.code)).length}개
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-gray-500 text-sm mb-1">커스텀 역할</div>
          <div className="text-2xl font-bold text-gray-900">
            {roles.filter((r) => !isDefaultRole(r.code)).length}개
          </div>
        </div>
      </div>

      {/* 역할 목록 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  권한 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => {
                const isDefault = isDefaultRole(role.code)

                return (
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">
                          {role.name}
                        </div>
                        {isDefault && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            기본
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        코드: {role.code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {role.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {role.permissions.length}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Users className="w-4 h-4 text-gray-400" />
                        {role.userCount || 0}명
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingRole(role)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {!isDefault && (
                          <button
                            onClick={() => handleDelete(role)}
                            disabled={
                              role.userCount !== undefined &&
                              role.userCount > 0
                            }
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              role.userCount && role.userCount > 0
                                ? '할당된 사용자가 있어 삭제할 수 없습니다'
                                : '삭제'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 빈 상태 */}
        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">생성된 역할이 없습니다.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              첫 역할 만들기
            </button>
          </div>
        )}
      </div>

      {/* 설명 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">역할 관리 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • 기본 역할(super_admin, cs_manager, finance, analyst)은 삭제할 수
            없습니다.
          </li>
          <li>• 사용자가 할당된 역할은 삭제할 수 없습니다.</li>
          <li>
            • 역할 수정은 이름, 설명, 권한만 가능하며 코드는 변경할 수
            없습니다.
          </li>
          <li>
            • 슈퍼 관리자(super_admin) 역할은 모든 권한을 자동으로 보유합니다.
          </li>
        </ul>
      </div>

      {/* 모달 컴포넌트들은 추후 구현 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">새 역할 만들기</h2>
            <p className="text-gray-500">
              역할 생성 모달은 별도 컴포넌트로 구현 예정
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">역할 수정</h2>
            <p className="text-gray-500">
              역할 수정 모달은 별도 컴포넌트로 구현 예정
            </p>
            <button
              onClick={() => setEditingRole(null)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
