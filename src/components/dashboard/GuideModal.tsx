// 로그인 후 첫 접속 시 자동으로 뜨는 사용 가이드 팝업 — X는 이번만 닫기, 하단 "다시 보지 않기"는 영구 dismiss
'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import GuideContent from './guide/GuideContent'

interface GuideModalProps {
  onClose: () => void
  onDismissForever: () => void
}

export default function GuideModal({ onClose, onDismissForever }: GuideModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 id="guide-modal-title" className="text-lg font-bold text-gray-900">
              퍼널리 대시보드 사용 가이드
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">처음이시라면 메뉴별 사용법을 간단히 살펴보세요.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <GuideContent hero={false} />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">설정 페이지에서 언제든 다시 볼 수 있습니다.</p>
          <button onClick={onDismissForever} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  )
}
