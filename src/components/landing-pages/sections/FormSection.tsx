'use client'

import { useState } from 'react'
import { Section } from '@/types/landing-page.types'

interface FormSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
  landingPageId: string
}

// 전화번호 자동 포맷팅 함수 (숫자만 입력해도 xxx-xxxx-xxxx 형태로 변환)
const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '')

  // 최대 11자리로 제한
  const limited = numbers.slice(0, 11)

  // 포맷팅 적용
  if (limited.length <= 3) {
    return limited
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
  }
}

export default function FormSection({ section, themeColors, landingPageId }: FormSectionProps) {
  const primaryColor = themeColors.primary || '#3B82F6'
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalize fields to always be string array
  const rawFields = section.props?.fields || ['name', 'phone', 'email']
  const fields = Array.isArray(rawFields)
    ? rawFields.map((f: any) => (typeof f === 'string' ? f : f.name || f.type || 'field'))
    : ['name', 'phone', 'email']

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      name: '이름',
      phone: '전화번호',
      email: '이메일',
    }
    return labels[field] || field
  }

  const getFieldType = (field: string) => {
    if (field === 'email') return 'email'
    if (field === 'phone') return 'tel'
    return 'text'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search)
      const utmParams = {
        utm_source: urlParams.get('utm_source') || undefined,
        utm_medium: urlParams.get('utm_medium') || undefined,
        utm_campaign: urlParams.get('utm_campaign') || undefined,
        utm_content: urlParams.get('utm_content') || undefined,
        utm_term: urlParams.get('utm_term') || undefined,
      }

      const response = await fetch('/api/landing-pages/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landing_page_id: landingPageId,
          form_data: formData,
          utm_params: utmParams,
          metadata: {
            referrer: document.referrer,
            user_agent: navigator.userAgent,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || '제출에 실패했습니다')
      }

      setSubmitted(true)
      setFormData({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">신청 완료!</h2>
          <p className="text-gray-600">
            {section.props?.successMessage || '신청이 완료되었습니다. 빠른 시일 내에 연락드리겠습니다.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {section.props?.title || '신청하기'}
        </h2>
        <p className="text-gray-600 mb-6">{section.props?.description || '양식을 작성해주세요'}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field: string, index: number) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {getFieldLabel(field)}
                {section.props?.requiredFields?.includes(field) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type={getFieldType(field)}
                required={section.props?.requiredFields?.includes(field)}
                value={formData[field] || ''}
                onChange={(e) => {
                  const value = field === 'phone'
                    ? formatPhoneNumber(e.target.value)
                    : e.target.value
                  setFormData({ ...formData, [field]: value })
                }}
                placeholder={field === 'phone' ? '01012345678' : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-offset-2 transition-colors"
                style={{ focusRing: primaryColor } as any}
                disabled={loading}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {loading
              ? '제출 중...'
              : section.props?.submitButtonText || '제출'}
          </button>
        </form>
      </div>
    </section>
  )
}
