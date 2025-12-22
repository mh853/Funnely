'use client'

import { useState } from 'react'
import { DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import MobilePreview from './MobilePreview'
import DesktopPreview from './DesktopPreview'

type PreviewMode = 'mobile' | 'desktop'

/**
 * Preview Container
 * Manages mobile/desktop preview switching and display
 */
export default function PreviewContainer({ companyId }: { companyId: string }) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('mobile')

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">미리보기</h2>
            <p className="mt-1 text-sm text-gray-600">
              랜딩페이지가 실제로 어떻게 보이는지 확인하세요
            </p>
          </div>

          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                previewMode === 'mobile'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DevicePhoneMobileIcon className="h-5 w-5" />
              모바일
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                previewMode === 'desktop'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ComputerDesktopIcon className="h-5 w-5" />
              데스크톱
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {previewMode === 'mobile' ? (
          <MobilePreview companyId={companyId} />
        ) : (
          <DesktopPreview companyId={companyId} />
        )}
      </div>

      {/* Preview Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="h-5 w-5 text-blue-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-semibold">미리보기 안내</p>
            <p>
              • 실제 랜딩페이지와 동일하게 표시됩니다
            </p>
            <p>
              • 저장 후에는 배포 설정에서 URL을 통해 실제 페이지를 확인할 수 있습니다
            </p>
            <p>
              • 모든 변경사항은 저장 버튼을 클릭해야 반영됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
