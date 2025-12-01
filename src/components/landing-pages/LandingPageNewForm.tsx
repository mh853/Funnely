'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  ClockIcon,
  PlusIcon,
  Bars3Icon,
  EyeIcon,
} from '@heroicons/react/24/outline'

// Timer calculation utility
const calculateTimeRemaining = (deadline: string): string => {
  if (!deadline) return '00:00:00'

  const now = new Date().getTime()
  const target = new Date(deadline).getTime()
  const diff = target - now

  if (diff <= 0) return '00:00:00'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}일 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

interface LandingPageNewFormProps {
  companyId: string
  userId: string
  landingPage?: any // 수정 모드일 때 기존 데이터
}

interface CustomField {
  id: string
  type: 'short_answer' | 'multiple_choice'
  question: string
  options?: string[]
}

type SectionType =
  | 'hero_image'
  | 'title'
  | 'description'
  | 'form'
  | 'realtime_status'
  | 'timer'
  | 'cta_button'
  | 'call_button'
  | 'privacy_consent'

interface Section {
  id: string
  type: SectionType
  label: string
  enabled: boolean
}

export default function LandingPageNewForm({
  companyId,
  userId,
  landingPage,
}: LandingPageNewFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditMode = !!landingPage

  // Helper function to parse custom fields from DB
  const parseCustomFields = (collectFields: any): CustomField[] => {
    if (!collectFields || !Array.isArray(collectFields)) return []

    return collectFields
      .filter((field: any) => field.type === 'short_answer' || field.type === 'multiple_choice')
      .map((field: any, index: number) => ({
        id: `field-${index}-${Date.now()}`,
        type: field.type,
        question: field.question || '',
        options: field.options || (field.type === 'multiple_choice' ? [''] : undefined),
      }))
  }

  // Form state - initialize with existing data if editing
  const [slug, setSlug] = useState(landingPage?.slug || '')
  const [title, setTitle] = useState(landingPage?.title || '')
  const [description, setDescription] = useState(landingPage?.description || '')
  const [images, setImages] = useState<string[]>(landingPage?.images || [])
  const [collectData, setCollectData] = useState(landingPage?.collect_data ?? true)
  const [collectName, setCollectName] = useState(
    landingPage?.collect_fields?.some((f: any) => f.type === 'name') ?? true
  )
  const [collectPhone, setCollectPhone] = useState(
    landingPage?.collect_fields?.some((f: any) => f.type === 'phone') ?? true
  )

  // Dynamic custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>(
    parseCustomFields(landingPage?.collect_fields)
  )
  const [showFieldTypeModal, setShowFieldTypeModal] = useState(false)

  const [descriptionEnabled, setDescriptionEnabled] = useState(landingPage?.description_enabled ?? true)
  const [realtimeEnabled, setRealtimeEnabled] = useState(landingPage?.realtime_enabled ?? true)
  const [realtimeTemplate, setRealtimeTemplate] = useState(
    landingPage?.realtime_template || '{name}님이 {location}에서 상담 신청했습니다'
  )
  const [realtimeSpeed, setRealtimeSpeed] = useState(landingPage?.realtime_speed || 5)
  const [realtimeCount, setRealtimeCount] = useState(landingPage?.realtime_count || 10)
  const [ctaEnabled, setCtaEnabled] = useState(landingPage?.cta_enabled ?? true)
  const [ctaText, setCtaText] = useState(landingPage?.cta_text || '')
  const [ctaColor, setCtaColor] = useState(landingPage?.cta_color || '#6366f1')
  const [timerEnabled, setTimerEnabled] = useState(landingPage?.timer_enabled ?? true)
  const [timerDeadline, setTimerDeadline] = useState(landingPage?.timer_deadline || '')
  const [timerColor, setTimerColor] = useState(landingPage?.timer_color || '#ef4444')
  const [timerCountdown, setTimerCountdown] = useState('00:00:00')
  const [callButtonEnabled, setCallButtonEnabled] = useState(landingPage?.call_button_enabled ?? true)
  const [callButtonPhone, setCallButtonPhone] = useState(landingPage?.call_button_phone || '')
  const [callButtonColor, setCallButtonColor] = useState(landingPage?.call_button_color || '#10b981')

  // Sticky button positions
  const [ctaStickyPosition, setCtaStickyPosition] = useState<'none' | 'top' | 'bottom'>(
    landingPage?.cta_sticky_position || 'none'
  )
  const [callButtonStickyPosition, setCallButtonStickyPosition] = useState<'none' | 'top' | 'bottom'>(
    landingPage?.call_button_sticky_position || 'none'
  )
  const [timerStickyPosition, setTimerStickyPosition] = useState<'none' | 'top' | 'bottom'>(
    landingPage?.timer_sticky_position || 'none'
  )

  // Collection mode (inline vs external)
  const [collectionMode, setCollectionMode] = useState<'inline' | 'external'>(
    landingPage?.collection_mode || 'inline'
  )

  // External form modal state
  const [showExternalFormModal, setShowExternalFormModal] = useState(false)

  // Privacy consent state
  const [requirePrivacyConsent, setRequirePrivacyConsent] = useState(
    landingPage?.require_privacy_consent ?? true
  )
  const [requireMarketingConsent, setRequireMarketingConsent] = useState(
    landingPage?.require_marketing_consent ?? false
  )
  const [privacyContent, setPrivacyContent] = useState(landingPage?.privacy_content || '')
  const [marketingContent, setMarketingContent] = useState(landingPage?.marketing_content || '')
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)

  // Deployment state
  const [isActive, setIsActive] = useState(landingPage?.is_active ?? true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Section ordering for preview
  const [sections, setSections] = useState<Section[]>([
    { id: '1', type: 'hero_image', label: '히어로 이미지', enabled: true },
    { id: '3', type: 'description', label: '설명', enabled: true },
    { id: '6', type: 'timer', label: '타이머', enabled: true },
    { id: '5', type: 'realtime_status', label: '실시간 현황', enabled: true },
    { id: '4', type: 'form', label: 'DB 수집 폼', enabled: true },
    { id: '9', type: 'privacy_consent', label: '개인정보 동의', enabled: true },
    { id: '7', type: 'cta_button', label: 'CTA 버튼', enabled: true },
    { id: '8', type: 'call_button', label: '전화 연결', enabled: true },
  ])

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [showDesktopPreview, setShowDesktopPreview] = useState(false)

  // Realtime rolling state
  const [currentRealtimeIndex, setCurrentRealtimeIndex] = useState(0)

  // Demo realtime data (will be replaced with actual DB data)
  const demoRealtimeData = [
    { name: '김민수', location: '서울 강남구' },
    { name: '이지은', location: '경기 성남시' },
    { name: '박준영', location: '인천 남동구' },
    { name: '최서연', location: '부산 해운대구' },
    { name: '정현우', location: '대전 유성구' },
  ]

  // Rolling animation effect
  useEffect(() => {
    if (!realtimeEnabled || !collectData) return

    const interval = setInterval(() => {
      setCurrentRealtimeIndex((prev) => (prev + 1) % demoRealtimeData.length)
    }, realtimeSpeed * 1000)

    return () => clearInterval(interval)
  }, [realtimeEnabled, collectData, realtimeSpeed, demoRealtimeData.length])

  // Timer countdown effect
  useEffect(() => {
    if (!timerEnabled || !timerDeadline) {
      setTimerCountdown('00:00:00')
      return
    }

    // Update immediately
    setTimerCountdown(calculateTimeRemaining(timerDeadline))

    // Then update every second
    const interval = setInterval(() => {
      setTimerCountdown(calculateTimeRemaining(timerDeadline))
    }, 1000)

    return () => clearInterval(interval)
  }, [timerEnabled, timerDeadline])

  // Load privacy policy content
  useEffect(() => {
    async function loadPrivacyPolicy() {
      try {
        // 수정 모드일 때는 기존 데이터 사용
        if (landingPage?.privacy_content || landingPage?.marketing_content) {
          return
        }

        const { data: policy } = await supabase
          .from('privacy_policies')
          .select('*')
          .eq('company_id', companyId)
          .single()

        if (policy) {
          setPrivacyContent(policy.privacy_consent_content)
          setMarketingContent(policy.marketing_consent_content)
        }
      } catch (err) {
        console.error('Error loading privacy policy:', err)
      }
    }

    loadPrivacyPolicy()
  }, [landingPage, companyId])

  // Format phone number with auto-hyphen
  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/[^\d]/g, '')

    // Apply formatting based on length
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }

    // Limit to 11 digits
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

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

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newSections = [...sections]
    const draggedSection = newSections[draggedIndex]
    newSections.splice(draggedIndex, 1)
    newSections.splice(index, 0, draggedSection)

    setSections(newSections)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Get preview content for each section (Mobile)
  const getPreviewContent = (section: Section) => {
    // External mode filtering: hide form and privacy_consent only (keep realtime_status)
    if (collectionMode === 'external') {
      if (section.type === 'form' || section.type === 'privacy_consent') {
        return null
      }
    }

    switch (section.type) {
      case 'hero_image':
        return images.length > 0 ? (
          <div>
            {images.map((image, idx) => (
              <div key={idx} className="overflow-hidden">
                <img
                  src={image}
                  alt={`Hero ${idx + 1}`}
                  className="w-full h-48 object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
            <PhotoIcon className="h-12 w-12 text-gray-400" />
          </div>
        )

      case 'title':
        return (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {title || '랜딩 페이지 제목'}
            </h1>
          </div>
        )

      case 'description':
        if (!descriptionEnabled) return null
        return (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {description || '랜딩 페이지 설명을 입력하세요'}
            </p>
          </div>
        )

      case 'form':
        if (!collectData) return null
        const formFields = []
        if (collectName) formFields.push('이름')
        if (collectPhone) formFields.push('연락처')
        customFields.forEach((field, idx) => {
          formFields.push(`${idx + 3}. ${field.question || '질문'}`)
        })

        return (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">DB 수집 폼</div>
            {formFields.map((field, idx) => (
              <div key={idx} className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs text-gray-600">{field}</div>
              </div>
            ))}
          </div>
        )

      case 'realtime_status':
        if (!realtimeEnabled || !collectData) return null

        // Replace template placeholders with actual data
        const currentData = demoRealtimeData[currentRealtimeIndex]
        const displayMessage = realtimeTemplate
          .replace('{name}', currentData.name)
          .replace('{location}', currentData.location)

        return (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200 overflow-hidden">
            <div className="text-xs font-semibold text-blue-900 mb-2">실시간 현황</div>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
              <div key={currentRealtimeIndex} className="animate-in fade-in duration-500">
                {displayMessage}
              </div>
            </div>
          </div>
        )

      case 'timer':
        if (!timerEnabled) return null
        return (
          <div className="rounded-lg p-3 border-2" style={{ borderColor: timerColor, backgroundColor: `${timerColor}10` }}>
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="h-4 w-4" style={{ color: timerColor }} />
              <span className="text-xs font-bold" style={{ color: timerColor }}>
                {timerCountdown}
              </span>
            </div>
          </div>
        )

      case 'cta_button':
        if (!ctaEnabled || !collectData) return null
        return (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (collectionMode === 'external') {
                  setShowExternalFormModal(true)
                }
              }}
              className="w-full py-3 rounded-lg text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: ctaColor }}
            >
              {ctaText || '상담 신청하기'}
            </button>
          </div>
        )

      case 'call_button':
        if (!callButtonEnabled) return null
        return (
          <div className="flex justify-center">
            <button
              className="w-full py-3 text-white rounded-lg text-sm font-bold shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: callButtonColor }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {callButtonPhone ? `전화: ${callButtonPhone}` : '전화 상담 받기'}
            </button>
          </div>
        )

      case 'privacy_consent':
        if (!collectData) return null
        return (
          <div className="space-y-3 border-t border-gray-200 pt-3">
            {requirePrivacyConsent && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-xs text-gray-700">
                  개인정보 수집·이용 동의 (필수)
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="ml-1 text-indigo-600 underline"
                  >
                    [보기]
                  </button>
                </span>
              </label>
            )}
            {requireMarketingConsent && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-xs text-gray-600">
                  마케팅 활용 동의 (선택)
                  <button
                    type="button"
                    onClick={() => setShowMarketingModal(true)}
                    className="ml-1 text-indigo-600 underline"
                  >
                    [보기]
                  </button>
                </span>
              </label>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Get desktop preview content for each section (Desktop - larger, better quality)
  const getDesktopPreviewContent = (section: Section) => {
    // External mode filtering: hide form and privacy_consent only (keep realtime_status)
    if (collectionMode === 'external') {
      if (section.type === 'form' || section.type === 'privacy_consent') {
        return null
      }
    }

    switch (section.type) {
      case 'hero_image':
        return images.length > 0 ? (
          <div className="space-y-0">
            {images.map((image, idx) => (
              <div key={idx} className="overflow-hidden">
                <img
                  src={image}
                  alt={`Hero ${idx + 1}`}
                  className="w-full object-contain"
                  style={{ maxHeight: '600px' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl p-16 flex items-center justify-center">
            <PhotoIcon className="h-24 w-24 text-gray-400" />
          </div>
        )

      case 'title':
        return (
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900">
              {title || '랜딩 페이지 제목'}
            </h1>
          </div>
        )

      case 'description':
        if (!descriptionEnabled) return null
        return (
          <div className="text-center">
            <p className="text-lg text-gray-600 leading-relaxed">
              {description || '랜딩 페이지 설명을 입력하세요'}
            </p>
          </div>
        )

      case 'form':
        if (!collectData) return null
        const formFields = []
        if (collectName) formFields.push('이름')
        if (collectPhone) formFields.push('연락처')
        customFields.forEach((field, idx) => {
          formFields.push(`${idx + 3}. ${field.question || '질문'}`)
        })

        return (
          <div className="space-y-4">
            <div className="text-base font-semibold text-gray-700 mb-4">DB 수집 폼</div>
            {formFields.map((field, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <div className="text-base text-gray-600">{field}</div>
              </div>
            ))}
          </div>
        )

      case 'realtime_status':
        if (!realtimeEnabled || !collectData) return null

        const currentData = demoRealtimeData[currentRealtimeIndex]
        const displayMessage = realtimeTemplate
          .replace('{name}', currentData.name)
          .replace('{location}', currentData.location)

        return (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 overflow-hidden">
            <div className="text-base font-semibold text-blue-900 mb-3">실시간 현황</div>
            <div className="flex items-center gap-3 text-base text-blue-700">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
              <div key={currentRealtimeIndex} className="animate-in fade-in duration-500">
                {displayMessage}
              </div>
            </div>
          </div>
        )

      case 'timer':
        if (!timerEnabled) return null
        return (
          <div className="rounded-xl p-6 border-2" style={{ borderColor: timerColor, backgroundColor: `${timerColor}10` }}>
            <div className="flex items-center justify-center gap-3">
              <ClockIcon className="h-6 w-6" style={{ color: timerColor }} />
              <span className="text-lg font-bold" style={{ color: timerColor }}>
                {timerCountdown}
              </span>
            </div>
          </div>
        )

      case 'cta_button':
        if (!ctaEnabled || !collectData) return null
        return (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (collectionMode === 'external') {
                  setShowExternalFormModal(true)
                }
              }}
              className="w-full py-4 rounded-xl text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-shadow"
              style={{ backgroundColor: ctaColor }}
            >
              {ctaText || '상담 신청하기'}
            </button>
          </div>
        )

      case 'call_button':
        if (!callButtonEnabled) return null
        return (
          <div className="flex justify-center">
            <button
              className="w-full py-4 text-white rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-3"
              style={{ backgroundColor: callButtonColor }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {callButtonPhone ? `전화: ${callButtonPhone}` : '전화 상담 받기'}
            </button>
          </div>
        )

      case 'privacy_consent':
        if (!collectData) return null
        return (
          <div className="space-y-4 border-t-2 border-gray-200 pt-6">
            {requirePrivacyConsent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled
                />
                <span className="text-base text-gray-700">
                  개인정보 수집·이용 동의 (필수)
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="ml-2 text-indigo-600 underline font-medium"
                  >
                    [보기]
                  </button>
                </span>
              </label>
            )}
            {requireMarketingConsent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled
                />
                <span className="text-base text-gray-600">
                  마케팅 활용 동의 (선택)
                  <button
                    type="button"
                    onClick={() => setShowMarketingModal(true)}
                    className="ml-2 text-indigo-600 underline font-medium"
                  >
                    [보기]
                  </button>
                </span>
              </label>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Render sticky buttons based on position
  const renderStickyButtons = (position: 'top' | 'bottom', isDesktop: boolean = false) => {
    const buttons = []

    // Timer (available for both modes)
    if (timerEnabled && timerStickyPosition === position && timerDeadline) {
      buttons.push(
        <div
          key="timer"
          className={`w-full ${isDesktop ? 'py-4 text-lg' : 'py-3 text-base'} rounded-lg font-bold text-white shadow-lg text-center`}
          style={{ backgroundColor: timerColor }}
        >
          ⏰ {timerCountdown}
        </div>
      )
    }

    // CTA Button (both modes - different behavior)
    if (ctaEnabled && collectData && ctaStickyPosition === position) {
      buttons.push(
        <button
          key="cta"
          onClick={() => {
            if (collectionMode === 'external') {
              setShowExternalFormModal(true)
            }
            // inline mode: default button behavior (scrolls to form in page)
          }}
          className={`w-full ${isDesktop ? 'py-4 text-base' : 'py-3 text-sm'} rounded-lg font-bold text-white shadow-lg`}
          style={{ backgroundColor: ctaColor }}
        >
          {ctaText || '상담 신청하기'}
        </button>
      )
    }

    // Call Button (both modes)
    if (callButtonEnabled && callButtonStickyPosition === position) {
      buttons.push(
        <button
          key="call"
          className={`w-full ${isDesktop ? 'py-4 text-base' : 'py-3 text-sm'} text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2`}
          style={{ backgroundColor: callButtonColor }}
        >
          <svg className={`${isDesktop ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {callButtonPhone ? `전화: ${callButtonPhone}` : '전화 상담 받기'}
        </button>
      )
    }

    if (buttons.length === 0) return null

    return (
      <div
        className={`${position === 'top' ? 'sticky top-0 border-b' : 'sticky bottom-0 border-t'} z-10 bg-white ${isDesktop ? 'p-4 space-y-3' : 'p-3 space-y-2'} border-gray-200 shadow-md`}
      >
        {buttons}
      </div>
    )
  }

  // Render external form modal (preview only)
  const renderExternalFormModal = () => {
    if (!showExternalFormModal) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
            <h3 className="text-xl font-bold text-gray-900">상세 정보 입력</h3>
            <button
              onClick={() => setShowExternalFormModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <div className="p-4 bg-indigo-50 border-b border-indigo-100">
            <p className="text-sm text-indigo-900">
              💡 상담을 위해 아래 정보를 입력해주세요
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            {/* Basic Fields */}
            {collectName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="홍길동"
                  disabled
                />
              </div>
            )}

            {collectPhone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="010-1234-5678"
                  disabled
                />
              </div>
            )}

            {/* Custom Fields */}
            {customFields.map((field, index) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.question || `${index + 3}. 항목추가`}
                </label>
                {field.type === 'short_answer' ? (
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="답변을 입력해주세요"
                    disabled
                  />
                ) : (
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    disabled
                  >
                    <option>선택해주세요</option>
                    {field.options?.map((option, idx) => (
                      <option key={idx}>{option}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {/* Privacy Consent */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {requirePrivacyConsent && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 rounded border-gray-300"
                    disabled
                  />
                  <span className="text-sm text-gray-600">
                    개인정보 수집 및 이용 동의 (필수)
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPrivacyModal(true)
                      }}
                      className="ml-2 text-indigo-600 underline font-medium"
                    >
                      [보기]
                    </button>
                  </span>
                </label>
              )}
              {requireMarketingConsent && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-5 h-5 rounded border-gray-300"
                    disabled
                  />
                  <span className="text-sm text-gray-600">
                    마케팅 활용 동의 (선택)
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMarketingModal(true)
                      }}
                      className="ml-2 text-indigo-600 underline font-medium"
                    >
                      [보기]
                    </button>
                  </span>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                alert('미리보기 모드입니다')
              }}
              className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl"
              style={{ backgroundColor: ctaColor }}
            >
              {ctaText || '상담 신청하기'}
            </button>

            <p className="text-xs text-center text-gray-500">
              💡 이것은 미리보기입니다. 실제 수집 페이지에서는 정보가 저장됩니다.
            </p>
          </div>
        </div>
      </div>
    )
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

      const dataToSave = {
        company_id: companyId,
        slug,
        title,
        description,
        images,
        sections, // ✅ 섹션 데이터 추가
        collect_data: collectData,
        collect_fields: collectFields,
        collection_mode: collectionMode,
        description_enabled: descriptionEnabled,
        realtime_enabled: realtimeEnabled,
        realtime_template: realtimeTemplate,
        realtime_speed: realtimeSpeed,
        realtime_count: realtimeCount,
        cta_enabled: ctaEnabled,
        cta_text: ctaText,
        cta_color: ctaColor,
        cta_sticky_position: ctaStickyPosition,
        timer_enabled: timerEnabled,
        timer_deadline: timerDeadline || null, // 빈 문자열을 null로 변환
        timer_color: timerColor,
        timer_sticky_position: timerStickyPosition,
        call_button_enabled: callButtonEnabled,
        call_button_phone: callButtonPhone || null, // 빈 문자열을 null로 변환
        call_button_color: callButtonColor,
        call_button_sticky_position: callButtonStickyPosition,
        require_privacy_consent: requirePrivacyConsent,
        require_marketing_consent: requireMarketingConsent,
        privacy_content: privacyContent || null, // 빈 문자열을 null로 변환
        marketing_content: marketingContent || null, // 빈 문자열을 null로 변환
        is_active: isActive,
      }

      if (landingPage) {
        // 수정 모드 - company_id와 created_by는 제외
        const { company_id, ...updateData } = dataToSave
        const { error: updateError } = await supabase
          .from('landing_pages')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', landingPage.id)

        if (updateError) throw updateError
      } else {
        // 생성 모드
        const { error: insertError } = await supabase
          .from('landing_pages')
          .insert({
            ...dataToSave,
            created_by: userId,
          })

        if (insertError) throw insertError
      }

      router.push('/dashboard/landing-pages')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  // Image compression utility
  const compressImage = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Resize if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Image compression failed'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = reject
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setSaving(true)
    try {
      // Process all files in parallel
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          // Compress image before upload
          const compressedBlob = await compressImage(file)

          // Generate unique filename
          const fileExt = 'jpg' // Always use jpg after compression
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
          const filePath = `landing-pages/${companyId}/${fileName}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('public-assets')
            .upload(filePath, compressedBlob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw uploadError
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('public-assets')
            .getPublicUrl(filePath)

          return publicUrl
        } catch (error) {
          console.error('Error processing file:', file.name, error)
          return null
        }
      })

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises)
      const uploadedUrls = results.filter((url): url is string => url !== null)

      if (uploadedUrls.length === 0) {
        throw new Error('모든 이미지 업로드가 실패했습니다.')
      }

      if (uploadedUrls.length < files.length) {
        alert(`${files.length - uploadedUrls.length}개의 이미지 업로드가 실패했습니다.`)
      }

      setImages([...images, ...uploadedUrls])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('이미지 업로드 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setSaving(false)
    }
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

        {/* Description Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            랜딩페이지 설명
          </h2>

          {/* Radio Buttons */}
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={descriptionEnabled}
                onChange={() => setDescriptionEnabled(true)}
                className="w-5 h-5 text-indigo-600"
              />
              <span className="font-semibold text-gray-900">사용함</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!descriptionEnabled}
                onChange={() => setDescriptionEnabled(false)}
                className="w-5 h-5 text-gray-400"
              />
              <span className="font-semibold text-gray-600">사용 안함</span>
            </label>
          </div>

          {/* Textarea (conditional) */}
          {descriptionEnabled && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
              placeholder="랜딩페이지 설명을 입력하세요"
              rows={4}
            />
          )}
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
            {/* Collection Mode Selection */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">수집 방식 선택</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={collectionMode === 'inline'}
                    onChange={() => setCollectionMode('inline')}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">옵션1: 페이지 내 수집</span>
                    <p className="text-xs text-gray-600">랜딩 페이지에서 바로 정보 수집</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={collectionMode === 'external'}
                    onChange={() => setCollectionMode('external')}
                    className="w-5 h-5 text-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">옵션2: 외부 페이지 수집</span>
                    <p className="text-xs text-gray-600">별도 페이지에서 상세 정보 수집</p>
                  </div>
                </label>
              </div>
            </div>

            {/* External Page Info (Option 2 only) */}
            {collectionMode === 'external' && (
              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-purple-900">
                  💡 외부 수집 페이지 URL: <span className="font-semibold">https://funnely.co.kr/landing/{slug || '[페이지-주소]'}/collect-detail</span>
                </p>
                <p className="text-xs text-purple-700 mt-2">
                  옵션2를 선택하면 위 URL로 별도의 수집 페이지가 생성됩니다. 아래에서 수집할 항목을 설정해주세요.
                </p>
              </div>
            )}

            {/* Collection Settings (Common for both options) */}
            {collectionMode && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Realtime Status Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">실시간 현황 사용</h2>

          {/* Conditional Notice */}
          {!collectData && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                DB 수집 항목을 사용해야 실시간 현황을 사용할 수 있습니다.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Radio Buttons */}
            <div className="flex items-center gap-4">
              <label className={`flex items-center gap-3 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={realtimeEnabled}
                  onChange={() => collectData && setRealtimeEnabled(true)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-900">사용함</span>
              </label>
              <label className={`flex items-center gap-3 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={!realtimeEnabled}
                  onChange={() => collectData && setRealtimeEnabled(false)}
                  disabled={!collectData}
                  className="w-5 h-5 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-600">사용 안함</span>
              </label>
            </div>

            {/* Realtime Settings (only when enabled and collectData is true) */}
            {realtimeEnabled && collectData && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    롤링 메시지 템플릿
                  </label>
                  <p className="text-xs text-gray-500">
                    {'{name}'}과 {'{location}'}은 실제 DB 데이터로 자동 치환됩니다
                  </p>
                  <input
                    type="text"
                    value={realtimeTemplate}
                    onChange={(e) => setRealtimeTemplate(e.target.value)}
                    placeholder="예: {name}님이 {location}에서 상담 신청했습니다"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      롤링 속도 (초)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={realtimeSpeed}
                      onChange={(e) => setRealtimeSpeed(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      표시할 최근 DB 개수
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={realtimeCount}
                      onChange={(e) => setRealtimeCount(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      <strong>실시간 DB 연동 필요:</strong><br />
                      실제 유입된 DB를 표시하려면 백엔드에서 Supabase Realtime 구독 설정이 필요합니다.
                      현재는 미리보기용 데모 메시지가 표시됩니다.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">하단 CTA 버튼</h2>

          {/* Conditional Notice */}
          {!collectData && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                DB 수집 항목을 사용해야 하단 CTA 버튼을 사용할 수 있습니다.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <label className={`flex items-center gap-3 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={ctaEnabled}
                  onChange={() => collectData && setCtaEnabled(true)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-900">사용함</span>
              </label>
              <label className={`flex items-center gap-3 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={!ctaEnabled}
                  onChange={() => collectData && setCtaEnabled(false)}
                  disabled={!collectData}
                  className="w-5 h-5 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-600">사용 안함</span>
              </label>
            </div>

            {/* CTA Settings (only when enabled and collectData is true) */}
            {ctaEnabled && collectData && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
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
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-20">
                    버튼 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                {/* Sticky Position Settings */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={ctaStickyPosition === 'none'}
                        onChange={() => setCtaStickyPosition('none')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">고정 안함</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={ctaStickyPosition === 'top'}
                        onChange={() => setCtaStickyPosition('top')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">상단 고정</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={ctaStickyPosition === 'bottom'}
                        onChange={() => setCtaStickyPosition('bottom')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">하단 고정</span>
                    </label>
                  </div>

                  {/* Info message */}
                  {ctaStickyPosition !== 'none' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 화면 고정 시 스크롤해도 항상 {ctaStickyPosition === 'top' ? '상단' : '하단'}에 버튼이 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timer Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">타이머 사용</h2>
          <div className="space-y-4">
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

            {timerEnabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-24">
                    마감 날짜/시간
                  </label>
                  <input
                    type="datetime-local"
                    value={timerDeadline}
                    onChange={(e) => setTimerDeadline(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-24">
                    타이머 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={timerColor}
                      onChange={(e) => setTimerColor(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={timerColor}
                      onChange={(e) => setTimerColor(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#ef4444"
                    />
                  </div>
                </div>

                {/* Timer Sticky Position Settings */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={timerStickyPosition === 'none'}
                        onChange={() => setTimerStickyPosition('none')}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="text-sm text-gray-700">고정 안함</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={timerStickyPosition === 'top'}
                        onChange={() => setTimerStickyPosition('top')}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="text-sm text-gray-700">상단 고정</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={timerStickyPosition === 'bottom'}
                        onChange={() => setTimerStickyPosition('bottom')}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="text-sm text-gray-700">하단 고정</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 타이머를 화면 상단 또는 하단에 고정하여 스크롤 시에도 항상 표시되도록 설정할 수 있습니다
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call Button Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">전화 연결 버튼</h2>
          <div className="space-y-4">
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

            {callButtonEnabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-24">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    value={callButtonPhone}
                    onChange={(e) => setCallButtonPhone(formatPhoneNumber(e.target.value))}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="01012345678"
                    maxLength={13}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 w-24">
                    버튼 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={callButtonColor}
                      onChange={(e) => setCallButtonColor(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={callButtonColor}
                      onChange={(e) => setCallButtonColor(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                {/* Sticky Position Settings */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={callButtonStickyPosition === 'none'}
                        onChange={() => setCallButtonStickyPosition('none')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">고정 안함</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={callButtonStickyPosition === 'top'}
                        onChange={() => setCallButtonStickyPosition('top')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">상단 고정</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={callButtonStickyPosition === 'bottom'}
                        onChange={() => setCallButtonStickyPosition('bottom')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">하단 고정</span>
                    </label>
                  </div>

                  {/* Info message */}
                  {callButtonStickyPosition !== 'none' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 화면 고정 시 스크롤해도 항상 {callButtonStickyPosition === 'top' ? '상단' : '하단'}에 버튼이 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Consent Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">개인정보 동의</h2>
            <Link
              href="/dashboard/settings/privacy-policy"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              동의 내용 수정
            </Link>
          </div>

          {/* Conditional Notice */}
          {!collectData && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                DB 수집 항목을 사용해야 개인정보 동의를 사용할 수 있습니다.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* 개인정보 수집·이용 동의 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requirePrivacyConsent}
                  onChange={(e) => setRequirePrivacyConsent(e.target.checked)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
                />
                <div>
                  <span className="font-semibold text-gray-900">개인정보 수집·이용 동의</span>
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">필수</span>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="text-sm text-indigo-600 underline"
              >
                내용 미리보기
              </button>
            </div>

            {/* 마케팅 활용 동의 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireMarketingConsent}
                  onChange={(e) => setRequireMarketingConsent(e.target.checked)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50"
                />
                <div>
                  <span className="font-semibold text-gray-900">마케팅 활용 동의</span>
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">선택</span>
                </div>
              </div>
              <button
                onClick={() => setShowMarketingModal(true)}
                className="text-sm text-indigo-600 underline"
              >
                내용 미리보기
              </button>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  동의 내용은 <strong>설정 {'>'} 개인정보 처리 방침</strong>에서 수정할 수 있습니다.
                  DB 수집 시 자동으로 동의 여부가 함께 저장됩니다.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Deployment Settings */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-1">
              <input
                type="checkbox"
                id="deployment-toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="deployment-toggle" className="flex items-center gap-2 cursor-pointer">
                <h3 className="text-lg font-bold text-gray-900">
                  {isActive ? '🟢 배포 중' : '⚫ 비활성'}
                </h3>
              </label>
              <p className="text-sm text-gray-600 mt-1">
                {isActive
                  ? '이 랜딩페이지는 현재 배포되어 있습니다. 사용자가 URL을 통해 접근할 수 있습니다.'
                  : '이 랜딩페이지는 비활성 상태입니다. URL 접근이 차단됩니다.'}
              </p>
              {isActive && (
                <div className="mt-3 bg-white/80 rounded-lg p-3 border border-green-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">배포 URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-green-700 font-mono bg-green-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                      {process.env.NEXT_PUBLIC_URL || 'https://funnely.co.kr'}/landing/{slug || 'your-slug'}
                    </code>
                    <button
                      onClick={() => {
                        const url = `${process.env.NEXT_PUBLIC_URL || 'https://funnely.co.kr'}/landing/${slug}`
                        navigator.clipboard.writeText(url)
                        alert('URL이 클립보드에 복사되었습니다!')
                      }}
                      disabled={!slug}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      URL 복사
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
                {landingPage ? '수정 중...' : '생성 중...'}
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5" />
                {landingPage ? '수정하기' : '생성하기'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Preview Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <EyeIcon className="h-6 w-6 text-indigo-600" />
              미리보기
            </h2>

            {/* Desktop Preview Button */}
            <button
              onClick={() => setShowDesktopPreview(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              데스크탑 미리보기
            </button>
          </div>

          {/* Mobile Phone Preview Frame */}
          <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl">
            <div className="bg-white rounded-2xl overflow-hidden">
              {/* Phone Status Bar */}
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 border border-gray-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-400 rounded-sm"></div>
              </div>
            </div>

            {/* Preview Content - Scrollable */}
            <div className="h-[600px] overflow-y-auto bg-white relative">
              {/* Sticky Top Buttons */}
              {renderStickyButtons('top', false)}

              {/* Scrollable Content */}
              <div className="p-4 space-y-4">
                {sections
                  .filter(section => {
                    // Filter out disabled sections
                    const content = getPreviewContent(section)
                    if (content === null) return false

                    // Filter out sticky buttons
                    if (section.type === 'timer' && timerStickyPosition !== 'none') return false
                    if (section.type === 'cta_button' && ctaStickyPosition !== 'none') return false
                    if (section.type === 'call_button' && callButtonStickyPosition !== 'none') return false

                    return true
                  })
                  .map((section, index) => {
                  const content = getPreviewContent(section)
                  if (!content) return null

                  return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative cursor-move transition-all duration-200 ${
                        draggedIndex === index
                          ? 'opacity-50 scale-95'
                          : 'opacity-100 scale-100'
                      } hover:ring-2 hover:ring-indigo-400 rounded-lg`}
                    >
                      {/* Drag Handle */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-indigo-500 text-white rounded-full p-1 shadow-lg">
                          <Bars3Icon className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Section Label Badge */}
                      <div className="absolute -top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-md">
                          {section.label}
                        </span>
                      </div>

                      {/* Section Content */}
                      <div className="relative">{content}</div>
                    </div>
                  )
                })}

                {/* Empty State */}
                {sections.every(section => getPreviewContent(section) === null) && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        항목을 추가하여<br />미리보기를 확인하세요
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Bottom Buttons */}
              {renderStickyButtons('bottom', false)}
            </div>
          </div>
          </div>

          {/* Preview Help Text */}
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-indigo-900">
                <p className="font-semibold mb-1">미리보기 사용법</p>
                <ul className="space-y-1 text-indigo-700">
                  <li>• 모바일 화면으로 미리보기 중</li>
                  <li>• 섹션에 마우스를 올려 드래그 핸들 표시</li>
                  <li>• 드래그하여 섹션 순서 변경</li>
                  <li>• 실시간으로 변경사항 반영</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Preview Modal */}
      {showDesktopPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                데스크탑 미리보기
              </h3>
              <button
                onClick={() => setShowDesktopPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
              <div className="bg-gray-100 rounded-xl p-4 shadow-xl">
                <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-300">
                  {/* Browser Chrome */}
                  <div className="bg-gray-200 px-4 py-2 flex items-center gap-2 border-b border-gray-300">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-600 ml-2">
                      https://funnely.co.kr/landing/{slug || 'your-page'}
                    </div>
                  </div>

                  {/* Desktop Content - Scrollable */}
                  <div className="h-[600px] overflow-y-auto bg-white relative">
                    {/* Sticky Top Buttons */}
                    <div className="w-[800px] mx-auto">
                      {renderStickyButtons('top', true)}
                    </div>

                    {/* Desktop Layout - Fixed 800px width */}
                    <div className="w-[800px] mx-auto p-12 space-y-8">
                      {sections
                        .filter(section => {
                          const content = getDesktopPreviewContent(section)
                          if (content === null) return false

                          // Filter out sticky buttons
                          if (section.type === 'timer' && timerStickyPosition !== 'none') return false
                          if (section.type === 'cta_button' && ctaStickyPosition !== 'none') return false
                          if (section.type === 'call_button' && callButtonStickyPosition !== 'none') return false

                          return true
                        })
                        .map((section, index) => {
                          const content = getDesktopPreviewContent(section)
                          if (!content) return null

                          return (
                            <div
                              key={section.id}
                              draggable
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`group relative cursor-move transition-all duration-200 ${
                                draggedIndex === index
                                  ? 'opacity-50 scale-95'
                                  : 'opacity-100 scale-100'
                              } hover:ring-2 hover:ring-indigo-400 rounded-lg`}
                            >
                              {/* Drag Handle */}
                              <div className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-indigo-500 text-white rounded-full p-1 shadow-lg">
                                  <Bars3Icon className="h-4 w-4" />
                                </div>
                              </div>

                              {/* Section Label Badge */}
                              <div className="absolute -top-3 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-md">
                                  {section.label}
                                </span>
                              </div>

                              {/* Section Content */}
                              <div className="relative">{content}</div>
                            </div>
                          )
                        })}

                      {/* Empty State */}
                      {sections.every(section => getDesktopPreviewContent(section) === null) && (
                        <div className="h-full flex items-center justify-center py-20">
                          <div className="text-center">
                            <PhotoIcon className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400">
                              항목을 추가하여 미리보기를 확인하세요
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sticky Bottom Buttons */}
                    <div className="w-[800px] mx-auto">
                      {renderStickyButtons('bottom', true)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Consent Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">개인정보 수집·이용 동의 (필수)</h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {privacyContent || '개인정보 수집·이용 동의 내용이 설정되지 않았습니다.\n설정 페이지에서 내용을 입력해주세요.'}
                </pre>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Consent Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">마케팅 활용 동의 (선택)</h3>
              <button
                onClick={() => setShowMarketingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {marketingContent || '마케팅 활용 동의 내용이 설정되지 않았습니다.\n설정 페이지에서 내용을 입력해주세요.'}
                </pre>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end">
              <button
                onClick={() => setShowMarketingModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Form Modal */}
      {renderExternalFormModal()}
    </div>
  )
}
