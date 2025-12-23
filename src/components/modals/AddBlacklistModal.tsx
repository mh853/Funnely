'use client'

import React, { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

interface AddBlacklistModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (entry: any) => void
  userId: string
}

export default function AddBlacklistModal({ isOpen, onClose, onAdd, userId }: AddBlacklistModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '')

    // 010-1234-5678 형식으로 포맷팅
    let formatted = numbers
    if (numbers.length > 3) {
      formatted = numbers.slice(0, 3) + '-' + numbers.slice(3)
    }
    if (numbers.length > 7) {
      formatted = numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11)
    }

    setPhoneNumber(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phoneNumber.trim()) {
      setError('전화번호를 입력해주세요.')
      return
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/dashboard/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: cleanPhone,
          reason: reason.trim() || null,
          blocked_by_user_id: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add blacklist entry')
      }

      const newEntry = await response.json()

      // 부모 컴포넌트에 새 항목 전달
      onAdd(newEntry)

      // 폼 초기화 및 모달 닫기
      handleClose()
    } catch (error: any) {
      console.error('Error adding blacklist entry:', error)
      setError(error.message || '블랙리스트 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setPhoneNumber('')
      setReason('')
      setError(null)
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-red-500 to-orange-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldExclamationIcon className="h-5 w-5" />
                      <Dialog.Title as="h3" className="text-lg font-bold">
                        블랙리스트 추가
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="p-2 hover:bg-white/20 rounded-full transition disabled:opacity-50"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {/* 전화번호 입력 */}
                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="phone_number"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      disabled={isSubmitting}
                      required
                      autoFocus
                      maxLength={13}
                    />
                  </div>

                  {/* 비고 입력 */}
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      비고
                    </label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="차단 사유를 입력하세요 (선택사항)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg text-sm font-semibold hover:from-red-600 hover:to-orange-700 transition shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {isSubmitting ? '추가 중...' : '추가하기'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
