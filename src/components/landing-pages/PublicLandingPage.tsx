'use client'

import { LandingPage } from '@/types/landing-page.types'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

interface PublicLandingPageProps {
  landingPage: LandingPage
}

export default function PublicLandingPage({ landingPage }: PublicLandingPageProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [currentRealtimeIndex, setCurrentRealtimeIndex] = useState(0)
  const [showExternalFormModal, setShowExternalFormModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)

  // Demo realtime data
  const demoRealtimeData = [
    { name: '김민수', location: '서울 강남구' },
    { name: '이지은', location: '경기 성남시' },
    { name: '박준영', location: '인천 남동구' },
    { name: '최서연', location: '부산 해운대구' },
    { name: '정현우', location: '대전 유성구' },
  ]

  // Timer countdown calculation
  useEffect(() => {
    if (!landingPage.timer_enabled || !landingPage.timer_deadline) return

    const calculateTimeLeft = () => {
      const deadline = new Date(landingPage.timer_deadline!)
      const difference = deadline.getTime() - Date.now()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [landingPage.timer_enabled, landingPage.timer_deadline])

  // Realtime status rolling animation
  useEffect(() => {
    if (!landingPage.realtime_enabled || !landingPage.collect_data) return

    const interval = setInterval(() => {
      setCurrentRealtimeIndex((prev) => (prev + 1) % demoRealtimeData.length)
    }, (landingPage.realtime_speed || 3) * 1000)

    return () => clearInterval(interval)
  }, [landingPage.realtime_enabled, landingPage.collect_data, landingPage.realtime_speed, demoRealtimeData.length])

  const timerCountdown = `${String(timeLeft.days).padStart(2, '0')}일 ${String(timeLeft.hours).padStart(2, '0')}시 ${String(timeLeft.minutes).padStart(2, '0')}분 ${String(timeLeft.seconds).padStart(2, '0')}초`

  // Helper to check if section is enabled
  const isSectionEnabled = (sectionType: string) => {
    const section = landingPage.sections.find(s => s.type === sectionType)
    return section?.enabled !== false
  }

  // Render sticky buttons (matching preview logic)
  const renderStickyButtons = (position: 'top' | 'bottom') => {
    const buttons = []

    // Timer (available for both modes)
    if (landingPage.timer_enabled && landingPage.timer_sticky_position === position && landingPage.timer_deadline) {
      buttons.push(
        <div
          key="timer"
          className="w-full py-4 text-lg rounded-xl font-bold shadow-xl text-center"
          style={{
            backgroundColor: landingPage.timer_color || '#EF4444',
            color: 'white'
          }}
        >
          ⏰ {timerCountdown}
        </div>
      )
    }

    // CTA Button (both modes)
    if (landingPage.cta_enabled && landingPage.collect_data && landingPage.cta_sticky_position === position) {
      buttons.push(
        <button
          key="cta"
          onClick={() => {
            if (landingPage.collection_mode === 'external') {
              setShowExternalFormModal(true)
            }
          }}
          className="w-full py-4 text-lg rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-shadow"
          style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
        >
          {landingPage.cta_text || '상담 신청하기'}
        </button>
      )
    }

    // Call Button (both modes - matching preview)
    if (landingPage.call_button_enabled && landingPage.call_button_sticky_position === position) {
      buttons.push(
        <a
          key="call"
          href={`tel:${landingPage.call_button_phone}`}
          className="w-full py-4 text-lg text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-3"
          style={{ backgroundColor: landingPage.call_button_color || '#10B981' }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          전화: {landingPage.call_button_phone}
        </a>
      )
    }

    if (buttons.length === 0) return null

    return (
      <div
        className={`${position === 'top' ? 'sticky top-0 border-b' : 'sticky bottom-0 border-t'} z-50 bg-white p-4 border-gray-200 shadow-md space-y-3`}
      >
        {buttons}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Sticky Top Buttons */}
      {renderStickyButtons('top')}

      {/* Scrollable Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Hero Images */}
        {isSectionEnabled('hero_image') && landingPage.images && landingPage.images.length > 0 && (
          <div className="space-y-0">
            {landingPage.images.map((image, idx) => (
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
        )}

        {/* Description */}
        {isSectionEnabled('description') && landingPage.description_enabled && landingPage.description && (
          <div className="text-center">
            <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
              {landingPage.description}
            </p>
          </div>
        )}

        {/* Realtime Status */}
        {isSectionEnabled('realtime_status') && landingPage.realtime_enabled && landingPage.collect_data && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 overflow-hidden">
            <div className="text-base font-semibold text-blue-900 mb-3">실시간 현황</div>
            <div className="flex items-center gap-3 text-base text-blue-700">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
              <div key={currentRealtimeIndex} className="animate-in fade-in duration-500">
                {(landingPage.realtime_template || '{name}님이 {location}에서 상담을 신청했습니다.')
                  .replace('{name}', demoRealtimeData[currentRealtimeIndex].name)
                  .replace('{location}', demoRealtimeData[currentRealtimeIndex].location)}
              </div>
            </div>
          </div>
        )}

        {/* Timer (only if not sticky) */}
        {isSectionEnabled('timer') && landingPage.timer_enabled && landingPage.timer_sticky_position === 'none' && (
          <div
            className="rounded-xl p-6 border-2 shadow-lg"
            style={{
              borderColor: landingPage.timer_color || '#EF4444',
              backgroundColor: `${landingPage.timer_color || '#EF4444'}10`
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <ClockIcon className="h-6 w-6" style={{ color: landingPage.timer_color || '#EF4444' }} />
              <span className="text-lg font-bold" style={{ color: landingPage.timer_color || '#EF4444' }}>
                {timerCountdown}
              </span>
            </div>
          </div>
        )}

        {/* Form Section (Inline Mode) - Preview Style */}
        {isSectionEnabled('form') && landingPage.collect_data && landingPage.collection_mode === 'inline' && (
          <div className="space-y-4">
            <div className="text-base font-semibold text-gray-700 mb-4">DB 수집 폼</div>
            {/* Name Field */}
            {landingPage.collect_name !== false && (
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <div className="text-base text-gray-600">이름</div>
              </div>
            )}
            {/* Phone Field */}
            {landingPage.collect_phone !== false && (
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <div className="text-base text-gray-600">연락처</div>
              </div>
            )}
            {/* Custom Fields */}
            {landingPage.custom_fields && Array.isArray(landingPage.custom_fields) && landingPage.custom_fields.map((field: any, idx: number) => (
              <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-200">
                <div className="text-base text-gray-600">{idx + 3}. {field.question || '질문'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Consent Section (Inline Mode) */}
        {isSectionEnabled('privacy_consent') && landingPage.collect_data && landingPage.collection_mode === 'inline' && (
          <div className="space-y-4 border-t-2 border-gray-200 pt-6">
            {landingPage.require_privacy_consent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled
                />
                <span className="text-base text-gray-700">
                  개인정보 수집·이용 동의 (필수)
                </span>
              </label>
            )}
            {landingPage.require_marketing_consent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled
                />
                <span className="text-base text-gray-600">
                  마케팅 활용 동의 (선택)
                </span>
              </label>
            )}
          </div>
        )}

        {/* CTA Button (only if not sticky) */}
        {isSectionEnabled('cta_button') && landingPage.cta_enabled && landingPage.collect_data && landingPage.cta_sticky_position === 'none' && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (landingPage.collection_mode === 'external') {
                  setShowExternalFormModal(true)
                }
              }}
              className="w-full py-4 rounded-xl text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-shadow"
              style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
            >
              {landingPage.cta_text || '상담 신청하기'}
            </button>
          </div>
        )}

        {/* Call Button (only if not sticky) */}
        {isSectionEnabled('call_button') && landingPage.call_button_enabled && landingPage.call_button_sticky_position === 'none' && (
          <div className="flex justify-center">
            <a
              href={`tel:${landingPage.call_button_phone}`}
              className="w-full py-4 text-white rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-3"
              style={{ backgroundColor: landingPage.call_button_color || '#10B981' }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              전화: {landingPage.call_button_phone}
            </a>
          </div>
        )}
      </div>

      {/* Sticky Bottom Buttons */}
      {renderStickyButtons('bottom')}

      {/* External Form Modal */}
      {showExternalFormModal && landingPage.collection_mode === 'external' && (
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
              {landingPage.collect_name !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="홍길동"
                  />
                </div>
              )}

              {landingPage.collect_phone !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="010-1234-5678"
                  />
                </div>
              )}

              {/* Custom Fields */}
              {landingPage.custom_fields && Array.isArray(landingPage.custom_fields) && landingPage.custom_fields.map((field: any, index: number) => (
                <div key={field.id || index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.question || `${index + 3}. 항목추가`}
                  </label>
                  {field.type === 'short_answer' ? (
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      placeholder="답변을 입력해주세요"
                    />
                  ) : (
                    <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all">
                      <option>선택해주세요</option>
                      {field.options?.map((option: string, idx: number) => (
                        <option key={idx}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {/* Privacy Consent */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {landingPage.require_privacy_consent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-gray-300"
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
                {landingPage.require_marketing_consent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-gray-300"
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
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl"
                style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
              >
                {landingPage.cta_text || '상담 신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">개인정보 수집 및 이용 동의</h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                {landingPage.privacy_policy || '개인정보 수집 및 이용 동의 내용이 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Consent Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">마케팅 활용 동의</h3>
              <button
                onClick={() => setShowMarketingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                {landingPage.marketing_consent || '마케팅 활용 동의 내용이 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
