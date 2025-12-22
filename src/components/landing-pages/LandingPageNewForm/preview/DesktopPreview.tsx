'use client'

import { useLandingPageForm } from '../context'
import { useRealtimeRolling } from '../hooks'

/**
 * Desktop Preview Component
 * Shows how the landing page looks on desktop devices
 */
export default function DesktopPreview({ companyId }: { companyId: string }) {
  const { state } = useLandingPageForm()
  const { currentRealtimeData } = useRealtimeRolling()

  return (
    <div className="w-full">
      {/* Desktop Browser Frame */}
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-300">
        {/* Browser Chrome */}
        <div className="bg-gray-200 px-4 py-2 flex items-center gap-3 border-b border-gray-300">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-600">
            {state.slug ? `${window.location.origin}/lp/${state.slug}` : 'Landing Page Preview'}
          </div>
        </div>

        {/* Desktop Content */}
        <div className="bg-gray-50 h-[500px] overflow-y-auto">
          {/* Timer Bar (if enabled) */}
          {state.timerEnabled && state.timerStickyPosition === 'top' && (
            <div
              className="sticky top-0 z-10 px-6 py-3 text-center text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: state.timerColor }}
            >
              {state.timerText} {state.timerCountdown}
            </div>
          )}

          {/* Hero Section */}
          <div className="relative">
            {state.images.length > 0 && (
              <div className="relative h-96">
                <img
                  src={state.images[0]}
                  alt="Hero"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
              </div>
            )}

            {/* Hero Content Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white max-w-3xl px-6">
                {state.title && (
                  <h1 className="text-5xl font-bold mb-6 drop-shadow-lg">{state.title}</h1>
                )}
                {state.descriptionEnabled && state.description && (
                  <p className="text-xl leading-relaxed drop-shadow-md mb-8">{state.description}</p>
                )}
                {state.ctaEnabled && (
                  <button
                    type="button"
                    className="px-8 py-4 rounded-lg text-white text-lg font-semibold shadow-xl hover:scale-105 transition-transform"
                    style={{ backgroundColor: state.ctaColor }}
                  >
                    {state.ctaText}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Information */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">주요 특징</h2>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-6 w-6 text-green-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>전문가의 1:1 맞춤 상담</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-6 w-6 text-green-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>빠른 응답 및 처리</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg
                        className="h-6 w-6 text-green-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>합리적인 가격</span>
                    </li>
                  </ul>
                </div>

                {/* Realtime Status */}
                {state.realtimeEnabled && currentRealtimeData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">{currentRealtimeData.name}</span>님이{' '}
                      <span className="font-semibold">{currentRealtimeData.location}</span>에서
                      신청하셨습니다 ✨
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Form */}
              {state.collectData && state.collectionMode === 'inline' && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">신청하기</h3>

                  <div className="space-y-4">
                    {state.collectName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          이름
                        </label>
                        <input
                          type="text"
                          placeholder="이름을 입력하세요"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          disabled
                        />
                      </div>
                    )}

                    {state.collectPhone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          전화번호
                        </label>
                        <input
                          type="tel"
                          placeholder="010-0000-0000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          disabled
                        />
                      </div>
                    )}

                    {state.customFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.question}
                        </label>
                        {field.type === 'short_answer' ? (
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled
                          />
                        ) : (
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled
                          >
                            <option>선택하세요</option>
                            {field.options?.map((option, idx) => (
                              <option key={idx}>{option}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}

                    {/* Privacy Consent */}
                    <div className="space-y-2 pt-3 border-t border-gray-200">
                      {state.privacyContent && (
                        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" disabled />
                          <span>
                            {state.requirePrivacyConsent && <span className="text-red-500">* </span>}
                            개인정보 수집·이용 동의
                          </span>
                        </label>
                      )}
                      {state.marketingContent && (
                        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" className="mt-0.5" disabled />
                          <span>
                            {state.requireMarketingConsent && <span className="text-red-500">* </span>}
                            마케팅 활용 동의
                          </span>
                        </label>
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                      disabled
                    >
                      신청 완료
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Button (if enabled and sticky bottom) */}
          {state.callButtonEnabled && state.callButtonStickyPosition === 'bottom' && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
              <div className="max-w-4xl mx-auto px-6 py-4">
                <button
                  type="button"
                  className="w-full py-3 rounded-lg text-white font-semibold shadow-md flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  style={{ backgroundColor: state.callButtonColor }}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {state.callButtonPhone || '전화 상담'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">Desktop (1920 × 1080)</p>
      </div>
    </div>
  )
}
