'use client'

import { useLandingPageForm } from '../context'
import { useRealtimeRolling } from '../hooks'

/**
 * Mobile Preview Component
 * Shows how the landing page looks on mobile devices
 */
export default function MobilePreview({ companyId }: { companyId: string }) {
  const { state } = useLandingPageForm()
  const { currentRealtimeData } = useRealtimeRolling()

  return (
    <div className="mx-auto max-w-sm">
      {/* Mobile Frame */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
        {/* Mobile Status Bar */}
        <div className="bg-gray-900 px-6 py-2 flex items-center justify-between text-white text-xs">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
              <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
            </svg>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="bg-gray-50 h-[600px] overflow-y-auto">
          {/* Timer Bar (if enabled) */}
          {state.timerEnabled && state.timerSticky === 'top' && (
            <div
              className="sticky top-0 z-10 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: state.timerColor }}
            >
              {state.timerText} {state.timerCountdown}
            </div>
          )}

          {/* Hero Images */}
          {state.images.length > 0 && (
            <div className="relative">
              <img
                src={state.images[0]}
                alt="Hero"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-6 space-y-4">
            {/* Title */}
            {state.title && (
              <h1 className="text-2xl font-bold text-gray-900">{state.title}</h1>
            )}

            {/* Description */}
            {state.descriptionEnabled && state.description && (
              <p className="text-sm text-gray-700 leading-relaxed">{state.description}</p>
            )}

            {/* CTA Button */}
            {state.ctaEnabled && (
              <button
                type="button"
                className="w-full py-3 rounded-lg text-white font-semibold shadow-md"
                style={{ backgroundColor: state.ctaColor }}
              >
                {state.ctaText}
              </button>
            )}

            {/* Data Collection Form (if inline mode) */}
            {state.collectData && state.collectionMode === 'inline' && (
              <div className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">정보 입력</h3>

                {state.collectName && (
                  <input
                    type="text"
                    placeholder="이름"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    disabled
                  />
                )}

                {state.collectPhone && (
                  <input
                    type="tel"
                    placeholder="전화번호"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    disabled
                  />
                )}

                {state.customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {field.question}
                    </label>
                    {field.type === 'short_answer' ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled
                      />
                    ) : (
                      <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" disabled>
                        <option>선택하세요</option>
                        {field.options?.map((option, idx) => (
                          <option key={idx}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                {/* Privacy Consent */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {state.privacyContent && (
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" className="mt-0.5" disabled />
                      <span>
                        {state.privacyRequired && <span className="text-red-500">* </span>}
                        개인정보 수집·이용 동의
                      </span>
                    </label>
                  )}
                  {state.marketingContent && (
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input type="checkbox" className="mt-0.5" disabled />
                      <span>
                        {state.marketingRequired && <span className="text-red-500">* </span>}
                        마케팅 활용 동의
                      </span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg"
                  disabled
                >
                  제출하기
                </button>
              </div>
            )}

            {/* Realtime Status */}
            {state.realtimeEnabled && currentRealtimeData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <span className="font-semibold">{currentRealtimeData.name}</span>님이{' '}
                  <span className="font-semibold">{currentRealtimeData.location}</span>에서
                  신청하셨습니다 ✨
                </p>
              </div>
            )}
          </div>

          {/* Call Button (if enabled and sticky bottom) */}
          {state.callButtonEnabled && state.callButtonSticky === 'bottom' && (
            <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200">
              <button
                type="button"
                className="w-full py-3 rounded-lg text-white font-semibold shadow-md flex items-center justify-center gap-2"
                style={{ backgroundColor: state.callButtonColor }}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                {state.callButtonPhone || '전화 상담'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Device Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">iPhone 14 Pro (393 × 852)</p>
      </div>
    </div>
  )
}
