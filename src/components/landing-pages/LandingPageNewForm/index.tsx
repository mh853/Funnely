'use client'

import { LandingPageFormProvider, useLandingPageForm } from './context'
import { LandingPageNewFormProps } from './context/types'
import {
  useFormSubmit,
  useImageUpload,
  useTimerCountdown,
  usePrivacyPolicy,
  useCompanyInfo,
  useRealtimeRolling,
} from './hooks'
import {
  BasicInfoSection,
  CollectionFieldsSection,
  DesignSection,
  SectionOrderManager,
  PrivacySection,
  CompletionPageSection,
  DeploymentSection,
} from './sections'
import ImageUploader from './components/ImageUploader'

/**
 * Main Landing Page Form Container
 * Integrated with all section components from Week 2
 */
function LandingPageFormContent({ companyId, userId, landingPage }: LandingPageNewFormProps) {
  // Initialize hooks
  const { handleSave, saving, error } = useFormSubmit(companyId, userId, landingPage)
  const { handleFileUpload } = useImageUpload(companyId)
  useTimerCountdown()
  usePrivacyPolicy(companyId, landingPage)
  useCompanyInfo(companyId)
  useRealtimeRolling()

  const { state } = useLandingPageForm()

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold">
          {landingPage ? '랜딩페이지 수정' : '랜딩페이지 만들기'}
        </h1>
        <p className="mt-2 text-indigo-100">
          설정을 완료한 후 저장하면 랜딩페이지가 {landingPage ? '업데이트' : '생성'}됩니다
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <BasicInfoSection />

      {/* Hero Images */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">히어로 이미지</h2>
          <p className="mt-1 text-sm text-gray-600">
            랜딩페이지 상단에 표시될 메인 이미지를 업로드하세요 (최대 5개)
          </p>
        </div>
        <ImageUploader onUpload={handleFileUpload} />
      </div>

      {/* Collection Fields Section */}
      <CollectionFieldsSection />

      {/* Design Section */}
      <DesignSection />

      {/* Section Order Manager */}
      <SectionOrderManager />

      {/* Privacy Section */}
      <PrivacySection />

      {/* Completion Page Section */}
      <CompletionPageSection companyId={companyId} />

      {/* Deployment Section */}
      <DeploymentSection companyShortId={state.companyShortId} />

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200">
        <button
          onClick={() => window.history.back()}
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중...' : landingPage ? '수정 완료' : '랜딩페이지 만들기'}
        </button>
      </div>
    </div>
  )
}

/**
 * Landing Page New Form with Provider
 * Wraps content with Context Provider
 */
export default function LandingPageNewForm(props: LandingPageNewFormProps) {
  return (
    <LandingPageFormProvider {...props}>
      <LandingPageFormContent {...props} />
    </LandingPageFormProvider>
  )
}
