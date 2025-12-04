'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
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

  const handleRoleChange = async (memberId: string) => {
    if (!selectedRole) return

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
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

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      hospital_owner: '회사 관리자',
      hospital_admin: '회사 어드민',
      marketing_manager: '마케팅 매니저',
      marketing_staff: '마케팅 스태프',
      viewer: '뷰어',
    }
    return labels[role] || role
  }

  const getRoleBadgeColor = (role: string): string => {
    const colors: Record<string, string> = {
      hospital_owner: 'bg-purple-100 text-purple-800',
      hospital_admin: 'bg-blue-100 text-blue-800',
      marketing_manager: 'bg-green-100 text-green-800',
      marketing_staff: 'bg-yellow-100 text-yellow-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
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
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={loading}
                        >
                          <option value="">선택</option>
                          <option value="hospital_admin">회사 어드민</option>
                          <option value="marketing_manager">마케팅 매니저</option>
                          <option value="marketing_staff">마케팅 스태프</option>
                          <option value="viewer">뷰어</option>
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
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRoleBadgeColor(
                          member.role
                        )}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDateTime(member.created_at)}
                  </td>
                  {canManage && (
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end space-x-2">
                        {!isCurrentUser && member.role !== 'hospital_owner' && !isEditing && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMember(member.id)
                                setSelectedRole(member.role)
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
