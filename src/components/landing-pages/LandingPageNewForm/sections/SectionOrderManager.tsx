'use client'

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { useLandingPageForm } from '../context'

/**
 * Section Order Manager
 * Manages the order of sections displayed on the landing page
 */
export default function SectionOrderManager() {
  const { state, actions } = useLandingPageForm()

  // Section labels for display
  const sectionLabels: Record<string, string> = {
    hero: '히어로 이미지',
    description: '설명',
    features: '특징',
    form: '폼',
    testimonials: '후기',
    faq: 'FAQ',
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...state.sectionOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    actions.setSectionOrder(newOrder)
  }

  const moveDown = (index: number) => {
    if (index === state.sectionOrder.length - 1) return
    const newOrder = [...state.sectionOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    actions.setSectionOrder(newOrder)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">섹션 순서 설정</h2>
        <p className="mt-1 text-sm text-gray-600">
          랜딩페이지에 표시될 섹션의 순서를 조정하세요
        </p>
      </div>

      <div className="space-y-3">
        {state.sectionOrder.map((section, index) => (
          <div
            key={section}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all"
          >
            {/* Section Number */}
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold text-sm rounded-full">
              {index + 1}
            </div>

            {/* Section Name */}
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900">
                {sectionLabels[section] || section}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {section === 'hero' && '메인 이미지와 제목을 표시합니다'}
                {section === 'description' && '상세 설명을 표시합니다'}
                {section === 'features' && '주요 특징을 표시합니다'}
                {section === 'form' && '데이터 수집 폼을 표시합니다'}
                {section === 'testimonials' && '고객 후기를 표시합니다'}
                {section === 'faq' && '자주 묻는 질문을 표시합니다'}
              </p>
            </div>

            {/* Move Controls */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className={`p-1.5 rounded transition-all ${
                  index === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-300'
                }`}
                title="위로 이동"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === state.sectionOrder.length - 1}
                className={`p-1.5 rounded transition-all ${
                  index === state.sectionOrder.length - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-300'
                }`}
                title="아래로 이동"
              >
                <ArrowDownIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() =>
            actions.setSectionOrder(['hero', 'description', 'features', 'form', 'testimonials', 'faq'])
          }
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
        >
          기본 순서로 초기화
        </button>
      </div>
    </div>
  )
}
