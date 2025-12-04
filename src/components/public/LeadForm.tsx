'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/types/landing-page.types'
import { formatDateTime } from '@/lib/utils/date'

interface LeadFormProps {
  landingPageId: string
  slug: string
  fields: FormField[]
  successMessage?: string
  enableTimer?: boolean
  timerDeadline?: string
  enableCounter?: boolean
  counterLimit?: number
  counterCurrent?: number
  primaryColor?: string
}

export default function LeadForm({
  landingPageId,
  slug,
  fields,
  successMessage = '신청이 완료되었습니다. 곧 연락드리겠습니다.',
  enableTimer,
  timerDeadline,
  enableCounter,
  counterLimit,
  counterCurrent = 0,
  primaryColor = '#3B82F6',
}: LeadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search)
      const utm_source = urlParams.get('utm_source')
      const utm_medium = urlParams.get('utm_medium')
      const utm_campaign = urlParams.get('utm_campaign')
      const utm_content = urlParams.get('utm_content')
      const utm_term = urlParams.get('utm_term')
      const referrer = document.referrer

      const res = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landing_page_id: landingPageId,
          form_data: formData,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          referrer,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || '신청에 실패했습니다.')
      }

      // 신청 성공 시 완료 페이지로 리다이렉트
      router.push(`/landing/completed/${slug}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: FormField) => {
    const commonClasses =
      'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500'

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            rows={4}
            className={commonClasses}
            placeholder={field.placeholder}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        )

      case 'select':
        return (
          <select
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            className={commonClasses}
          >
            <option value="">선택하세요</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="mt-2 space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  required={field.required}
                  checked={formData[field.id] === option}
                  onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  style={{ accentColor: primaryColor }}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="mt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                id={field.id}
                required={field.required}
                checked={formData[field.id] || false}
                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                style={{ accentColor: primaryColor }}
              />
              <span className="ml-2 text-sm text-gray-700">{field.label}</span>
            </label>
          </div>
        )

      default:
        return (
          <input
            type={field.type}
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            className={commonClasses}
            placeholder={field.placeholder}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
          />
        )
    }
  }

  const remainingSlots = enableCounter ? counterLimit! - counterCurrent : 0

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Timer Plugin */}
      {enableTimer && timerDeadline && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-sm text-red-800 font-medium">⏰ 마감까지</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatDateTime(timerDeadline)}
          </p>
        </div>
      )}

      {/* Counter Plugin */}
      {enableCounter && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-sm text-yellow-800 font-medium">🔥 남은 신청 가능 수</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {remainingSlots > 0 ? remainingSlots : 0}명
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map((field) => (
          <div key={field.id}>
            {field.type !== 'checkbox' && (
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}

        <button
          type="submit"
          disabled={loading || (enableCounter && remainingSlots <= 0)}
          className="w-full px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          style={{ backgroundColor: primaryColor }}
        >
          {loading
            ? '신청 중...'
            : enableCounter && remainingSlots <= 0
            ? '마감되었습니다'
            : '무료 상담 신청하기'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          개인정보는 안전하게 암호화되어 저장됩니다.
        </p>
      </form>
    </div>
  )
}
