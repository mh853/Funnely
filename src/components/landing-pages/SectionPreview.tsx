'use client'

import { Section } from '@/types/landing-page.types'

interface SectionPreviewProps {
  section: Section
  themeColors?: {
    primary: string
    secondary: string
  }
}

export default function SectionPreview({ section, themeColors }: SectionPreviewProps) {
  const primaryColor = themeColors?.primary || '#3B82F6'
  const secondaryColor = themeColors?.secondary || '#10B981'

  switch (section.type) {
    case 'hero':
      return (
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-6 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {section.props.title || '제목'}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {section.props.subtitle || '부제목'}
          </p>
          <button
            className="px-8 py-4 rounded-lg font-semibold text-white transition-transform hover:scale-105"
            style={{ backgroundColor: primaryColor }}
          >
            {section.props.ctaText || '시작하기'}
          </button>
        </div>
      )

    case 'features':
      return (
        <div className="py-16 px-6 bg-white">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {section.props.title || '주요 기능'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(section.props.items || []).map((item: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4">{item.icon || '✨'}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title || '기능 제목'}
                </h3>
                <p className="text-gray-600">{item.description || '기능 설명'}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'form':
      return (
        <div className="py-16 px-6 bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {section.props.title || '신청하기'}
            </h2>
            <p className="text-gray-600 mb-6">{section.props.description || '양식을 작성해주세요'}</p>
            <div className="space-y-4">
              {(section.props.fields || ['name', 'phone', 'email']).map(
                (field: string, index: number) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field === 'name' && '이름'}
                      {field === 'phone' && '전화번호'}
                      {field === 'email' && '이메일'}
                      {!['name', 'phone', 'email'].includes(field) && field}
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                )
              )}
              <button
                className="w-full py-3 rounded-md font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {section.props.submitButtonText || '제출'}
              </button>
            </div>
          </div>
        </div>
      )

    case 'testimonials':
      return (
        <div className="py-16 px-6 bg-white">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {section.props.title || '고객 후기'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(section.props.items || []).map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                    👤
                  </div>
                  <div className="ml-3">
                    <div className="font-semibold text-gray-900">{item.name || '김OO'}</div>
                    <div className="flex text-yellow-400">
                      {Array.from({ length: item.rating || 5 }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">{item.comment || '후기 내용'}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'cta':
      return (
        <div
          className="py-20 px-6 text-center text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <h2 className="text-4xl font-bold mb-4">{section.props.title || '지금 바로 시작하세요'}</h2>
          <p className="text-xl mb-8 opacity-90">
            {section.props.description || '오늘부터 바로 이용 가능합니다'}
          </p>
          <button className="px-8 py-4 bg-white rounded-lg font-semibold hover:scale-105 transition-transform text-gray-900">
            {section.props.buttonText || '무료로 시작하기'}
          </button>
        </div>
      )

    case 'timer':
      return (
        <div className="py-16 px-6 bg-gray-900 text-white">
          <h2 className="text-3xl font-bold text-center mb-8">
            {section.props.title || '특별 할인 마감까지'}
          </h2>
          <div className="flex justify-center gap-4">
            {section.props.showDays && (
              <TimerUnit label="일" value="00" />
            )}
            {section.props.showHours && (
              <TimerUnit label="시" value="00" />
            )}
            {section.props.showMinutes && (
              <TimerUnit label="분" value="00" />
            )}
            {section.props.showSeconds && (
              <TimerUnit label="초" value="00" />
            )}
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="py-16 px-6 bg-white">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {section.props.title || '자주 묻는 질문'}
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {(section.props.items || []).map((item: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. {item.question || '질문'}
                </h3>
                <p className="text-gray-600">A. {item.answer || '답변'}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'pricing':
      return (
        <div className="py-16 px-6 bg-gray-50">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {section.props.title || '요금제'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {(section.props.plans || []).map((plan: any, index: number) => (
              <div
                key={index}
                className={`bg-white rounded-lg p-8 ${
                  plan.highlighted
                    ? 'shadow-xl border-2'
                    : 'border border-gray-200'
                }`}
                style={plan.highlighted ? { borderColor: primaryColor } : {}}
              >
                {plan.highlighted && (
                  <div
                    className="text-xs font-semibold text-white px-3 py-1 rounded-full inline-block mb-4"
                    style={{ backgroundColor: primaryColor }}
                  >
                    추천
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name || '요금제'}
                </h3>
                <p className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>
                  {plan.price || '0원'}
                </p>
                <ul className="space-y-3 mb-8">
                  {(plan.features || []).map((feature: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-md font-semibold ${
                    plan.highlighted ? 'text-white' : 'border-2'
                  }`}
                  style={
                    plan.highlighted
                      ? { backgroundColor: primaryColor }
                      : { borderColor: primaryColor, color: primaryColor }
                  }
                >
                  선택하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className="py-8 px-6 bg-gray-100 text-center">
          <p className="text-gray-500">미리보기 준비 중</p>
        </div>
      )
  }
}

function TimerUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="bg-white text-gray-900 text-4xl font-bold rounded-lg p-4 min-w-[80px] mb-2">
        {value}
      </div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}
