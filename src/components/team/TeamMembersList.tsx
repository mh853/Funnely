'use client'

import { useState } from 'react'
import { UserCircleIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'
import TeamMemberDetailModal from './TeamMemberDetailModal'

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

interface TeamMembersListProps {
  members: TeamMember[]
  currentUserId: string
  canManage: boolean
  existingDepartments?: string[]
}

export default function TeamMembersList({
  members,
  currentUserId,
  canManage,
  existingDepartments = [],
}: TeamMembersListProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [copiedShortId, setCopiedShortId] = useState<string | null>(null)

  const handleCopyShortId = async (e: React.MouseEvent, shortId: string) => {
    e.stopPropagation() // Prevent row click
    try {
      await navigator.clipboard.writeText(shortId)
      setCopiedShortId(shortId)
      setTimeout(() => setCopiedShortId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleRowClick = (member: TeamMember) => {
    setSelectedMember(member)
  }

  const handleUpdate = () => {
    window.location.reload()
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
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-6 pr-4 text-left text-sm font-semibold text-gray-900 sm:pl-8">
                사용자
              </th>
              <th className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                담당부서
              </th>
              <th className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                유입 ID
              </th>
              <th className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">
                권한
              </th>
              <th className="px-6 py-3.5 pr-8 text-left text-sm font-semibold text-gray-900">
                가입일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {members.map((member) => {
              const isCurrentUser = member.id === currentUserId

              return (
                <tr
                  key={member.id}
                  onClick={() => handleRowClick(member)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="whitespace-nowrap py-4 pl-6 pr-4 sm:pl-8">
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
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={member.department ? 'text-gray-700' : 'text-gray-400'}>
                      {member.department || '-'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {member.short_id ? (
                      <div className="flex items-center gap-1.5">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                          {member.short_id}
                        </code>
                        <button
                          onClick={(e) => handleCopyShortId(e, member.short_id!)}
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
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getSimpleRoleBadgeColor(
                        member.simple_role
                      )}`}
                    >
                      {getSimpleRoleLabel(member.simple_role)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 pr-8 text-sm text-gray-500">
                    {formatDateTime(member.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedMember && (
        <TeamMemberDetailModal
          member={selectedMember}
          currentUserId={currentUserId}
          canManage={canManage}
          existingDepartments={existingDepartments}
          onClose={() => setSelectedMember(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
