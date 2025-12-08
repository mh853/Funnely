'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  UserCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/date'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  simple_role?: string
  short_id?: string
  department?: string
  created_at: string
}

interface TeamMemberDetailModalProps {
  member: TeamMember
  currentUserId: string
  canManage: boolean
  existingDepartments: string[]
  onClose: () => void
  onUpdate: () => void
}

const roleOptions = [
  { value: 'user', label: '일반 사용자', description: '기본 업무 처리 및 리드 관리' },
  { value: 'manager', label: '매니저', description: '팀 관리 및 리포트 열람' },
  { value: 'admin', label: '관리자', description: '모든 권한 및 팀원 관리' },
]

export default function TeamMemberDetailModal({
  member,
  currentUserId,
  canManage,
  existingDepartments,
  onClose,
  onUpdate,
}: TeamMemberDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedShortId, setCopiedShortId] = useState(false)

  // Form states
  const [selectedRole, setSelectedRole] = useState(member.simple_role || 'user')
  const [department, setDepartment] = useState(member.department || '')
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false)

  const isCurrentUser = member.id === currentUserId
  const canEdit = canManage && !isCurrentUser

  // Filter departments for autocomplete
  const filteredDepartments = existingDepartments.filter(
    (dept) => dept.toLowerCase().includes(department.toLowerCase()) && dept !== department
  )

  const handleCopyShortId = async () => {
    if (!member.short_id) return
    try {
      await navigator.clipboard.writeText(member.short_id)
      setCopiedShortId(true)
      setTimeout(() => setCopiedShortId(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleSave = async () => {
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
      const updateData: Record<string, any> = {
        department: department.trim() || null,
      }

      // Only update role if user can edit and it's different
      if (canEdit && selectedRole !== member.simple_role) {
        updateData.simple_role = selectedRole
        updateData.role = legacyRoleMap[selectedRole] || 'marketing_staff'
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', member.id)

      if (error) throw error

      setMessage({ type: 'success', text: '정보가 저장되었습니다.' })
      setTimeout(() => {
        onUpdate()
        onClose()
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '저장에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 팀원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('users').delete().eq('id', member.id)

      if (error) throw error

      setMessage({ type: 'success', text: '팀원이 삭제되었습니다.' })
      setTimeout(() => {
        onUpdate()
        onClose()
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '삭제에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  // Check if there are changes
  const hasChanges =
    department !== (member.department || '') ||
    (canEdit && selectedRole !== (member.simple_role || 'user'))

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              팀원 상세 정보
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Message */}
            {message && (
              <div
                className={`rounded-md p-3 ${
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

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <UserCircleIcon className="h-16 w-16 text-gray-400" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {member.full_name}
                  {isCurrentUser && (
                    <span className="ml-2 text-sm font-normal text-gray-500">(나)</span>
                  )}
                </h3>
                <p className="text-gray-500">{member.email}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100">
              {/* Short ID */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">유입 ID</label>
                {member.short_id ? (
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
                      {member.short_id}
                    </code>
                    <button
                      onClick={handleCopyShortId}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="복사"
                    >
                      {copiedShortId ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>

              {/* Created At */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">가입일</label>
                <p className="text-sm text-gray-700">{formatDateTime(member.created_at)}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              {/* Department */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">담당부서</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  onFocus={() => setShowDepartmentSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="예: 영업팀, 마케팅팀"
                  autoComplete="off"
                  disabled={loading}
                />
                {showDepartmentSuggestions && filteredDepartments.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5">
                    {filteredDepartments.map((dept) => (
                      <li
                        key={dept}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                        onMouseDown={() => {
                          setDepartment(dept)
                          setShowDepartmentSuggestions(false)
                        }}
                      >
                        {dept}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Role Selection - Only for non-self users */}
              {canEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">권한</label>
                  <div className="space-y-2">
                    {roleOptions.map((role) => (
                      <label
                        key={role.value}
                        className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedRole === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={selectedRole === role.value}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          disabled={loading}
                        />
                        <div className="ml-3">
                          <span className="block text-sm font-medium text-gray-900">
                            {role.label}
                          </span>
                          <span className="block text-xs text-gray-500">{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Read-only role for self */}
              {isCurrentUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
                  <p className="text-sm text-gray-600">
                    {roleOptions.find((r) => r.value === member.simple_role)?.label || '일반 사용자'}
                    <span className="text-gray-400 ml-2">(본인 권한은 변경할 수 없습니다)</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            {/* Delete Button - Only for non-self, non-admin users */}
            <div>
              {canEdit && member.simple_role !== 'admin' && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  팀원 삭제
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !hasChanges}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
