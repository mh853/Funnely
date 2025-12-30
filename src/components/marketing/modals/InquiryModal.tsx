'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  SparklesIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon
} from '@heroicons/react/24/solid'

interface InquiryModalProps {
  isOpen: boolean
  onClose: () => void
  inquiryType: 'general' | 'sales'
}

export default function InquiryModal({ isOpen, onClose, inquiryType }: InquiryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSales = inquiryType === 'sales'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/public/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          inquiry_type: inquiryType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit inquiry')
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setIsSuccess(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: '',
          message: '',
        })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
                {/* Gradient Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 py-6">
                  {/* Background decoration */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>

                  {/* Header content */}
                  <div className="relative text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 shadow-xl">
                      <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <Dialog.Title
                      as="h3"
                      className="text-2xl font-bold text-white mb-1"
                    >
                      {isSales ? '영업팀과 상담하기' : '문의하기'}
                    </Dialog.Title>
                    <p className="text-blue-100 text-sm">
                      {isSales
                        ? '맞춤형 기업 솔루션을 제안해드립니다'
                        : '궁금하신 점을 남겨주시면 빠르게 답변드립니다'}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  {/* Success State */}
                  {isSuccess && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mb-4 shadow-xl">
                        <CheckCircleIcon className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        문의가 접수되었습니다!
                      </h4>
                      <p className="text-gray-600">
                        {isSales
                          ? '영업팀이 영업일 기준 1일 이내에 연락드립니다.'
                          : '빠른 시일 내에 담당자가 연락드리겠습니다.'}
                      </p>
                    </div>
                  )}

                  {/* Form */}
                  {!isSuccess && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name & Email */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label
                            htmlFor="name"
                            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          >
                            <UserIcon className="h-4 w-4 text-blue-600" />
                            이름 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="홍길동"
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            htmlFor="email"
                            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          >
                            <EnvelopeIcon className="h-4 w-4 text-blue-600" />
                            이메일 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="hong@example.com"
                          />
                        </div>
                      </div>

                      {/* Phone & Company */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label
                            htmlFor="phone"
                            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          >
                            <PhoneIcon className="h-4 w-4 text-blue-600" />
                            연락처
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="010-1234-5678"
                          />
                        </div>
                        <div className="space-y-1">
                          <label
                            htmlFor="company"
                            className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                          >
                            <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
                            회사명{isSales && <span className="text-red-500"> *</span>}
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            required={isSales}
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="(주)회사명"
                          />
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1">
                        <label
                          htmlFor="subject"
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                        >
                          제목 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          placeholder={
                            isSales
                              ? '영업 문의 - 기업용 플랜 상담'
                              : '문의 제목을 입력하세요'
                          }
                        />
                      </div>

                      {/* Message */}
                      <div className="space-y-1">
                        <label
                          htmlFor="message"
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900"
                        >
                          {isSales ? '상담 내용' : '문의 내용'}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={4}
                          value={formData.message}
                          onChange={handleChange}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                          placeholder={
                            isSales
                              ? '예상 사용 인원, 필요한 기능, 도입 시기 등을 알려주시면 더 정확한 상담이 가능합니다.'
                              : '문의 내용을 상세히 입력해주세요.'
                          }
                        />
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          </div>
                          <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                      )}

                      {/* Info Box */}
                      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">i</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">
                            {isSales
                              ? '영업팀이 영업일 기준 1일 이내에 연락드립니다. 빠른 상담을 원하시면 연락처를 꼭 남겨주세요.'
                              : '접수된 문의는 영업일 기준 2-3일 이내에 답변드립니다. 긴급한 문의는 채팅 상담을 이용해주세요.'}
                          </p>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-4 pt-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                              제출 중...
                            </span>
                          ) : (
                            '문의 제출'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
