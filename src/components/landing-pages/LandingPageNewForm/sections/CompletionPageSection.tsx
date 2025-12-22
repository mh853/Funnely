'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'
import { useImageUpload } from '../hooks'

/**
 * Completion Page Section
 * Manages completion page design and settings
 */
export default function CompletionPageSection({ companyId }: { companyId: string }) {
  const { state, actions } = useLandingPageForm()
  const { handleCompletionBgUpload } = useImageUpload(companyId)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">완료 페이지 설정</h2>
        <p className="mt-1 text-sm text-gray-600">
          폼 제출 후 표시될 완료 페이지를 설정하세요
        </p>
      </div>

      {/* Completion Message */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">완료 메시지</label>
        <input
          type="text"
          value={state.completionMessage}
          onChange={(e) => actions.setCompletionMessage(e.target.value)}
          placeholder="예: 신청이 완료되었습니다!"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">메인 완료 메시지를 입력하세요</p>
      </div>

      {/* Completion Submessage */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">완료 서브메시지</label>
        <textarea
          value={state.completionSubmessage}
          onChange={(e) => actions.setCompletionSubmessage(e.target.value)}
          placeholder="예: 곧 연락드리겠습니다. 감사합니다!"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500">추가 안내 메시지를 입력하세요</p>
      </div>

      {/* Background Image */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">배경 이미지</label>

        {state.completionBgImage ? (
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={state.completionBgImage}
              alt="완료 페이지 배경"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={() => actions.setCompletionBgImage('')}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
              title="배경 이미지 삭제"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-all">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCompletionBgUpload}
              className="hidden"
              id="completion-bg-upload"
            />
            <label
              htmlFor="completion-bg-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="mt-2 text-sm font-medium text-gray-700">
                클릭하여 배경 이미지 업로드
              </span>
              <span className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP (최대 5MB)</span>
            </label>
          </div>
        )}

        <p className="text-xs text-gray-500">
          💡 팁: 배경 이미지를 설정하면 완료 페이지가 더 세련되게 보입니다
        </p>
      </div>

      {/* Realtime Status Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">실시간 현황 표시</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              최근 신청자 정보를 롤링으로 표시합니다
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.realtimeEnabled}
              onChange={(e) => actions.setRealtimeEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">활성화</span>
          </label>
        </div>

        {state.realtimeEnabled && (
          <div className="pl-4 space-y-3 border-l-2 border-indigo-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">롤링 속도</label>
              <select
                value={state.realtimeSpeed}
                onChange={(e) => actions.setRealtimeSpeed(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={2}>빠름 (2초)</option>
                <option value={3}>보통 (3초)</option>
                <option value={5}>느림 (5초)</option>
              </select>
            </div>

            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-700 font-medium">미리보기</p>
              <div className="mt-2 text-xs text-indigo-900">
                <span className="font-semibold">김민수</span>님이{' '}
                <span className="font-semibold">서울 강남구</span>에서 신청하셨습니다 ✨
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">완료 페이지 미리보기</h3>
        <div className="bg-white rounded-lg p-6 text-center space-y-4">
          <div className="text-2xl font-bold text-gray-900">
            {state.completionMessage || '신청이 완료되었습니다!'}
          </div>
          <div className="text-sm text-gray-600">
            {state.completionSubmessage || '곧 연락드리겠습니다. 감사합니다!'}
          </div>
          {state.realtimeEnabled && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                실시간 현황: <span className="font-semibold">김민수</span>님이{' '}
                <span className="font-semibold">서울 강남구</span>에서 신청하셨습니다 ✨
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
