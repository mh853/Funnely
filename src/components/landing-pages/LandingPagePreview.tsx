'use client'

import { LandingPage } from '@/types/landing-page.types'

interface LandingPagePreviewProps {
  landingPage: LandingPage
}

export default function LandingPagePreview({ landingPage }: LandingPagePreviewProps) {
  const theme = landingPage.theme || {
    colors: { primary: '#3B82F6', secondary: '#10B981' },
    fonts: { heading: 'Inter', body: 'Inter' },
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Preview Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-xs text-gray-500">{landingPage.slug}.medisync.kr</span>
          </div>
          <span className="text-xs text-gray-500">미리보기</span>
        </div>
      </div>

      {/* Preview Content */}
      <div
        className="p-8 min-h-[600px]"
        style={{
          fontFamily: theme.fonts.body,
        }}
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-4"
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fonts.heading,
            }}
          >
            {landingPage.title}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {landingPage.meta_description || '페이지 설명을 입력하세요'}
          </p>
          <button
            className="px-8 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: theme.colors.primary }}
          >
            지금 신청하기
          </button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-6 border border-gray-200 rounded-lg">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${theme.colors.secondary}20` }}
              >
                <svg
                  className="w-8 h-8"
                  style={{ color: theme.colors.secondary }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">기능 {i}</h3>
              <p className="text-gray-600 text-sm">기능 설명을 입력하세요</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div
          className="text-center p-12 rounded-lg"
          style={{ backgroundColor: `${theme.colors.primary}10` }}
        >
          <h2
            className="text-3xl font-bold mb-4"
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fonts.heading,
            }}
          >
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-600 mb-6">간단한 정보만 입력하시면 빠르게 연락드립니다</p>
          <button
            className="px-8 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: theme.colors.primary }}
          >
            무료 상담 신청
          </button>
        </div>

        {/* Sections placeholder */}
        {landingPage.sections && landingPage.sections.length > 0 && (
          <div className="mt-12">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">
                추가된 섹션: {landingPage.sections.length}개
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
