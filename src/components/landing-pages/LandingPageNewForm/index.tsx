'use client'

import { LandingPageFormProvider } from './context'
import { LandingPageNewFormProps } from './context/types'
import {
  useFormSubmit,
  useImageUpload,
  useTimerCountdown,
  usePrivacyPolicy,
  useCompanyInfo,
  useRealtimeRolling,
} from './hooks'

/**
 * Main Landing Page Form Container
 * This is a temporary wrapper to test Context Provider integration
 * Will be replaced with full component structure in Week 2-3
 */
function LandingPageFormContent({ companyId, userId, landingPage }: LandingPageNewFormProps) {
  // Initialize hooks
  const { handleSave, saving, error } = useFormSubmit(companyId, userId, landingPage)
  const { handleFileUpload, handleCompletionBgUpload } = useImageUpload(companyId)
  const { timerCountdown } = useTimerCountdown()
  usePrivacyPolicy(companyId, landingPage)
  useCompanyInfo(companyId)
  useRealtimeRolling()

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold">
          {landingPage ? '랜딩페이지 수정' : '랜딩페이지 만들기'}
        </h1>
        <p className="mt-2 text-indigo-100">
          새로운 컴포넌트 구조로 마이그레이션 중입니다. Context Provider가 정상 작동 중입니다.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">✅ Week 1 완료 체크리스트</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>디렉토리 구조 생성</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>타입 정의 (types.ts)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Context Provider 구현</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Custom Hooks 추출 (6개)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-500">→</span>
            <span>다음 단계: Week 2 섹션 컴포넌트 구현</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>주의:</strong> 이 페이지는 Context Provider 통합 테스트용입니다.
              실제 폼 UI는 Week 2-3에서 구현될 예정입니다.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-md font-semibold mb-3">Context 상태 확인</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <span className="text-gray-600">Timer Countdown:</span>
            <div className="font-mono text-indigo-600 mt-1">{timerCountdown}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="text-gray-600">저장 상태:</span>
            <div className="font-semibold mt-1">{saving ? '저장 중...' : '대기'}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
        >
          돌아가기
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '저장 중...' : '저장하기 (테스트)'}
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
