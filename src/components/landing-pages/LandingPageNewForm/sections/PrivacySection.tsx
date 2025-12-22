'use client'

import { useLandingPageForm } from '../context'

/**
 * Privacy Section
 * Manages privacy consent and marketing consent settings
 */
export default function PrivacySection() {
  const { state, actions } = useLandingPageForm()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">개인정보 동의 설정</h2>
        <p className="mt-1 text-sm text-gray-600">
          개인정보 수집 및 마케팅 동의 문구를 설정하세요
        </p>
      </div>

      {/* Privacy Consent */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900">
            개인정보 수집·이용 동의
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.privacyRequired}
              onChange={(e) => actions.setPrivacyRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">필수</span>
          </label>
        </div>

        <textarea
          value={state.privacyContent}
          onChange={(e) => actions.setPrivacyContent(e.target.value)}
          placeholder="개인정보 수집 및 이용에 대한 동의 문구를 입력하세요..."
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />

        <p className="text-xs text-gray-500">
          💡 팁: 회사 정보에서 등록한 기본 개인정보 처리방침이 자동으로 표시됩니다.
          수정하면 이 랜딩페이지에만 적용됩니다.
        </p>
      </div>

      {/* Marketing Consent */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900">마케팅 활용 동의</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.marketingRequired}
              onChange={(e) => actions.setMarketingRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">필수</span>
          </label>
        </div>

        <textarea
          value={state.marketingContent}
          onChange={(e) => actions.setMarketingContent(e.target.value)}
          placeholder="마케팅 활용 동의 문구를 입력하세요..."
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />

        <p className="text-xs text-gray-500">
          💡 팁: 마케팅 활용 동의는 선택 사항으로 설정하는 것을 권장합니다.
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">미리보기</h3>

        <div className="space-y-2">
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span>
              {state.privacyRequired && <span className="text-red-500">* </span>}
              개인정보 수집·이용 동의
              {state.privacyContent && ` (${state.privacyContent.substring(0, 30)}...)`}
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span>
              {state.marketingRequired && <span className="text-red-500">* </span>}
              마케팅 활용 동의
              {state.marketingContent && ` (${state.marketingContent.substring(0, 30)}...)`}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
