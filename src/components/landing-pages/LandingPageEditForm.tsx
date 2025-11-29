'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface LandingPageEditFormProps {
  landingPage: any
  companyId: string
  userId: string
}

interface CustomField {
  id: string
  type: 'short_answer' | 'multiple_choice'
  question: string
  options?: string[]
}

export default function LandingPageEditForm({
  landingPage,
  companyId,
  userId,
}: LandingPageEditFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Parse existing custom fields from database
  const parseExistingFields = () => {
    if (!landingPage.collect_fields || !Array.isArray(landingPage.collect_fields)) {
      return []
    }

    return landingPage.collect_fields
      .filter((field: any) =>
        field.type === 'short_answer' || field.type === 'multiple_choice'
      )
      .map((field: any, index: number) => ({
        id: `field-${index}-${Date.now()}`,
        type: field.type,
        question: field.question || '',
        options: field.options || (field.type === 'multiple_choice' ? [''] : undefined),
      }))
  }

  // Check if field exists in collect_fields
  const hasFixedField = (fieldType: string) => {
    if (!landingPage.collect_fields || !Array.isArray(landingPage.collect_fields)) {
      return fieldType === 'name' || fieldType === 'phone' // default true for name and phone
    }
    return landingPage.collect_fields.some((f: any) => f.type === fieldType)
  }

  // Form state
  const [slug, setSlug] = useState(landingPage.slug || '')
  const [title, setTitle] = useState(landingPage.title || '')
  const [images, setImages] = useState<string[]>(landingPage.images || [])
  const [collectData, setCollectData] = useState(landingPage.collect_data !== false)
  const [collectName, setCollectName] = useState(hasFixedField('name'))
  const [collectPhone, setCollectPhone] = useState(hasFixedField('phone'))

  // Dynamic custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>(parseExistingFields())
  const [showFieldTypeModal, setShowFieldTypeModal] = useState(false)

  const [realtimeEnabled, setRealtimeEnabled] = useState(landingPage.realtime_enabled !== false)
  const [ctaEnabled, setCtaEnabled] = useState(landingPage.cta_enabled !== false)
  const [ctaText, setCtaText] = useState(landingPage.cta_text || '')
  const [ctaColor, setCtaColor] = useState(landingPage.cta_color || '#6366f1')
  const [timerEnabled, setTimerEnabled] = useState(landingPage.timer_enabled || false)
  const [callButtonEnabled, setCallButtonEnabled] = useState(landingPage.call_button_enabled !== false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Add new custom field
  const addCustomField = (type: 'short_answer' | 'multiple_choice') => {
    const newField: CustomField = {
      id: Date.now().toString(),
      type,
      question: '',
      options: type === 'multiple_choice' ? [''] : undefined,
    }
    setCustomFields([...customFields, newField])
    setShowFieldTypeModal(false)
  }

  // Remove custom field
  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id))
  }

  // Update field question
  const updateFieldQuestion = (id: string, question: string) => {
    setCustomFields(customFields.map(field =>
      field.id === id ? { ...field, question } : field
    ))
  }

  // Add option to multiple choice field
  const addOption = (fieldId: string) => {
    setCustomFields(customFields.map(field => {
      if (field.id === fieldId && field.options) {
        return { ...field, options: [...field.options, ''] }
      }
      return field
    }))
  }

  // Update option
  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    setCustomFields(customFields.map(field => {
      if (field.id === fieldId && field.options) {
        const newOptions = [...field.options]
        newOptions[optionIndex] = value
        return { ...field, options: newOptions }
      }
      return field
    }))
  }

  // Remove option
  const removeOption = (fieldId: string, optionIndex: number) => {
    setCustomFields(customFields.map(field => {
      if (field.id === fieldId && field.options && field.options.length > 1) {
        return { ...field, options: field.options.filter((_, i) => i !== optionIndex) }
      }
      return field
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      // Build collect_fields array
      const collectFields = []
      if (collectName) collectFields.push({ type: 'name', required: true })
      if (collectPhone) collectFields.push({ type: 'phone', required: true })

      // Add custom fields
      customFields.forEach(field => {
        collectFields.push({
          type: field.type,
          question: field.question,
          options: field.options,
        })
      })

      const { error: updateError } = await supabase
        .from('landing_pages')
        .update({
          slug,
          title,
          images,
          collect_data: collectData,
          collect_fields: collectFields,
          realtime_enabled: realtimeEnabled,
          cta_enabled: ctaEnabled,
          cta_text: ctaText,
          cta_color: ctaColor,
          timer_enabled: timerEnabled,
          call_button_enabled: callButtonEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', landingPage.id)
        .eq('company_id', companyId)

      if (updateError) throw updateError

      router.push('/dashboard/landing-pages')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
    setImages([...images, ...newImages])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* URL Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            랜딩페이지 주소
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                https://funnely.co.kr/landing/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                placeholder="페이지-주소"
              />
            </div>
            {slug && !/^[a-z0-9-]+$/.test(slug) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <XMarkIcon className="h-4 w-4" />
                URL 슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용
              </p>
            )}
            <p className="text-xs text-gray-500">
              💡 자동 생성: 한글 제목을 영문으로 변환 | 수동 입력: 영문 소문자, 숫자, 하이픈(-) 사용
            </p>
          </div>
        </div>

        {/* Title Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            랜딩페이지 이름
          </h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            placeholder="랜딩페이지 제목 입력"
          />
        </div>

        {/* Images Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            이미지/영상 등록
          </h2>
          <div className="space-y-4">
            <label className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer gap-2">
              <PhotoIcon className="h-5 w-5" />
              파일 업로드
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group bg-gray-50 rounded-xl p-3 border-2 border-gray-200"
                  >
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-600 text-center mt-2 truncate">
                      이미지 {index + 1}.png
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DB Collection Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">DB 수집 항목</h2>
          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={collectData}
                  onChange={() => setCollectData(true)}
                  className="w-5 h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900">사용함</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!collectData}
                  onChange={() => setCollectData(false)}
                  className="w-5 h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600">사용 안함</span>
              </label>
            </div>

            {/* Fixed Fields + Custom Fields */}
            {collectData && (
              <div className="space-y-4">
                {/* Fixed Fields: Name and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={collectName}
                      onChange={(e) => setCollectName(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-900">1. 이름</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={collectPhone}
                      onChange={(e) => setCollectPhone(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-900">2. 연락처</span>
                  </label>
                </div>

                {/* Custom Fields */}
                {customFields.map((field, index) => (
                  <div key={field.id} className="border-2 border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {field.type === 'short_answer' ? '단답형 항목 추가' : '선택형 항목 추가'}
                      </h3>
                      <button
                        onClick={() => removeCustomField(field.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Question Input */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-16">질문</label>
                      <input
                        type="text"
                        value={field.question}
                        onChange={(e) => updateFieldQuestion(field.id, e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        placeholder={`${index + 3}. 항목추가 질문`}
                      />
                    </div>

                    {/* Multiple Choice Options */}
                    {field.type === 'multiple_choice' && field.options && (
                      <div className="space-y-2 pl-20">
                        {field.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">선택항목</label>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(field.id, optionIndex, e.target.value)}
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                              placeholder="선택항목 입력"
                            />
                            {field.options!.length > 1 && (
                              <button
                                onClick={() => removeOption(field.id, optionIndex)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                              >
                                <XMarkIcon className="h-4 w-4 text-gray-500" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(field.id)}
                          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors gap-2 ml-20"
                        >
                          <PlusIcon className="h-4 w-4" />
                          선택항목 추가
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Field Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFieldTypeModal(!showFieldTypeModal)}
                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-left font-medium text-indigo-600 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span>항목 추가</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showFieldTypeModal && (
                    <div className="absolute z-10 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                      <button
                        onClick={() => addCustomField('short_answer')}
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors font-medium text-gray-900 border-b border-gray-200"
                      >
                        단답형
                      </button>
                      <button
                        onClick={() => addCustomField('multiple_choice')}
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors font-medium text-indigo-600"
                      >
                        선택형
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Realtime Status Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">실시간 현황 사용</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={realtimeEnabled}
                onChange={() => setRealtimeEnabled(true)}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">사용함</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!realtimeEnabled}
                onChange={() => setRealtimeEnabled(false)}
                className="w-5 h-5 text-gray-400"
              />
              <span className="font-semibold text-gray-600">사용 안함</span>
            </label>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">하단 CTA 버튼</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={ctaEnabled}
                  onChange={() => setCtaEnabled(true)}
                  className="w-5 h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900">사용함</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!ctaEnabled}
                  onChange={() => setCtaEnabled(false)}
                  className="w-5 h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600">사용 안함</span>
              </label>
            </div>

            {ctaEnabled && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-20">
                    버튼명
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="상담 신청하기"
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    색상 변경
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timer Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">타이머 사용</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={timerEnabled}
                onChange={() => setTimerEnabled(true)}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">사용함</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!timerEnabled}
                onChange={() => setTimerEnabled(false)}
                className="w-5 h-5 text-gray-400"
              />
              <span className="font-semibold text-gray-600">사용 안함</span>
            </label>
          </div>
        </div>

        {/* Call Button Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">전화 연결 버튼</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={callButtonEnabled}
                onChange={() => setCallButtonEnabled(true)}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">사용함</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!callButtonEnabled}
                onChange={() => setCallButtonEnabled(false)}
                className="w-5 h-5 text-gray-400"
              />
              <span className="font-semibold text-gray-600">사용 안함</span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard/landing-pages')}
            className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slug || !title}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
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
                저장 중...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5" />
                저장하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-indigo-600" />
            미리보기 화면
          </h2>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              실시간 미리보기는<br />곧 제공될 예정입니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
