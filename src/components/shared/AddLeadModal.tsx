'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
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

    setPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 유효성 검사
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    if (!phone.trim()) {
      setError('전화번호를 입력해주세요.')
      return
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || '리드 추가에 실패했습니다.')
      }

      // 성공
      setName('')
      setPhone('')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || '리드 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setPhone('')
    setError(null)
    onClose()
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
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlusIcon className="h-5 w-5" />
                      <Dialog.Title as="h3" className="text-lg font-bold">
                        DB 수동 추가
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-white/20 rounded-full transition"
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

                  {/* 이름 */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="홍길동"
                      required
                      autoFocus
                    />
                  </div>

                  {/* 전화번호 */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      전화번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="010-1234-5678"
                      maxLength={13}
                      required
                    />
                  </div>

                  {/* 안내 메시지 */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <p className="text-xs text-blue-800">
                      💡 추가된 DB는 &ldquo;상담 전&rdquo; 상태로 저장됩니다.
                    </p>
                    <p className="text-xs text-blue-800">
                      DB를 대량으로 등록하려면{' '}
                      <Link
                        href="/dashboard/settings/sheet-sync"
                        className="font-medium underline hover:text-blue-900"
                      >
                        대량 구글스프레드시트 연동
                      </Link>
                      을 이용해주세요.
                    </p>
                  </div>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {loading ? '추가 중...' : 'DB 추가'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
