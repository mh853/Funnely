'use client'

import { useLandingPageForm } from '../context'

/**
 * Basic Information Section
 * Handles title, slug, and description inputs
 */
export default function BasicInfoSection() {
  const { state, actions } = useLandingPageForm()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
        <p className="mt-1 text-sm text-gray-600">랜딩페이지의 기본 정보를 입력하세요</p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={state.title}
          onChange={(e) => actions.setTitle(e.target.value)}
          placeholder="예: 무료 상담 신청하기"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          required
        />
        <p className="mt-1.5 text-xs text-gray-500">랜딩페이지 상단에 표시될 제목입니다</p>
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-semibold text-gray-700 mb-2">
          URL 슬러그 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">funnely.co.kr/landing/</span>
          <input
            type="text"
            id="slug"
            name="slug"
            value={state.slug}
            onChange={(e) => {
              // Only allow alphanumeric and hyphens
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
              actions.setSlug(value)
            }}
            placeholder="my-landing-page"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            required
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다
        </p>
        {state.slug && (
          <div className="mt-2 p-2 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-700">
              <span className="font-semibold">미리보기:</span> https://funnely.co.kr/landing/{state.slug}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700">
            설명
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.descriptionEnabled}
              onChange={(e) => actions.setDescriptionEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">설명 표시</span>
          </label>
        </div>
        <textarea
          id="description"
          name="description"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          placeholder="랜딩페이지에 대한 간단한 설명을 입력하세요"
          rows={4}
          disabled={!state.descriptionEnabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-500"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          제목 아래에 표시될 부가 설명입니다 (선택사항)
        </p>
      </div>

      {/* Validation Messages */}
      {!state.title && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">알림:</span> 제목은 필수 항목입니다
          </p>
        </div>
      )}
      {!state.slug && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">알림:</span> URL 슬러그는 필수 항목입니다
          </p>
        </div>
      )}
    </div>
  )
}
