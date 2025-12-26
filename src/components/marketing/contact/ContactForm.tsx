'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

const CATEGORIES = [
  { value: 'technical', label: '기술 문의' },
  { value: 'billing', label: '결제 문의' },
  { value: 'feature_request', label: '기능 요청' },
  { value: 'bug', label: '버그 신고' },
  { value: 'general', label: '일반 문의' },
]

interface FormData {
  companyName: string
  fullName: string
  email: string
  phone: string
  category: string
  subject: string
  description: string
}

const initialFormData: FormData = {
  companyName: '',
  fullName: '',
  email: '',
  phone: '',
  category: 'general',
  subject: '',
  description: '',
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '문의 전송에 실패했습니다.')
      }

      setSuccess(true)
      setTicketId(data.ticketId)
      setFormData(initialFormData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (success && ticketId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-3xl"
      >
        <div className="rounded-3xl bg-white shadow-xl ring-1 ring-gray-200 p-8 sm:p-12">
          <div className="text-center">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              문의가 성공적으로 접수되었습니다
            </h2>
            <p className="text-gray-600 mb-6">
              티켓 번호: <span className="font-mono font-semibold text-blue-600">#{ticketId.slice(0, 8).toUpperCase()}</span>
            </p>
            <div className="rounded-xl bg-blue-50 p-4 mb-6">
              <p className="text-sm text-gray-700">
                영업일 기준 24시간 내에 등록하신 이메일로 답변을 드리겠습니다.
                <br />
                빠른 시간 내에 도움을 드릴 수 있도록 최선을 다하겠습니다.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false)
                setTicketId(null)
              }}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              추가 문의하기
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mx-auto max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white shadow-xl ring-1 ring-gray-200 p-8 sm:p-12">
        <div className="space-y-6">
          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900 mb-2">
              회사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
              placeholder="회사명을 입력해주세요"
            />
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Phone & Category */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                전화번호
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-900 mb-2">
                문의 유형 <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
              placeholder="문의 제목을 입력해주세요"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
              상세 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
              placeholder="문의하실 내용을 자세히 작성해주세요"
            />
            <p className="mt-2 text-xs text-gray-500">
              문제를 빠르게 해결하기 위해 가능한 자세히 설명해주시면 감사하겠습니다.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 p-4 flex items-start gap-3">
              <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                전송 중...
              </>
            ) : (
              '문의하기'
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            문의 내용은 보안을 위해 암호화되어 전송됩니다.
          </p>
        </div>
      </form>
    </motion.div>
  )
}
