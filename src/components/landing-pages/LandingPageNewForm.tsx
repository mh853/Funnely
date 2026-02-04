'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { utcToKstDatetimeLocal, kstDatetimeLocalToUtc } from '@/lib/utils/timezone'
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
  if (!deadline) return 'D-0일 00:00:00'

  const now = new Date().getTime()
  const target = new Date(deadline).getTime()
  const diff = target - now

  if (diff <= 0) return 'D-0일 00:00:00'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `D-${days}일 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Check if timer has expired
const isTimerExpired = (deadline: string | null): boolean => {
  if (!deadline) return false

  const now = new Date().getTime()
  const target = new Date(deadline).getTime()

  return now > target
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
  required?: boolean // 필수 항목 여부
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
        required: field.required ?? false, // 필수 여부 (기본값: false)
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
    landingPage?.realtime_template?.replace('{location}', '{device}') || '{name}님이 {device}에서 상담 신청했습니다'
  )
  const [realtimeSpeed, setRealtimeSpeed] = useState(landingPage?.realtime_speed || 5)
  const [realtimeCount, setRealtimeCount] = useState(landingPage?.realtime_count || 10)
  const [ctaEnabled, setCtaEnabled] = useState(landingPage?.cta_enabled ?? true)
  const [ctaText, setCtaText] = useState(landingPage?.cta_text || '')
  const [ctaColor, setCtaColor] = useState(landingPage?.cta_color || '#6366f1')
  const [timerEnabled, setTimerEnabled] = useState(landingPage?.timer_enabled ?? true)
  // Convert UTC timestamp to KST datetime-local format
  const [timerDeadline, setTimerDeadline] = useState(() => {
    return utcToKstDatetimeLocal(landingPage?.timer_deadline)
  })
  const [timerColor, setTimerColor] = useState(landingPage?.timer_color || '#ef4444')
  const [timerText, setTimerText] = useState(landingPage?.timer_text || '특별 할인 마감까지')
  const [timerCountdown, setTimerCountdown] = useState('00:00:00')
  const [timerAutoUpdate, setTimerAutoUpdate] = useState(landingPage?.timer_auto_update ?? false)
  const [timerAutoUpdateDays, setTimerAutoUpdateDays] = useState(landingPage?.timer_auto_update_days || 7)
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

  // Company short_id for ref parameter
  const [companyShortId, setCompanyShortId] = useState<string | null>(null)

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

  // Completion page settings
  const [successMessage, setSuccessMessage] = useState(
    landingPage?.success_message || '신청이 완료되었습니다. 곧 연락드리겠습니다.'
  )
  const [completionInfoMessage, setCompletionInfoMessage] = useState(
    landingPage?.completion_info_message || '담당자가 빠른 시일 내에 연락드릴 예정입니다.\n문의사항이 있으시면 언제든지 연락해 주세요.'
  )
  const [completionBgImage, setCompletionBgImage] = useState<string | null>(
    landingPage?.completion_bg_image || null
  )
  const [completionBgColor, setCompletionBgColor] = useState(
    landingPage?.completion_bg_color || '#5b8def'
  )
  const [uploadingCompletionBg, setUploadingCompletionBg] = useState(false)

  // Preview tab state
  const [previewTab, setPreviewTab] = useState<'landing' | 'completion'>('landing')

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

  // Preview size control (px)
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400) // Default sidebar width
  const [isResizing, setIsResizing] = useState(false)

  // Realtime rolling state
  const [currentRealtimeIndex, setCurrentRealtimeIndex] = useState(0)
  const [realtimeLeads, setRealtimeLeads] = useState<Array<{ name: string; device: string }>>([])

  // Fetch actual leads from Supabase with Realtime subscription
  useEffect(() => {
    if (!realtimeEnabled || !collectData || !landingPage?.id) return

    // Initial fetch of recent leads
    const fetchRecentLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('name, device_type, created_at')
        .eq('landing_page_id', landingPage.id)
        .order('created_at', { ascending: false })
        .limit(realtimeCount)

      if (data && data.length > 0) {
        setRealtimeLeads(data.map(lead => ({
          name: lead.name || '익명',
          device: lead.device_type === 'pc' ? 'PC' : lead.device_type === 'mobile' ? '모바일' : lead.device_type === 'tablet' ? '태블릿' : '알 수 없음'
        })))
      }
    }

    fetchRecentLeads()

    // Set up Realtime subscription for new leads
    const channel = supabase
      .channel(`landing_page_leads_${landingPage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `landing_page_id=eq.${landingPage.id}`
        },
        (payload) => {
          const newLead = payload.new as any
          const device = newLead.device_type === 'pc' ? 'PC' : newLead.device_type === 'mobile' ? '모바일' : newLead.device_type === 'tablet' ? '태블릿' : '알 수 없음'
          setRealtimeLeads(prev => [
            { name: newLead.name || '익명', device },
            ...prev.slice(0, realtimeCount - 1)
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [realtimeEnabled, collectData, landingPage?.id, realtimeCount])

  // Rolling animation effect
  useEffect(() => {
    if (!realtimeEnabled || !collectData || realtimeLeads.length === 0) return

    const interval = setInterval(() => {
      setCurrentRealtimeIndex((prev) => (prev + 1) % realtimeLeads.length)
    }, realtimeSpeed * 1000)

    return () => clearInterval(interval)
  }, [realtimeEnabled, collectData, realtimeSpeed, realtimeLeads.length])

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

  // Auto-disable landing page when timer expires
  useEffect(() => {
    // Only check if timer is enabled, has a deadline, and page is currently active
    if (!timerEnabled || !timerDeadline || !isActive || !landingPage?.id) return

    // Check if timer has expired
    if (isTimerExpired(timerDeadline)) {
      // Auto-disable the landing page
      const autoDisable = async () => {
        try {
          const supabase = createClient()

          const { error } = await supabase
            .from('landing_pages')
            .update({
              is_active: false,
              status: 'draft'
            })
            .eq('id', landingPage.id)

          if (error) {
            console.error('Failed to auto-disable landing page:', error)
            setError('타이머 마감으로 인한 자동 비활성화 중 오류가 발생했습니다.')
          } else {
            // Update local state
            setIsActive(false)
            setError('타이머가 마감되어 랜딩페이지가 자동으로 비활성화되었습니다.')
          }
        } catch (err) {
          console.error('Unexpected error during auto-disable:', err)
        }
      }

      autoDisable()
    }
  }, [landingPage?.id, timerEnabled, timerDeadline, isActive])

  // Load privacy policy content
  useEffect(() => {
    async function loadPrivacyPolicy() {
      try {
        // 수정 모드일 때는 기존 데이터 사용
        if (landingPage?.privacy_content || landingPage?.marketing_content) {
          return
        }

        const { data: policy, error } = await supabase
          .from('privacy_policies')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle()  // single() 대신 maybeSingle() 사용 - 0개 또는 1개 허용

        if (error) {
          console.error('Error loading privacy policy:', error)
          return
        }

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

  // Load company short_id for ref parameter
  useEffect(() => {
    async function loadCompanyShortId() {
      try {
        const { data } = await supabase
          .from('companies')
          .select('short_id')
          .eq('id', companyId)
          .single()

        if (data?.short_id) {
          setCompanyShortId(data.short_id)
        }
      } catch (err) {
        console.error('Error loading company short_id:', err)
      }
    }

    loadCompanyShortId()
  }, [companyId])

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
      required: false, // 기본값: 선택 항목
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

  // Toggle field required
  const toggleFieldRequired = (id: string) => {
    setCustomFields(customFields.map(field =>
      field.id === id ? { ...field, required: !field.required } : field
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
        if (!realtimeEnabled || !collectData || realtimeLeads.length === 0) return null

        // Replace template placeholders with actual data
        const currentData = realtimeLeads[currentRealtimeIndex]
        const displayMessage = realtimeTemplate
          .replace('{name}', currentData.name)
          .replace('{device}', currentData.device)
          .replace('{location}', currentData.device)

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
            <div className="flex flex-col items-center gap-1">
              {timerText && (
                <div className="text-xs font-medium" style={{ color: timerColor }}>
                  {timerText}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold" style={{ color: timerColor }}>
                  {timerCountdown}
                </span>
              </div>
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
        if (!realtimeEnabled || !collectData || realtimeLeads.length === 0) return null

        const currentData = realtimeLeads[currentRealtimeIndex]
        const displayMessage = realtimeTemplate
          .replace('{name}', currentData.name)
          .replace('{device}', currentData.device)
          .replace('{location}', currentData.device)

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
            <div className="flex flex-col items-center gap-2">
              {timerText && (
                <div className="text-sm font-medium" style={{ color: timerColor }}>
                  {timerText}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: timerColor }}>
                  {timerCountdown}
                </span>
              </div>
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
                  {field.required && <span className="text-red-500 ml-1">*</span>}
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
          required: field.required ?? false, // 필수 여부 포함
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
        timer_text: timerText || null,
        timer_deadline: kstDatetimeLocalToUtc(timerDeadline), // KST → UTC 변환
        timer_color: timerColor,
        timer_sticky_position: timerStickyPosition,
        timer_auto_update: timerAutoUpdate,
        timer_auto_update_days: timerAutoUpdateDays,
        call_button_enabled: callButtonEnabled,
        call_button_phone: callButtonPhone || null, // 빈 문자열을 null로 변환
        call_button_color: callButtonColor,
        call_button_sticky_position: callButtonStickyPosition,
        require_privacy_consent: requirePrivacyConsent,
        require_marketing_consent: requireMarketingConsent,
        privacy_content: privacyContent || null, // 빈 문자열을 null로 변환
        marketing_content: marketingContent || null, // 빈 문자열을 null로 변환
        success_message: successMessage || null,
        completion_info_message: completionInfoMessage || null,
        completion_bg_image: completionBgImage || null,
        completion_bg_color: completionBgColor,
        is_active: isActive,
        status: isActive ? 'published' : 'draft', // is_active에 따라 status 설정
      }

      if (landingPage) {
        // 수정 모드 - company_id와 created_by는 제외
        const { company_id, ...updateData } = dataToSave

        // Prepare final update payload
        const finalUpdateData = {
          ...updateData,
          updated_at: new Date().toISOString(),
        }

        // Check authentication before UPDATE
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!session) {
          console.error('❌ [ERROR] No active session - user not authenticated!')
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
        }

        // Update landing page (RLS handles company_id filtering)
        const { data: updateResult, error: updateError } = await supabase
          .from('landing_pages')
          .update(finalUpdateData)
          .eq('id', landingPage.id)
          .select()

        if (updateError) {
          console.error('❌ [ERROR] Update error:', updateError)
          throw updateError
        }

        if (!updateResult || updateResult.length === 0) {
          console.error('⚠️ [WARNING] UPDATE affected 0 rows - RLS may be blocking the update')
        }
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

      // Revalidate the landing page cache if published
      if (isActive && slug) {
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              secret: process.env.NEXT_PUBLIC_REVALIDATION_SECRET,
            }),
          })
        } catch (revalidateError) {
          console.warn('Cache revalidation failed:', revalidateError)
          // Don't block save on revalidation failure
        }
      }

      console.log('Save successful, redirecting...')
      router.push('/dashboard/landing-pages')
      router.refresh()
    } catch (err: any) {
      console.error('Save failed:', err)
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

  // Completion background image upload
  const handleCompletionBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('이미지 크기는 2MB 이하여야 합니다.')
      return
    }

    setUploadingCompletionBg(true)
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file, 1200, 0.85)

      // Generate unique filename
      const fileExt = file.type.split('/')[1]
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `completion-backgrounds/${companyId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('landing-page-images')
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('landing-page-images')
        .getPublicUrl(filePath)

      setCompletionBgImage(publicUrl)
    } catch (error) {
      console.error('Error uploading completion background:', error)
      alert('이미지 업로드 중 오류가 발생했습니다: ' + (error as Error).message)
    } finally {
      setUploadingCompletionBg(false)
    }
  }

  // Remove completion background image
  const handleRemoveCompletionBgImage = async () => {
    if (!completionBgImage) return

    try {
      // Extract file path from public URL
      const url = new URL(completionBgImage)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.findIndex(p => p === 'landing-page-images')
      if (bucketIndex === -1) {
        throw new Error('Invalid image URL format')
      }
      const filePath = pathParts.slice(bucketIndex + 1).join('/')

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('landing-page-images')
        .remove([filePath])

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Don't throw - even if delete fails, we should clear the UI
      }

      setCompletionBgImage(null)
    } catch (error) {
      console.error('Error removing completion background:', error)
      // Still clear the image from state even if deletion fails
      setCompletionBgImage(null)
    }
  }

  // Handle mouse resize for sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const containerRect = document.getElementById('landing-page-container')?.getBoundingClientRect()
    if (!containerRect) return

    const newWidth = containerRect.right - e.clientX
    // Clamp between 300px and 600px
    setSidebarWidth(Math.max(300, Math.min(600, newWidth)))
  }, [])

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div id="landing-page-container" className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      {/* Main Form */}
      <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
        {/* Deployment Toggle - Top */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                상태
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {isActive ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              onClick={() => {
                // Prevent activation if timer is expired
                if (!isActive && timerEnabled && timerDeadline && isTimerExpired(timerDeadline)) {
                  setError('타이머가 마감되었습니다. 먼저 타이머 설정을 변경해주세요.')
                  return
                }
                setIsActive(!isActive)
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={isActive}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  isActive ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* URL Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
            랜딩페이지 주소
          </h2>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-gray-600 flex-shrink-0">
                https://funnely.co.kr/landing/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full sm:flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              랜딩페이지 설명
            </h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={descriptionEnabled}
                  onChange={() => setDescriptionEnabled(true)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!descriptionEnabled}
                  onChange={() => setDescriptionEnabled(false)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              이미지/영상 등록
            </h2>
            <label className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer gap-2 text-sm sm:text-base">
              <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              파일 업로드
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="space-y-4">

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group bg-gray-50 rounded-xl border-2 border-gray-200 aspect-video"
                  >
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                      title="이미지 삭제"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    <img
                      src={image}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        // 이미지 로드 실패 시 기본 아이콘 표시
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent && !parent.querySelector('.fallback-icon')) {
                          const fallback = document.createElement('div')
                          fallback.className = 'fallback-icon absolute inset-0 flex flex-col items-center justify-center bg-gray-100 rounded-lg'
                          fallback.innerHTML = '<svg class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs text-gray-500 mt-2">로드 실패</p>'
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg pointer-events-none">
                      <p className="text-xs text-white truncate">
                        이미지 {index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DB Collection Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">DB 수집 항목</h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={collectData}
                  onChange={() => setCollectData(true)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!collectData}
                  onChange={() => setCollectData(false)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
          </div>

          {collectData && (
            <div className="space-y-4">
              {/* Collection Mode Selection */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={collectionMode === 'inline'}
                    onChange={() => setCollectionMode('inline')}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                  />
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">옵션1: 페이지 내 수집</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={collectionMode === 'external'}
                    onChange={() => setCollectionMode('external')}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600"
                  />
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">옵션2: 외부 페이지 수집</span>
                </label>
              </div>

              {/* Collection Mode Description */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 sm:p-4">
                {collectionMode === 'inline' ? (
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="font-semibold text-indigo-700">옵션1:</span> 랜딩 페이지에서 바로 정보 수집
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="font-semibold text-purple-700">옵션2:</span> 별도 페이지에서 상세 정보 수집
                  </p>
                )}
              </div>

            {/* External Page Info (Option 2 only) */}
            {collectionMode === 'external' && (
              <div className="bg-purple-50 rounded-xl p-3 sm:p-4 mb-4">
                <p className="text-xs sm:text-sm text-purple-900 break-all">
                  💡 외부 수집 페이지 URL: <span className="font-semibold">https://funnely.co.kr/landing/{slug || '[페이지-주소]'}/collect-detail</span>
                </p>
                <p className="text-xs text-purple-700 mt-2">
                  옵션2를 선택하면 위 URL로 별도의 수집 페이지가 생성됩니다. 아래에서 수집할 항목을 설정해주세요.
                </p>
              </div>
            )}

              {/* Collection Settings (Common for both options) */}
              {collectionMode && (
              <div className="space-y-4">
                {/* Fixed Fields: Name and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <label className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={collectName}
                      onChange={(e) => setCollectName(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">1. 이름</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={collectPhone}
                      onChange={(e) => setCollectPhone(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-900 text-sm sm:text-base">2. 연락처</span>
                  </label>
                </div>

                {/* Custom Fields */}
                {customFields.map((field, index) => (
                  <div key={field.id} className="border-2 border-gray-200 rounded-xl p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <label className="text-sm font-medium text-gray-700 sm:w-16">질문</label>
                      <input
                        type="text"
                        value={field.question}
                        onChange={(e) => updateFieldQuestion(field.id, e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        placeholder={`${index + 3}. 항목추가 질문`}
                      />
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center gap-3 pl-0 sm:pl-20">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={() => toggleFieldRequired(field.id)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">필수 항목으로 설정</span>
                      </label>
                      {field.required && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                          필수
                        </span>
                      )}
                    </div>

                    {/* Multiple Choice Options */}
                    {field.type === 'multiple_choice' && field.options && (
                      <div className="space-y-2 sm:pl-20">
                        {field.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 sm:w-20">선택항목</label>
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(field.id, optionIndex, e.target.value)}
                                className="flex-1 px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                placeholder="선택항목 입력"
                              />
                              {field.options!.length > 1 && (
                                <button
                                  onClick={() => removeOption(field.id, optionIndex)}
                                  className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
                                >
                                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(field.id)}
                          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors gap-2 sm:ml-20 text-sm"
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
          )}
        </div>

        {/* Realtime Status Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">실시간 현황 사용</h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className={`flex items-center gap-2 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={realtimeEnabled}
                  onChange={() => collectData && setRealtimeEnabled(true)}
                  disabled={!collectData}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className={`flex items-center gap-2 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={!realtimeEnabled}
                  onChange={() => collectData && setRealtimeEnabled(false)}
                  disabled={!collectData}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
          </div>

          <div>
            {/* Realtime Settings (only when enabled and collectData is true) */}
            {realtimeEnabled && collectData && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    롤링 메시지 템플릿
                  </label>
                  <p className="text-xs text-gray-500">
                    {'{name}'}과 {'{device}'}는 실제 DB 데이터로 자동 치환됩니다
                  </p>
                  <input
                    type="text"
                    value={realtimeTemplate}
                    onChange={(e) => setRealtimeTemplate(e.target.value)}
                    placeholder="예: {name}님이 {device}에서 상담 신청했습니다"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">하단 CTA 버튼</h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className={`flex items-center gap-2 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={ctaEnabled}
                  onChange={() => collectData && setCtaEnabled(true)}
                  disabled={!collectData}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className={`flex items-center gap-2 ${collectData ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input
                  type="radio"
                  checked={!ctaEnabled}
                  onChange={() => collectData && setCtaEnabled(false)}
                  disabled={!collectData}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
          </div>

          <div>
            {/* CTA Settings (only when enabled and collectData is true) */}
            {ctaEnabled && collectData && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-20">
                    버튼명
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="상담 신청하기"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-20">
                    버튼 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-200 cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                {/* Sticky Position Settings */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">타이머 사용</h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={timerEnabled}
                  onChange={() => {
                    // Warn if trying to enable expired timer
                    if (!timerEnabled && timerDeadline && isTimerExpired(timerDeadline)) {
                      setError('마감된 날짜입니다. 새로운 마감 날짜를 설정해주세요.')
                      return
                    }
                    setTimerEnabled(true)
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!timerEnabled}
                  onChange={() => setTimerEnabled(false)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
            {timerEnabled && (
              <label className="flex items-center gap-2 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={timerAutoUpdate}
                  onChange={(e) => setTimerAutoUpdate(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">자동 마감일 업데이트</span>
              </label>
            )}
          </div>

          {/* 경고 메시지 */}
          {timerEnabled && (
            <div className="mb-4">
              <p className="text-xs text-red-600 font-medium">
                ⚠️ 설정하신 마감 날짜가 지나면 신청 접수가 비활성됩니다. 반드시 마감 날짜를 확인하시기 바랍니다.
              </p>
            </div>
          )}

          {/* 타이머 만료 알림 */}
          {timerEnabled && timerDeadline && isTimerExpired(timerDeadline) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-600">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">타이머가 마감되었습니다</span>
              </div>
              <p className="text-xs text-red-500 mt-1 ml-7">
                랜딩페이지가 자동으로 비활성화되었습니다. 타이머를 연장하시려면 새로운 마감 날짜를 설정해주세요.
              </p>
            </div>
          )}

          <div>
            {timerEnabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Timer Sticky Position Settings - 위로 이동 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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

                {/* 타이머 텍스트 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-4 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-700 sm:w-24">
                    타이머 텍스트
                  </label>
                  <input
                    type="text"
                    value={timerText}
                    onChange={(e) => setTimerText(e.target.value)}
                    placeholder="예: 특별 할인 마감까지"
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {/* 마감 날짜/시간 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-24">
                    마감 날짜/시간
                  </label>
                  <input
                    type="datetime-local"
                    value={timerDeadline}
                    onChange={(e) => setTimerDeadline(e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {/* 자동 업데이트 설정 */}
                {timerAutoUpdate && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <label className="text-sm font-medium text-indigo-900 sm:w-24">
                      업데이트 주기
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={timerAutoUpdateDays}
                        onChange={(e) => setTimerAutoUpdateDays(Number(e.target.value))}
                        className="w-20 px-3 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-center"
                      />
                      <span className="text-sm text-indigo-900">일 후 자동 연장</span>
                    </div>
                    <p className="text-xs text-indigo-700 sm:ml-auto">
                      💡 마감 시간이 지나면 자동으로 {timerAutoUpdateDays}일 후로 업데이트됩니다
                    </p>
                  </div>
                )}

                {/* 타이머 색상 */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-24">
                    타이머 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={timerColor}
                      onChange={(e) => setTimerColor(e.target.value)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-200 cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={timerColor}
                      onChange={(e) => setTimerColor(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#ef4444"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call Button Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">전화 연결 버튼</h2>
            <div className="flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={callButtonEnabled}
                  onChange={() => setCallButtonEnabled(true)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
                />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">사용함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!callButtonEnabled}
                  onChange={() => setCallButtonEnabled(false)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                />
                <span className="font-semibold text-gray-600 text-sm sm:text-base">사용 안함</span>
              </label>
            </div>
          </div>

          <div>
            {callButtonEnabled && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-24">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    value={callButtonPhone}
                    onChange={(e) => setCallButtonPhone(formatPhoneNumber(e.target.value))}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder="01012345678"
                    maxLength={13}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-sm font-medium text-gray-700 sm:w-24">
                    버튼 색상
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={callButtonColor}
                      onChange={(e) => setCallButtonColor(e.target.value)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-200 cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={callButtonColor}
                      onChange={(e) => setCallButtonColor(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-mono text-sm"
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                {/* Sticky Position Settings */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    화면 고정 위치
                  </label>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">개인정보 동의</h2>
              <span className="text-xs text-gray-500">*DB 수집 시 활용</span>
            </div>
            <Link
              href="/dashboard/settings/privacy-policy"
              className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              동의 내용 수정
            </Link>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* 개인정보 수집·이용 동의 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requirePrivacyConsent}
                  onChange={(e) => setRequirePrivacyConsent(e.target.checked)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50 flex-shrink-0"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">개인정보 수집·이용 동의</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">필수</span>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="text-sm text-indigo-600 underline ml-8 sm:ml-0"
              >
                내용 미리보기
              </button>
            </div>

            {/* 마케팅 활용 동의 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={requireMarketingConsent}
                  onChange={(e) => setRequireMarketingConsent(e.target.checked)}
                  disabled={!collectData}
                  className="w-5 h-5 text-indigo-600 rounded disabled:opacity-50 flex-shrink-0"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">마케팅 활용 동의</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">선택</span>
                </div>
              </div>
              <button
                onClick={() => setShowMarketingModal(true)}
                className="text-sm text-indigo-600 underline ml-8 sm:ml-0"
              >
                내용 미리보기
              </button>
            </div>
          </div>
        </div>

        {/* Completion Page Settings */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">완료 페이지 설정</h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* 완료 메시지 (상단 헤더) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                완료 메시지
                <span className="ml-2 text-xs font-normal text-gray-500">
                  신청 완료 후 표시되는 메인 메시지
                </span>
              </label>
              <input
                type="text"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                placeholder="신청이 완료되었습니다. 곧 연락드리겠습니다."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
              />
              <p className="text-xs text-gray-500">
                완료 페이지 상단에 큰 글씨로 표시됩니다.
              </p>
            </div>

            {/* 안내 멘트 (Info Box) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                안내 멘트
                <span className="ml-2 text-xs font-normal text-gray-500">
                  Info Box에 표시되는 추가 안내 문구
                </span>
              </label>
              <textarea
                value={completionInfoMessage}
                onChange={(e) => setCompletionInfoMessage(e.target.value)}
                placeholder="담당자가 빠른 시일 내에 연락드릴 예정입니다.&#10;문의사항이 있으시면 언제든지 연락해 주세요."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base resize-none"
              />
              <p className="text-xs text-gray-500">
                완료 페이지의 파란색 정보 박스에 표시됩니다. 줄바꿈이 적용됩니다.
              </p>
            </div>

            {/* 배경 이미지 업로드 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                배경 이미지
                <span className="ml-2 text-xs font-normal text-gray-500">
                  완료 페이지 상단 배경 (선택사항)
                </span>
              </label>

              {!completionBgImage ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      id="completion-bg-upload"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCompletionBgImageUpload}
                      disabled={uploadingCompletionBg}
                      className="hidden"
                    />
                    <label
                      htmlFor="completion-bg-upload"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        uploadingCompletionBg
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-indigo-400'
                      }`}
                    >
                      {uploadingCompletionBg ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                          <p className="text-sm text-gray-500">업로드 중...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <PhotoIcon className="h-10 w-10 text-gray-400" />
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-medium">클릭하여 이미지 업로드</p>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP (최대 2MB)</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        권장 크기: 1200 x 600px / 이미지를 업로드하지 않으면 기본 배경색이 사용됩니다.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                  <img
                    src={completionBgImage}
                    alt="완료 페이지 배경"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCompletionBgImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-lg">
                    <p className="text-xs text-white">배경 이미지 적용됨</p>
                  </div>
                </div>
              )}
            </div>

            {/* 배경 색상 (이미지 미사용 시) */}
            {!completionBgImage && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  배경 색상
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    이미지가 없을 때 사용되는 배경색
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={completionBgColor}
                    onChange={(e) => setCompletionBgColor(e.target.value)}
                    className="w-16 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={completionBgColor}
                    onChange={(e) => setCompletionBgColor(e.target.value)}
                    placeholder="#5b8def"
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/dashboard/landing-pages')}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm sm:text-base"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slug || !title}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
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

      {/* Interactive Preview Sidebar with Resizable Handle */}
      <div
        className="hidden lg:flex flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize group z-20 flex items-center justify-center
            ${isResizing ? 'bg-indigo-500' : 'hover:bg-indigo-400'} transition-colors`}
        >
          <div className={`w-0.5 h-12 rounded-full transition-all
            ${isResizing ? 'bg-white' : 'bg-gray-300 group-hover:bg-white'}`}
          />
        </div>

        {/* Sticky Container */}
        <div className="sticky top-6 self-start w-full ml-2">
          {/* Height Constraint Wrapper */}
          <div className="h-[calc(100vh-3rem)] flex flex-col bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <EyeIcon className="h-6 w-6 text-indigo-600" />
              미리보기
            </h2>

            {/* Desktop Preview Button */}
            <button
              onClick={() => setShowDesktopPreview(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              데스크탑
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 border-b-2 border-gray-200">
            <button
              onClick={() => setPreviewTab('landing')}
              className={`flex-1 px-4 py-2 font-medium text-sm transition-all ${
                previewTab === 'landing'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[2px]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              랜딩 페이지
            </button>
            <button
              onClick={() => setPreviewTab('completion')}
              className={`flex-1 px-4 py-2 font-medium text-sm transition-all ${
                previewTab === 'completion'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[2px]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              완료 페이지
            </button>
          </div>

          {/* Mobile Phone Preview Frame - Flex Item */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl w-full max-w-[400px] h-full max-h-[700px] flex flex-col">
              <div className="bg-white rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
                {/* Phone Status Bar */}
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-3 border border-gray-400 rounded-sm"></div>
                    <div className="w-1 h-3 bg-gray-400 rounded-sm"></div>
                  </div>
                </div>

                {/* Preview Content - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-white relative min-h-0">
                  {previewTab === 'landing' ? (
                    <>
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
                    </>
                  ) : (
                    /* Completion Page Preview */
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-3">
                      <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col w-full">
                        {/* Header with background image or color */}
                        <div
                          className="h-36 relative flex-shrink-0"
                          style={{
                            backgroundImage: completionBgImage ? `url(${completionBgImage})` : 'none',
                            backgroundColor: completionBgImage ? 'transparent' : completionBgColor,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg">
                              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-4 text-center">
                          {/* Success Message */}
                          <h2 className="text-sm font-bold text-gray-900 mb-4">
                            {successMessage || '신청이 완료되었습니다. 곧 연락드리겠습니다.'}
                          </h2>

                          {/* Info Box */}
                          <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                <svg className="w-2.5 h-2.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="text-left flex-1">
                                <p className="text-[10px] text-gray-700 whitespace-pre-line leading-snug">
                                  {completionInfoMessage || '담당자가 빠른 시일 내에 연락드릴 예정입니다.\n문의사항이 있으시면 언제든지 연락해 주세요.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Close Button */}
                          <div className="flex justify-center">
                            <button
                              onClick={() => alert('미리보기 모드입니다')}
                              className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-lg bg-indigo-600"
                            >
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              창 닫기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Help Text - Fixed at Bottom */}
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl flex-shrink-0">
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
