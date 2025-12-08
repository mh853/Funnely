'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCircleIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  simple_role?: string
  short_id?: string
  created_at: string
}

interface TeamMembersListProps {
  members: TeamMember[]
  currentUserId: string
  canManage: boolean
}

export default function TeamMembersList({
  members,
  currentUserId,
  canManage,
}: TeamMembersListProps) {
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedShortId, setCopiedShortId] = useState<string | null>(null)

  const handleCopyShortId = async (shortId: string) => {
    try {
      await navigator.clipboard.writeText(shortId)
      setCopiedShortId(shortId)
      setTimeout(() => setCopiedShortId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleRoleChange = async (memberId: string) => {
    if (!selectedRole) return

    setLoading(true)
    setMessage(null)

    // simple_role을 legacy role로 매핑
    const legacyRoleMap: Record<string, string> = {
      admin: 'hospital_admin',
      manager: 'marketing_manager',
      user: 'marketing_staff',
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          simple_role: selectedRole,
          role: legacyRoleMap[selectedRole] || 'marketing_staff'
        })
        .eq('id', memberId)

      if (error) throw error

      setMessage({ type: 'success', text: '권한이 변경되었습니다.' })
      setEditingMember(null)

      // Refresh page
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '권한 변경에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('정말 이 팀원을 삭제하시겠습니까?')) return

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      // Delete user from database
      const { error } = await supabase.from('users').delete().eq('id', memberId)

      if (error) throw error

      setMessage({ type: 'success', text: '팀원이 삭제되었습니다.' })

      // Refresh page
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '팀원 삭제에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  // simple_role 기반 라벨 (새 권한 시스템)
  const getSimpleRoleLabel = (simpleRole?: string): string => {
    const labels: Record<string, string> = {
      admin: '관리자',
      manager: '매니저',
      user: '일반 사용자',
    }
    return simpleRole ? labels[simpleRole] || simpleRole : '일반 사용자'
  }

  // simple_role 기반 배지 색상
  const getSimpleRoleBadgeColor = (simpleRole?: string): string => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    }
    return simpleRole ? colors[simpleRole] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                사용자
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                유입 ID
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                권한
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                가입일
              </th>
              {canManage && (
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">작업</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {members.map((member) => {
              const isCurrentUser = member.id === currentUserId
              const isEditing = editingMember === member.id

              return (
                <tr key={member.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                    <div className="flex items-center">
                      <UserCircleIcon className="h-10 w-10 text-gray-400" />
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          {member.full_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">(나)</span>
                          )}
                        </div>
                        <div className="text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {member.short_id ? (
                      <div className="flex items-center gap-1.5">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                          {member.short_id}
                        </code>
                        <button
                          onClick={() => handleCopyShortId(member.short_id!)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="복사"
                        >
                          {copiedShortId === member.short_id ? (
                            <CheckIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={loading}
                        >
                          <option value="">선택</option>
                          <option value="admin">관리자</option>
                          <option value="manager">매니저</option>
                          <option value="user">일반 사용자</option>
                        </select>
                        <button
                          onClick={() => handleRoleChange(member.id)}
                          disabled={loading || !selectedRole}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingMember(null)}
                          disabled={loading}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getSimpleRoleBadgeColor(
                          member.simple_role
                        )}`}
                      >
                        {getSimpleRoleLabel(member.simple_role)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDateTime(member.created_at)}
                  </td>
                  {canManage && (
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end space-x-2">
                        {!isCurrentUser && member.simple_role !== 'admin' && !isEditing && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMember(member.id)
                                setSelectedRole(member.simple_role || 'user')
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              disabled={loading}
                            >
                              권한 변경
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-red-600 hover:text-red-900"
                              disabled={loading}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
