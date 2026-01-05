'use client'

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'

/**
 * Deployment Section
 * Manages landing page activation/deactivation and deployment info
 */
export default function DeploymentSection({ companyShortId }: { companyShortId?: string }) {
  const { state } = useLandingPageForm()

  // Generate preview URL
  const previewUrl = state.slug && companyShortId
    ? generateLandingPageURL(companyShortId, state.slug)
    : ''

  const copyToClipboard = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl)
      alert('URL이 클립보드에 복사되었습니다!')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">배포 설정</h2>
        <p className="mt-1 text-sm text-gray-600">랜딩페이지 활성화 및 URL을 관리하세요</p>
      </div>

      {/* Activation Status */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {state.isActive ? (
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-gray-400" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {state.isActive ? '활성화됨' : '비활성화됨'}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {state.isActive
                  ? '랜딩페이지가 공개되어 있습니다'
                  : '랜딩페이지가 비공개 상태입니다'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Landing Page URL */}
      {state.slug && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">랜딩페이지 URL</label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={previewUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              disabled={!previewUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              복사
            </button>
          </div>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              새 탭에서 미리보기
            </a>
          )}
        </div>
      )}

      {/* Subdomain URL Info */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-2">
        <h4 className="text-sm font-semibold text-blue-900">서브도메인 URL 안내</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>
            <span className="font-semibold">회사별 전용 URL</span>: 각 회사는 고유한 서브도메인을 가집니다
          </p>
          <p className="mt-2 text-blue-700">
            💡 팁: 서브도메인 URL을 통해 회사별 트래킹 픽셀이 자동으로 발화되며,
            DB 수집 시 회사 정보가 자동으로 기록됩니다.
          </p>
        </div>
      </div>

      {/* Validation Warnings */}
      {!state.slug && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 text-yellow-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">URL이 설정되지 않았습니다</h4>
              <p className="text-xs text-yellow-800 mt-1">
                기본 정보에서 URL 슬러그를 입력해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Checklist */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">배포 전 체크리스트</h3>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={!!state.title}
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className={state.title ? 'text-green-700' : 'text-gray-500'}>
              페이지 제목 설정 완료
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={!!state.slug}
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className={state.slug ? 'text-green-700' : 'text-gray-500'}>
              URL 슬러그 설정 완료
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={state.images.length > 0}
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className={state.images.length > 0 ? 'text-green-700' : 'text-gray-500'}>
              히어로 이미지 업로드 완료
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={state.collectData}
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className={state.collectData ? 'text-green-700' : 'text-gray-500'}>
              데이터 수집 설정 완료
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={!!state.privacyContent}
              disabled
              className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className={state.privacyContent ? 'text-green-700' : 'text-gray-500'}>
              개인정보 동의 설정 완료
            </span>
          </label>
        </div>
      </div>

      {/* Ready Status */}
      {state.title &&
        state.slug &&
        state.images.length > 0 &&
        state.collectData &&
        state.privacyContent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-green-900">배포 준비 완료!</h4>
                <p className="text-xs text-green-800 mt-1">
                  모든 필수 설정이 완료되었습니다. 저장 후 바로 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
