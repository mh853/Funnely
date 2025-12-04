'use client'

import { useState } from 'react'
import { UserCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import EditUserModal from './EditUserModal'
import DeleteUserModal from './DeleteUserModal'
import { formatDateTime } from '@/lib/utils/date'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface UsersListProps {
  users: User[]
  currentUserId: string
  canManage: boolean
}

export default function UsersList({ users, currentUserId, canManage }: UsersListProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  return (
    <>
      <div className="px-4 py-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  권한
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                {canManage && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="px-6 py-12 text-center">
                    <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">등록된 팀원이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isCurrentUser = user.id === currentUserId
                  return (
                    <tr key={user.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <UserCircleIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || '이름 없음'}
                              {isCurrentUser && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  본인
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(user.created_at)}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                              title="수정"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {!isCurrentUser && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="text-red-600 hover:text-red-900"
                                title="삭제"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </>
  )
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    hospital_owner: '회사 관리자',
    hospital_admin: '어드민',
    marketing_manager: '매니저',
    marketing_staff: '스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}

function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    hospital_owner: 'bg-purple-100 text-purple-800',
    hospital_admin: 'bg-blue-100 text-blue-800',
    marketing_manager: 'bg-green-100 text-green-800',
    marketing_staff: 'bg-yellow-100 text-yellow-800',
    viewer: 'bg-gray-100 text-gray-800',
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}
