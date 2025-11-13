'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Hospital {
  id: string
  name: string
  business_number: string | null
  address: string | null
  phone: string | null
  settings: any
}

interface HospitalSettingsFormProps {
  hospital: Hospital
  canEdit: boolean
}

export default function HospitalSettingsForm({ hospital, canEdit }: HospitalSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: hospital.name || '',
    business_number: hospital.business_number?.startsWith('TEMP-') ? '' : (hospital.business_number || ''),
    address: hospital.address || '',
    phone: hospital.phone || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      // Update hospital info
      const { error: updateError } = await supabase
        .from('hospitals')
        .update({
          name: formData.name,
          business_number: formData.business_number || null,
          address: formData.address || null,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hospital.id)

      if (updateError) throw updateError

      setSuccess(true)
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const isTempBusinessNumber = hospital.business_number?.startsWith('TEMP-')

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Temp Business Number Warning */}
      {isTempBusinessNumber && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-blue-700">
                임시 사업자번호가 등록되어 있습니다. 실제 사업자번호를 입력해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          병원명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          disabled={!canEdit}
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm"
          placeholder="예: 서울대학교병원"
        />
      </div>

      {/* Business Number */}
      <div>
        <label htmlFor="business_number" className="block text-sm font-medium text-gray-700">
          사업자등록번호
        </label>
        <input
          type="text"
          name="business_number"
          id="business_number"
          disabled={!canEdit}
          value={formData.business_number}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm"
          placeholder="123-45-67890"
          maxLength={12}
        />
        <p className="mt-1 text-xs text-gray-500">
          하이픈(-)을 포함하여 입력하세요.
        </p>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          주소
        </label>
        <input
          type="text"
          name="address"
          id="address"
          disabled={!canEdit}
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm"
          placeholder="서울특별시 종로구..."
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          대표 전화번호
        </label>
        <input
          type="tel"
          name="phone"
          id="phone"
          disabled={!canEdit}
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm"
          placeholder="02-1234-5678"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">변경사항이 저장되었습니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </form>
  )
}
