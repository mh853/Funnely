/**
 * Landing Page Form Types
 * Centralized type definitions for the landing page form system
 */

export interface CustomField {
  id: string
  type: 'short_answer' | 'multiple_choice'
  question: string
  options?: string[]
}

export type SectionType =
  | 'hero_image'
  | 'title'
  | 'description'
  | 'form'
  | 'realtime_status'
  | 'timer'
  | 'cta_button'
  | 'call_button'
  | 'privacy_consent'

export interface Section {
  id: string
  type: SectionType
  label: string
  enabled: boolean
}

export type StickyPosition = 'none' | 'top' | 'bottom'
export type CollectionMode = 'inline' | 'external'
export type PreviewTab = 'landing' | 'completion'

/**
 * Main form state interface
 * Contains all form fields and UI state
 */
export interface LandingPageFormState {
  // Basic Info
  slug: string
  title: string
  description: string
  images: string[]

  // Collection Settings
  collectData: boolean
  collectName: boolean
  collectPhone: boolean
  customFields: CustomField[]
  collectionMode: CollectionMode

  // Design - CTA Button
  ctaEnabled: boolean
  ctaText: string
  ctaColor: string
  ctaStickyPosition: StickyPosition

  // Design - Timer
  timerEnabled: boolean
  timerText: string
  timerDeadline: string
  timerColor: string
  timerStickyPosition: StickyPosition
  timerCountdown: string

  // Design - Call Button
  callButtonEnabled: boolean
  callButtonPhone: string
  callButtonColor: string
  callButtonStickyPosition: StickyPosition

  // Sections
  sections: Section[]
  draggedIndex: number | null

  // Privacy & Consent
  requirePrivacyConsent: boolean
  requireMarketingConsent: boolean
  privacyContent: string
  marketingContent: string

  // Completion Page
  successMessage: string
  completionInfoMessage: string
  completionBgImage: string | null
  completionBgColor: string

  // Realtime Status
  descriptionEnabled: boolean
  realtimeEnabled: boolean
  realtimeTemplate: string
  realtimeSpeed: number
  realtimeCount: number
  currentRealtimeIndex: number

  // Deployment
  isActive: boolean

  // UI State
  saving: boolean
  error: string
  uploadingCompletionBg: boolean
  previewTab: PreviewTab
  showDesktopPreview: boolean
  showFieldTypeModal: boolean
  showExternalFormModal: boolean
  showPrivacyModal: boolean
  showMarketingModal: boolean

  // Preview
  sidebarWidth: number
  isResizing: boolean

  // Company Info
  companyShortId: string | null
}

/**
 * Form actions interface
 * All available actions for updating form state
 */
export interface LandingPageFormActions {
  // Basic Info Actions
  setSlug: (slug: string) => void
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  addImage: (url: string) => void
  removeImage: (index: number) => void
  setImages: (images: string[]) => void

  // Collection Actions
  setCollectData: (value: boolean) => void
  setCollectName: (value: boolean) => void
  setCollectPhone: (value: boolean) => void
  setCollectionMode: (mode: CollectionMode) => void

  // Custom Fields Actions
  addCustomField: (type: 'short_answer' | 'multiple_choice') => void
  removeCustomField: (id: string) => void
  updateFieldQuestion: (id: string, question: string) => void
  addOption: (fieldId: string) => void
  updateOption: (fieldId: string, optionIndex: number, value: string) => void
  removeOption: (fieldId: string, optionIndex: number) => void

  // CTA Actions
  setCtaEnabled: (value: boolean) => void
  setCtaText: (text: string) => void
  setCtaColor: (color: string) => void
  setCtaStickyPosition: (position: StickyPosition) => void

  // Timer Actions
  setTimerEnabled: (value: boolean) => void
  setTimerText: (text: string) => void
  setTimerDeadline: (deadline: string) => void
  setTimerColor: (color: string) => void
  setTimerStickyPosition: (position: StickyPosition) => void
  setTimerCountdown: (countdown: string) => void

  // Call Button Actions
  setCallButtonEnabled: (value: boolean) => void
  setCallButtonPhone: (phone: string) => void
  setCallButtonColor: (color: string) => void
  setCallButtonStickyPosition: (position: StickyPosition) => void

  // Sections Actions
  setSections: (sections: Section[]) => void
  reorderSections: (startIndex: number, endIndex: number) => void
  setDraggedIndex: (index: number | null) => void

  // Privacy Actions
  setRequirePrivacyConsent: (value: boolean) => void
  setRequireMarketingConsent: (value: boolean) => void
  setPrivacyContent: (content: string) => void
  setMarketingContent: (content: string) => void

  // Completion Page Actions
  setSuccessMessage: (message: string) => void
  setCompletionInfoMessage: (message: string) => void
  setCompletionBgImage: (image: string | null) => void
  setCompletionBgColor: (color: string) => void
  setUploadingCompletionBg: (value: boolean) => void

  // Realtime Actions
  setDescriptionEnabled: (value: boolean) => void
  setRealtimeEnabled: (value: boolean) => void
  setRealtimeTemplate: (template: string) => void
  setRealtimeSpeed: (speed: number) => void
  setRealtimeCount: (count: number) => void
  setCurrentRealtimeIndex: (index: number) => void

  // Deployment Actions
  setIsActive: (value: boolean) => void

  // UI State Actions
  setSaving: (value: boolean) => void
  setError: (error: string) => void
  setPreviewTab: (tab: PreviewTab) => void
  setShowDesktopPreview: (value: boolean) => void
  setShowFieldTypeModal: (value: boolean) => void
  setShowExternalFormModal: (value: boolean) => void
  setShowPrivacyModal: (value: boolean) => void
  setShowMarketingModal: (value: boolean) => void
  setSidebarWidth: (width: number) => void
  setIsResizing: (value: boolean) => void

  // Company Info Actions
  setCompanyShortId: (shortId: string | null) => void

  // Complex Actions
  handleSave: () => Promise<void>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleCompletionBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

/**
 * Props for LandingPageNewForm component
 */
export interface LandingPageNewFormProps {
  companyId: string
  userId: string
  landingPage?: any // Existing landing page data for edit mode
}

/**
 * Context type combining state and actions
 */
export interface LandingPageFormContextType {
  state: LandingPageFormState
  actions: LandingPageFormActions
}
