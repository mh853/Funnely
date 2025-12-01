'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DeleteLandingPageModalProps {
  landingPage: {
    id: string
    title: string
    slug: string
  }
  isOpen: boolean
  onClose: () => void
}

export default function DeleteLandingPageModal({
  landingPage,
  isOpen,
  onClose,
}: DeleteLandingPageModalProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmText !== landingPage.title) {
      setError('랜딩페이지 이름이 일치하지 않습니다.')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/landing-pages/${landingPage.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || data.error || '삭제 중 오류가 발생했습니다.')
      }

      // Success - close modal and refresh
      onClose()
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">랜딩페이지 삭제</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm font-semibold text-red-900 mb-2">
              ⚠️ 이 작업은 되돌릴 수 없습니다
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>랜딩페이지가 즉시 비활성화됩니다</li>
              <li>모든 설정과 데이터가 삭제됩니다</li>
              <li>수집된 리드 데이터는 유지됩니다</li>
              <li>통계 데이터는 삭제됩니다</li>
            </ul>
          </div>

          {/* Landing Page Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">삭제할 랜딩페이지</div>
            <div className="font-semibold text-gray-900">{landingPage.title}</div>
            <div className="text-sm text-gray-500 mt-1">/{landingPage.slug}</div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              삭제를 확인하려면 랜딩페이지 이름을 정확히 입력하세요:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError('')
              }}
              placeholder={landingPage.title}
              disabled={isDeleting}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== landingPage.title}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                삭제 중...
              </>
            ) : (
              '영구 삭제'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
