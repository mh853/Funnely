'use client'

import { useLandingPageForm } from '../context'

/**
 * Design Section
 * Manages CTA button, Timer, and Call button design settings
 */
export default function DesignSection() {
  const { state, actions } = useLandingPageForm()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">디자인 설정</h2>
        <p className="mt-1 text-sm text-gray-600">CTA, 타이머, 전화버튼 디자인을 설정하세요</p>
      </div>

      {/* CTA Button Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">CTA 버튼</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.ctaEnabled}
              onChange={(e) => actions.setCtaEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">활성화</span>
          </label>
        </div>

        {state.ctaEnabled && (
          <div className="pl-4 space-y-3 border-l-2 border-indigo-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">버튼 텍스트</label>
              <input
                type="text"
                value={state.ctaText}
                onChange={(e) => actions.setCtaText(e.target.value)}
                placeholder="예: 지금 바로 신청하기"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">버튼 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.ctaColor}
                  onChange={(e) => actions.setCtaColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={state.ctaColor}
                  onChange={(e) => actions.setCtaColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">고정 위치</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => actions.setCtaSticky('none')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.ctaSticky === 'none'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  없음
                </button>
                <button
                  type="button"
                  onClick={() => actions.setCtaSticky('top')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.ctaSticky === 'top'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상단
                </button>
                <button
                  type="button"
                  onClick={() => actions.setCtaSticky('bottom')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.ctaSticky === 'bottom'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  하단
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timer Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">타이머</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.timerEnabled}
              onChange={(e) => actions.setTimerEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">활성화</span>
          </label>
        </div>

        {state.timerEnabled && (
          <div className="pl-4 space-y-3 border-l-2 border-purple-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">타이머 텍스트</label>
              <input
                type="text"
                value={state.timerText}
                onChange={(e) => actions.setTimerText(e.target.value)}
                placeholder="예: 특별 할인 마감까지"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">마감 시간</label>
              <input
                type="datetime-local"
                value={state.timerDeadline}
                onChange={(e) => actions.setTimerDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">타이머 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.timerColor}
                  onChange={(e) => actions.setTimerColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={state.timerColor}
                  onChange={(e) => actions.setTimerColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">고정 위치</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => actions.setTimerSticky('none')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.timerSticky === 'none'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  없음
                </button>
                <button
                  type="button"
                  onClick={() => actions.setTimerSticky('top')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.timerSticky === 'top'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상단
                </button>
                <button
                  type="button"
                  onClick={() => actions.setTimerSticky('bottom')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.timerSticky === 'bottom'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  하단
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Button Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">전화 버튼</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.callButtonEnabled}
              onChange={(e) => actions.setCallButtonEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">활성화</span>
          </label>
        </div>

        {state.callButtonEnabled && (
          <div className="pl-4 space-y-3 border-l-2 border-green-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">전화번호</label>
              <input
                type="tel"
                value={state.callButtonPhone}
                onChange={(e) => actions.setCallButtonPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                하이픈 포함하여 입력하세요 (예: 010-1234-5678)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">버튼 색상</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.callButtonColor}
                  onChange={(e) => actions.setCallButtonColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={state.callButtonColor}
                  onChange={(e) => actions.setCallButtonColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">고정 위치</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => actions.setCallButtonSticky('none')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.callButtonSticky === 'none'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  없음
                </button>
                <button
                  type="button"
                  onClick={() => actions.setCallButtonSticky('top')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.callButtonSticky === 'top'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상단
                </button>
                <button
                  type="button"
                  onClick={() => actions.setCallButtonSticky('bottom')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                    state.callButtonSticky === 'bottom'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  하단
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
