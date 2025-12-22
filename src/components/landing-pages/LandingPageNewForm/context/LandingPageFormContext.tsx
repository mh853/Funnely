'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LandingPageFormState,
  LandingPageFormActions,
  LandingPageFormContextType,
  LandingPageNewFormProps,
  CustomField,
  Section,
  StickyPosition,
  CollectionMode,
  PreviewTab,
} from './types'

/**
 * Context for managing landing page form state
 */
const LandingPageFormContext = createContext<LandingPageFormContextType | null>(null)

/**
 * Hook to access landing page form context
 * @throws Error if used outside of LandingPageFormProvider
 */
export const useLandingPageForm = () => {
  const context = useContext(LandingPageFormContext)
  if (!context) {
    throw new Error('useLandingPageForm must be used within LandingPageFormProvider')
  }
  return context
}

/**
 * Helper function to parse custom fields from DB
 */
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

/**
 * Initial state factory
 */
const createInitialState = (landingPage?: any): LandingPageFormState => {
  return {
    // Basic Info
    slug: landingPage?.slug || '',
    title: landingPage?.title || '',
    description: landingPage?.description || '',
    images: landingPage?.images || [],

    // Collection Settings
    collectData: landingPage?.collect_data ?? true,
    collectName: landingPage?.collect_fields?.some((f: any) => f.type === 'name') ?? true,
    collectPhone: landingPage?.collect_fields?.some((f: any) => f.type === 'phone') ?? true,
    customFields: parseCustomFields(landingPage?.collect_fields),
    collectionMode: landingPage?.collection_mode || 'inline',

    // Design - CTA
    ctaEnabled: landingPage?.cta_enabled ?? true,
    ctaText: landingPage?.cta_text || '',
    ctaColor: landingPage?.cta_color || '#6366f1',
    ctaStickyPosition: landingPage?.cta_sticky_position || 'none',

    // Design - Timer
    timerEnabled: landingPage?.timer_enabled ?? true,
    timerText: landingPage?.timer_text || '특별 할인 마감까지',
    timerDeadline: (() => {
      if (!landingPage?.timer_deadline) return ''
      const utcDate = new Date(landingPage.timer_deadline)
      const year = utcDate.getFullYear()
      const month = String(utcDate.getMonth() + 1).padStart(2, '0')
      const day = String(utcDate.getDate()).padStart(2, '0')
      const hours = String(utcDate.getHours()).padStart(2, '0')
      const minutes = String(utcDate.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    })(),
    timerColor: landingPage?.timer_color || '#ef4444',
    timerStickyPosition: landingPage?.timer_sticky_position || 'none',
    timerCountdown: '00:00:00',

    // Design - Call Button
    callButtonEnabled: landingPage?.call_button_enabled ?? true,
    callButtonPhone: landingPage?.call_button_phone || '',
    callButtonColor: landingPage?.call_button_color || '#10b981',
    callButtonStickyPosition: landingPage?.call_button_sticky_position || 'none',

    // Sections
    sections: landingPage?.sections || [
      { id: '1', type: 'hero_image', label: '히어로 이미지', enabled: true },
      { id: '3', type: 'description', label: '설명', enabled: true },
      { id: '6', type: 'timer', label: '타이머', enabled: true },
      { id: '5', type: 'realtime_status', label: '실시간 현황', enabled: true },
      { id: '4', type: 'form', label: 'DB 수집 폼', enabled: true },
      { id: '9', type: 'privacy_consent', label: '개인정보 동의', enabled: true },
      { id: '7', type: 'cta_button', label: 'CTA 버튼', enabled: true },
      { id: '8', type: 'call_button', label: '전화 연결', enabled: true },
    ],
    draggedIndex: null,

    // Privacy
    requirePrivacyConsent: landingPage?.require_privacy_consent ?? true,
    requireMarketingConsent: landingPage?.require_marketing_consent ?? false,
    privacyContent: landingPage?.privacy_content || '',
    marketingContent: landingPage?.marketing_content || '',

    // Completion
    successMessage: landingPage?.success_message || '신청이 완료되었습니다. 곧 연락드리겠습니다.',
    completionInfoMessage:
      landingPage?.completion_info_message ||
      '담당자가 빠른 시일 내에 연락드릴 예정입니다.\n문의사항이 있으시면 언제든지 연락해 주세요.',
    completionBgImage: landingPage?.completion_bg_image || null,
    completionBgColor: landingPage?.completion_bg_color || '#5b8def',

    // Realtime
    descriptionEnabled: landingPage?.description_enabled ?? true,
    realtimeEnabled: landingPage?.realtime_enabled ?? true,
    realtimeTemplate: landingPage?.realtime_template || '{name}님이 {location}에서 상담 신청했습니다',
    realtimeSpeed: landingPage?.realtime_speed || 5,
    realtimeCount: landingPage?.realtime_count || 10,
    currentRealtimeIndex: 0,

    // Deployment
    isActive: landingPage?.is_active ?? true,

    // UI State
    saving: false,
    error: '',
    uploadingCompletionBg: false,
    previewTab: 'landing',
    showDesktopPreview: false,
    showFieldTypeModal: false,
    showExternalFormModal: false,
    showPrivacyModal: false,
    showMarketingModal: false,
    sidebarWidth: 400,
    isResizing: false,

    // Company Info
    companyShortId: null,
  }
}

/**
 * Provider component for landing page form context
 */
export const LandingPageFormProvider = ({
  children,
  companyId,
  userId,
  landingPage,
}: LandingPageNewFormProps & { children: ReactNode }) => {
  const [state, setState] = useState<LandingPageFormState>(() => createInitialState(landingPage))
  const router = useRouter()
  const supabase = createClient()

  // Create actions object with useCallback for performance
  const actions: LandingPageFormActions = {
    // Basic Info Actions
    setSlug: useCallback((slug: string) => setState((s) => ({ ...s, slug })), []),
    setTitle: useCallback((title: string) => setState((s) => ({ ...s, title })), []),
    setDescription: useCallback((description: string) => setState((s) => ({ ...s, description })), []),
    addImage: useCallback((url: string) => setState((s) => ({ ...s, images: [...s.images, url] })), []),
    removeImage: useCallback(
      (index: number) => setState((s) => ({ ...s, images: s.images.filter((_, i) => i !== index) })),
      []
    ),
    setImages: useCallback((images: string[]) => setState((s) => ({ ...s, images })), []),

    // Collection Actions
    setCollectData: useCallback((value: boolean) => setState((s) => ({ ...s, collectData: value })), []),
    setCollectName: useCallback((value: boolean) => setState((s) => ({ ...s, collectName: value })), []),
    setCollectPhone: useCallback((value: boolean) => setState((s) => ({ ...s, collectPhone: value })), []),
    setCollectionMode: useCallback((mode: CollectionMode) => setState((s) => ({ ...s, collectionMode: mode })), []),

    // Custom Fields Actions
    addCustomField: useCallback((type: 'short_answer' | 'multiple_choice') => {
      const newField: CustomField = {
        id: Date.now().toString(),
        type,
        question: '',
        options: type === 'multiple_choice' ? [''] : undefined,
      }
      setState((s) => ({ ...s, customFields: [...s.customFields, newField], showFieldTypeModal: false }))
    }, []),
    removeCustomField: useCallback(
      (id: string) => setState((s) => ({ ...s, customFields: s.customFields.filter((f) => f.id !== id) })),
      []
    ),
    updateFieldQuestion: useCallback(
      (id: string, question: string) =>
        setState((s) => ({
          ...s,
          customFields: s.customFields.map((f) => (f.id === id ? { ...f, question } : f)),
        })),
      []
    ),
    addOption: useCallback(
      (fieldId: string) =>
        setState((s) => ({
          ...s,
          customFields: s.customFields.map((f) =>
            f.id === fieldId && f.options ? { ...f, options: [...f.options, ''] } : f
          ),
        })),
      []
    ),
    updateOption: useCallback(
      (fieldId: string, optionIndex: number, value: string) =>
        setState((s) => ({
          ...s,
          customFields: s.customFields.map((f) => {
            if (f.id === fieldId && f.options) {
              const newOptions = [...f.options]
              newOptions[optionIndex] = value
              return { ...f, options: newOptions }
            }
            return f
          }),
        })),
      []
    ),
    removeOption: useCallback(
      (fieldId: string, optionIndex: number) =>
        setState((s) => ({
          ...s,
          customFields: s.customFields.map((f) => {
            if (f.id === fieldId && f.options && f.options.length > 1) {
              return { ...f, options: f.options.filter((_, i) => i !== optionIndex) }
            }
            return f
          }),
        })),
      []
    ),

    // CTA Actions
    setCtaEnabled: useCallback((value: boolean) => setState((s) => ({ ...s, ctaEnabled: value })), []),
    setCtaText: useCallback((text: string) => setState((s) => ({ ...s, ctaText: text })), []),
    setCtaColor: useCallback((color: string) => setState((s) => ({ ...s, ctaColor: color })), []),
    setCtaStickyPosition: useCallback(
      (position: StickyPosition) => setState((s) => ({ ...s, ctaStickyPosition: position })),
      []
    ),

    // Timer Actions
    setTimerEnabled: useCallback((value: boolean) => setState((s) => ({ ...s, timerEnabled: value })), []),
    setTimerText: useCallback((text: string) => setState((s) => ({ ...s, timerText: text })), []),
    setTimerDeadline: useCallback((deadline: string) => setState((s) => ({ ...s, timerDeadline: deadline })), []),
    setTimerColor: useCallback((color: string) => setState((s) => ({ ...s, timerColor: color })), []),
    setTimerStickyPosition: useCallback(
      (position: StickyPosition) => setState((s) => ({ ...s, timerStickyPosition: position })),
      []
    ),
    setTimerCountdown: useCallback((countdown: string) => setState((s) => ({ ...s, timerCountdown: countdown })), []),

    // Call Button Actions
    setCallButtonEnabled: useCallback((value: boolean) => setState((s) => ({ ...s, callButtonEnabled: value })), []),
    setCallButtonPhone: useCallback((phone: string) => setState((s) => ({ ...s, callButtonPhone: phone })), []),
    setCallButtonColor: useCallback((color: string) => setState((s) => ({ ...s, callButtonColor: color })), []),
    setCallButtonStickyPosition: useCallback(
      (position: StickyPosition) => setState((s) => ({ ...s, callButtonStickyPosition: position })),
      []
    ),

    // Sections Actions
    setSections: useCallback((sections: Section[]) => setState((s) => ({ ...s, sections })), []),
    reorderSections: useCallback((startIndex: number, endIndex: number) => {
      setState((s) => {
        const newSections = [...s.sections]
        const [removed] = newSections.splice(startIndex, 1)
        newSections.splice(endIndex, 0, removed)
        return { ...s, sections: newSections }
      })
    }, []),
    setDraggedIndex: useCallback((index: number | null) => setState((s) => ({ ...s, draggedIndex: index })), []),

    // Privacy Actions
    setRequirePrivacyConsent: useCallback(
      (value: boolean) => setState((s) => ({ ...s, requirePrivacyConsent: value })),
      []
    ),
    setRequireMarketingConsent: useCallback(
      (value: boolean) => setState((s) => ({ ...s, requireMarketingConsent: value })),
      []
    ),
    setPrivacyContent: useCallback((content: string) => setState((s) => ({ ...s, privacyContent: content })), []),
    setMarketingContent: useCallback(
      (content: string) => setState((s) => ({ ...s, marketingContent: content })),
      []
    ),

    // Completion Page Actions
    setSuccessMessage: useCallback((message: string) => setState((s) => ({ ...s, successMessage: message })), []),
    setCompletionInfoMessage: useCallback(
      (message: string) => setState((s) => ({ ...s, completionInfoMessage: message })),
      []
    ),
    setCompletionBgImage: useCallback(
      (image: string | null) => setState((s) => ({ ...s, completionBgImage: image })),
      []
    ),
    setCompletionBgColor: useCallback((color: string) => setState((s) => ({ ...s, completionBgColor: color })), []),
    setUploadingCompletionBg: useCallback(
      (value: boolean) => setState((s) => ({ ...s, uploadingCompletionBg: value })),
      []
    ),

    // Realtime Actions
    setDescriptionEnabled: useCallback(
      (value: boolean) => setState((s) => ({ ...s, descriptionEnabled: value })),
      []
    ),
    setRealtimeEnabled: useCallback((value: boolean) => setState((s) => ({ ...s, realtimeEnabled: value })), []),
    setRealtimeTemplate: useCallback(
      (template: string) => setState((s) => ({ ...s, realtimeTemplate: template })),
      []
    ),
    setRealtimeSpeed: useCallback((speed: number) => setState((s) => ({ ...s, realtimeSpeed: speed })), []),
    setRealtimeCount: useCallback((count: number) => setState((s) => ({ ...s, realtimeCount: count })), []),
    setCurrentRealtimeIndex: useCallback(
      (index: number) => setState((s) => ({ ...s, currentRealtimeIndex: index })),
      []
    ),

    // Deployment Actions
    setIsActive: useCallback((value: boolean) => setState((s) => ({ ...s, isActive: value })), []),

    // UI State Actions
    setSaving: useCallback((value: boolean) => setState((s) => ({ ...s, saving: value })), []),
    setError: useCallback((error: string) => setState((s) => ({ ...s, error })), []),
    setPreviewTab: useCallback((tab: PreviewTab) => setState((s) => ({ ...s, previewTab: tab })), []),
    setShowDesktopPreview: useCallback(
      (value: boolean) => setState((s) => ({ ...s, showDesktopPreview: value })),
      []
    ),
    setShowFieldTypeModal: useCallback(
      (value: boolean) => setState((s) => ({ ...s, showFieldTypeModal: value })),
      []
    ),
    setShowExternalFormModal: useCallback(
      (value: boolean) => setState((s) => ({ ...s, showExternalFormModal: value })),
      []
    ),
    setShowPrivacyModal: useCallback((value: boolean) => setState((s) => ({ ...s, showPrivacyModal: value })), []),
    setShowMarketingModal: useCallback(
      (value: boolean) => setState((s) => ({ ...s, showMarketingModal: value })),
      []
    ),
    setSidebarWidth: useCallback((width: number) => setState((s) => ({ ...s, sidebarWidth: width })), []),
    setIsResizing: useCallback((value: boolean) => setState((s) => ({ ...s, isResizing: value })), []),

    // Company Info Actions
    setCompanyShortId: useCallback((shortId: string | null) => setState((s) => ({ ...s, companyShortId: shortId })), []),

    // Complex Actions - will be implemented in hooks
    handleSave: async () => {
      // Placeholder - will be implemented in useFormSubmit hook
      console.log('handleSave not yet implemented')
    },
    handleFileUpload: async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Placeholder - will be implemented in useImageUpload hook
      console.log('handleFileUpload not yet implemented')
    },
    handleCompletionBgUpload: async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Placeholder - will be implemented in useImageUpload hook
      console.log('handleCompletionBgUpload not yet implemented')
    },
  }

  const contextValue: LandingPageFormContextType = {
    state,
    actions,
  }

  return <LandingPageFormContext.Provider value={contextValue}>{children}</LandingPageFormContext.Provider>
}
