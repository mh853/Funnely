'use client'

import { useState } from 'react'
import { BellIcon, PlusIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface NotificationEmailSettingsProps {
  companyId: string
  initialEmails: string[]
  canEdit: boolean
}

export default function NotificationEmailSettings({
  companyId,
  initialEmails,
  canEdit,
}: NotificationEmailSettingsProps) {
  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [newEmail, setNewEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 이메일 유효성 검증
  const isValidEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // 이메일 추가
  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setMessage({ type: 'error', text: '이메일 주소를 입력해주세요.' })
      return
    }

    if (!isValidEmail(newEmail)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' })
      return
    }

    if (emails.includes(newEmail)) {
      setMessage({ type: 'error', text: '이미 등록된 이메일 주소입니다.' })
      return
    }

    if (emails.length >= 5) {
      setMessage({ type: 'error', text: '최대 5개까지만 등록 가능합니다.' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/notification-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '이메일 추가에 실패했습니다.')
      }

      setEmails(data.emails)
      setNewEmail('')
      setMessage({ type: 'success', text: '이메일이 추가되었습니다.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '이메일 추가에 실패했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 이메일 삭제
  const handleRemoveEmail = async (emailToRemove: string) => {
    if (!confirm(`${emailToRemove}을(를) 삭제하시겠습니까?`)) {
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/notification-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToRemove }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '이메일 삭제에 실패했습니다.')
      }

      setEmails(data.emails)
      setMessage({ type: 'success', text: '이메일이 삭제되었습니다.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '이메일 삭제에 실패했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 테스트 이메일 전송
  const handleSendTestEmail = async () => {
    if (emails.length === 0) {
      setMessage({ type: 'error', text: '등록된 이메일 주소가 없습니다.' })
      return
    }

    setTestLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/notifications/test-lead-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '테스트 이메일 전송에 실패했습니다.')
      }

      setMessage({
        type: 'success',
        text: `테스트 이메일이 전송되었습니다. (${data.sentTo} 수신)`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '테스트 이메일 전송에 실패했습니다.',
      })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 메시지 표시 */}
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
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

      {/* 등록된 이메일 목록 */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <BellIcon className="h-4 w-4 text-gray-500" />
          등록된 이메일 주소 ({emails.length}/5)
        </h3>

        {emails.length === 0 ? (
          <div className="bg-gray-50 rounded-lg px-4 py-8 text-center border border-gray-200">
            <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">등록된 이메일 주소가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">
              아래에서 알림받을 이메일 주소를 추가해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors"
              >
                <span className="text-sm text-gray-900 font-medium">{email}</span>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="삭제"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 새 이메일 추가 */}
      {canEdit && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <PlusIcon className="h-4 w-4 text-gray-500" />
            새 이메일 추가
          </h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleAddEmail()
                }
              }}
              placeholder="example@company.com"
              disabled={isLoading || emails.length >= 5}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleAddEmail}
              disabled={isLoading || !newEmail.trim() || emails.length >= 5}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '추가 중...' : '추가'}
            </button>
          </div>
          {emails.length >= 5 && (
            <p className="text-xs text-amber-600 mt-2">최대 5개까지만 등록할 수 있습니다.</p>
          )}
        </div>
      )}

      {/* 테스트 이메일 전송 (개발 모드에서만 표시) */}
      {process.env.NODE_ENV === 'development' && canEdit && emails.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <PaperAirplaneIcon className="h-4 w-4 text-gray-500" />
            테스트 이메일 전송
          </h3>
          <button
            onClick={handleSendTestEmail}
            disabled={testLoading}
            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {testLoading ? '전송 중...' : '테스트 메일 보내기'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            등록된 모든 이메일 주소로 테스트 알림을 전송합니다.
          </p>
        </div>
      )}

      {/* 권한 없음 안내 */}
      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <p className="text-sm text-yellow-800">
            이메일 알림 설정은 회사 관리자만 수정할 수 있습니다.
          </p>
        </div>
      )}

      {/* 알림 발송 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📧 이메일 발송 안내</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 매일 오전 8시에 전날 접수된 리드를 정리하여 발송됩니다.</li>
          <li>• 새로운 리드가 없는 경우 이메일이 발송되지 않습니다.</li>
          <li>• 최대 5개의 이메일 주소를 등록할 수 있습니다.</li>
          <li>• 이메일에는 고객명, 연락처, 랜딩페이지 정보, 유입 경로가 포함됩니다.</li>
        </ul>
      </div>
    </div>
  )
}
