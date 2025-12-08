'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

interface InviteUserModalProps {
  companyId: string
  onClose: () => void
  existingDepartments?: string[]
}

const roleOptions = [
  { value: 'user', label: '일반 사용자', description: '기본 업무 처리 및 리드 관리' },
  { value: 'manager', label: '매니저', description: '팀 관리 및 리포트 열람' },
  { value: 'admin', label: '관리자', description: '모든 권한 및 팀원 관리' },
]

export default function InviteUserModal({ companyId, onClose, existingDepartments = [] }: InviteUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('user')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Filter departments for autocomplete
  const filteredDepartments = existingDepartments.filter(
    (dept) => dept.toLowerCase().includes(department.toLowerCase()) && dept !== department
  )

  const handleCreateInvite = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          email: email || undefined,
          department: department.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '초대 링크 생성에 실패했습니다.')
      }

      setInviteUrl(data.invitation.url)
      setExpiresAt(data.invitation.expiresAt)
    } catch (err: any) {
      setError(err.message || '초대 링크 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleReset = () => {
    setInviteUrl(null)
    setExpiresAt(null)
    setEmail('')
    setDepartment('')
    setSelectedRole('user')
  }

  const formatExpiresAt = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">팀원 초대</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4">
            {/* Generated Invite Link */}
            {inviteUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <LinkIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">초대 링크가 생성되었습니다!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    아래 링크를 팀원에게 전달하세요.
                  </p>
                </div>

                {/* Link Display */}
                <div className="relative">
                  <div className="flex items-center rounded-md border border-gray-300 bg-gray-50 p-3">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="ml-2 flex-shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      title="복사"
                    >
                      {copied ? (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="mt-1 text-xs text-green-600 text-center">복사되었습니다!</p>
                  )}
                </div>

                {/* Expiration Info */}
                {expiresAt && (
                  <div className="rounded-md bg-yellow-50 p-3">
                    <p className="text-sm text-yellow-800">
                      이 링크는 <span className="font-medium">{formatExpiresAt(expiresAt)}</span>
                      까지 유효합니다.
                    </p>
                  </div>
                )}

                {/* Role Info */}
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    권한:{' '}
                    <span className="font-medium">
                      {roleOptions.find((r) => r.value === selectedRole)?.label}
                    </span>
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    새 링크 생성
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    완료
                  </button>
                </div>
              </div>
            ) : (
              /* Create Invite Form */
              <div className="space-y-4">
                {/* Email (Optional) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    이메일 (선택)
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="user@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    이메일을 입력하면 초대 기록에 표시됩니다.
                  </p>
                </div>

                {/* Department (Optional) */}
                <div className="relative">
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    담당부서 (선택)
                  </label>
                  <input
                    type="text"
                    name="department"
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    onFocus={() => setShowDepartmentSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="예: 영업팀, 마케팅팀"
                    autoComplete="off"
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
                  <p className="mt-1 text-xs text-gray-500">
                    부서를 입력하면 팀원 관리에 활용됩니다.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">권한 선택</label>
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

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInvite}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {loading ? '생성 중...' : '초대 링크 생성'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
