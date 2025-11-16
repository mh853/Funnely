'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField, FormFieldType } from '@/types/landing-page.types'
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

interface FormBuilderProps {
  hospitalId: string
  initialData?: any
}

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: '텍스트' },
  { value: 'email', label: '이메일' },
  { value: 'tel', label: '전화번호' },
  { value: 'textarea', label: '긴 텍스트' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'time', label: '시간' },
  { value: 'select', label: '선택 (드롭다운)' },
  { value: 'radio', label: '라디오 버튼' },
  { value: 'checkbox', label: '체크박스' },
]

export default function FormBuilder({ hospitalId, initialData }: FormBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    fields: initialData?.fields || [
      { id: 'name', type: 'text' as FormFieldType, label: '이름', required: true },
      { id: 'phone', type: 'tel' as FormFieldType, label: '전화번호', required: true },
      { id: 'email', type: 'email' as FormFieldType, label: '이메일', required: false },
    ],
    success_message: initialData?.success_message || '신청이 완료되었습니다. 곧 연락드리겠습니다.',
    enable_timer: initialData?.enable_timer || false,
    timer_deadline: initialData?.timer_deadline || '',
    enable_counter: initialData?.enable_counter || false,
    counter_limit: initialData?.counter_limit || 100,
    is_active: initialData?.is_active ?? true,
  })

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '새 필드',
      required: false,
    }
    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    })
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...formData.fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFormData({ ...formData, fields: newFields })
  }

  const removeField = (index: number) => {
    const newFields = formData.fields.filter((_, i) => i !== index)
    setFormData({ ...formData, fields: newFields })
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newFields.length) return

    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    setFormData({ ...formData, fields: newFields })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/form-templates', {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hospital_id: hospitalId,
          id: initialData?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '저장 실패')
      }

      const data = await res.json()
      router.push(`/dashboard/form-templates/${data.data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">기본 정보</h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            템플릿 이름 *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="예: 무료 상담 신청 폼"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            설명
          </label>
          <textarea
            id="description"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="폼에 대한 간단한 설명"
          />
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">폼 필드</h2>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            필드 추가
          </button>
        </div>

        <div className="space-y-4">
          {formData.fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-gray-200 rounded-lg p-4 space-y-4 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      필드 ID
                    </label>
                    <input
                      type="text"
                      value={field.id}
                      onChange={(e) => updateField(index, { id: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="field_name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      라벨
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="필드 이름"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      타입
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value as FormFieldType })
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => moveField(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 'down')}
                    disabled={index === formData.fields.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowDownIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">필수 입력</span>
                </label>

                {field.type === 'text' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-600">최소 길이:</label>
                      <input
                        type="number"
                        value={field.validation?.minLength || ''}
                        onChange={(e) =>
                          updateField(index, {
                            validation: {
                              ...field.validation,
                              minLength: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-600">최대 길이:</label>
                      <input
                        type="number"
                        value={field.validation?.maxLength || ''}
                        onChange={(e) =>
                          updateField(index, {
                            validation: {
                              ...field.validation,
                              maxLength: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="∞"
                        min="1"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">완료 메시지</h2>

        <div>
          <label htmlFor="success_message" className="block text-sm font-medium text-gray-700">
            신청 완료 메시지
          </label>
          <textarea
            id="success_message"
            rows={3}
            value={formData.success_message}
            onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Plugins */}
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">플러그인</h2>

        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="enable_timer"
                type="checkbox"
                checked={formData.enable_timer}
                onChange={(e) => setFormData({ ...formData, enable_timer: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="enable_timer" className="font-medium text-gray-700">
                타이머 활성화
              </label>
              <p className="text-sm text-gray-500">마감 시간을 표시하여 신청 긴급성 강조</p>
              {formData.enable_timer && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={formData.timer_deadline}
                    onChange={(e) => setFormData({ ...formData, timer_deadline: e.target.value })}
                    className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Counter */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="enable_counter"
                type="checkbox"
                checked={formData.enable_counter}
                onChange={(e) => setFormData({ ...formData, enable_counter: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3 flex-1">
              <label htmlFor="enable_counter" className="font-medium text-gray-700">
                카운터 활성화
              </label>
              <p className="text-sm text-gray-500">남은 신청 가능 수를 표시하여 희소성 강조</p>
              {formData.enable_counter && (
                <div className="mt-2">
                  <label className="block text-sm text-gray-700 mb-1">신청 한도</label>
                  <input
                    type="number"
                    value={formData.counter_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, counter_limit: parseInt(e.target.value) })
                    }
                    className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <input
            id="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="ml-3 font-medium text-gray-700">
            활성 상태
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : initialData ? '수정' : '생성'}
        </button>
      </div>
    </form>
  )
}
