'use client'

import { SectionType } from '@/types/landing-page.types'
import {
  RocketLaunchIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline'

interface SectionListProps {
  onAddSection: (type: SectionType) => void
}

interface SectionTypeInfo {
  type: SectionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'content' | 'conversion' | 'social' | 'media'
}

const SECTION_TYPES: SectionTypeInfo[] = [
  // Content Sections
  {
    type: 'hero',
    label: '히어로',
    description: '메인 타이틀과 CTA',
    icon: RocketLaunchIcon,
    category: 'content',
  },
  {
    type: 'features',
    label: '기능 소개',
    description: '주요 기능 나열',
    icon: SparklesIcon,
    category: 'content',
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: '자주 묻는 질문',
    icon: QuestionMarkCircleIcon,
    category: 'content',
  },

  // Conversion Sections
  {
    type: 'form',
    label: '신청 폼',
    description: '정보 수집 폼',
    icon: DocumentTextIcon,
    category: 'conversion',
  },
  {
    type: 'cta',
    label: '행동 유도',
    description: 'Call-to-Action',
    icon: MegaphoneIcon,
    category: 'conversion',
  },
  {
    type: 'timer',
    label: '타이머',
    description: '마감 카운트다운',
    icon: ClockIcon,
    category: 'conversion',
  },
  {
    type: 'pricing',
    label: '요금제',
    description: '가격 정보',
    icon: CurrencyDollarIcon,
    category: 'conversion',
  },

  // Social Proof
  {
    type: 'testimonials',
    label: '고객 후기',
    description: '사용자 리뷰',
    icon: ChatBubbleLeftRightIcon,
    category: 'social',
  },

  // Media Sections
  {
    type: 'media',
    label: '미디어',
    description: '이미지/영상',
    icon: PhotoIcon,
    category: 'media',
  },
  {
    type: 'gallery',
    label: '갤러리',
    description: '이미지 그리드',
    icon: RectangleGroupIcon,
    category: 'media',
  },
]

const CATEGORY_LABELS = {
  content: '콘텐츠',
  conversion: '전환',
  social: '소셜 프루프',
  media: '미디어',
}

export default function SectionList({ onAddSection }: SectionListProps) {
  const categories = ['content', 'conversion', 'social', 'media'] as const

  return (
    <div className="w-72 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-5 bg-white border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">섹션 추가</h2>
        <p className="text-sm text-gray-500 mt-1">
          클릭하여 페이지에 추가하세요
        </p>
      </div>

      {/* Section Categories */}
      <div className="p-4 space-y-6">
        {categories.map((category) => {
          const sections = SECTION_TYPES.filter(s => s.category === category)

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent"></div>
              </div>
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.type}
                      onClick={() => onAddSection(section.type)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100 transition-all duration-200 group text-left"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all">
                        <Icon className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-900">
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {section.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Tips */}
      <div className="p-4 pb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm">💡</span>
            </div>
            <h4 className="text-sm font-bold text-blue-900">빠른 팁</h4>
          </div>
          <ul className="text-xs text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>드래그로 섹션 순서 변경</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>섹션 클릭하여 스타일 편집</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>복제 버튼으로 빠르게 추가</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
