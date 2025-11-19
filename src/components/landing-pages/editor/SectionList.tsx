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
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">섹션 추가</h2>
        <p className="text-xs text-gray-500 mt-1">
          클릭하여 페이지에 섹션 추가
        </p>
      </div>

      <div className="p-4 space-y-6">
        {categories.map((category) => {
          const sections = SECTION_TYPES.filter(s => s.category === category)

          return (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.type}
                      onClick={() => onAddSection(section.type)}
                      className="w-full flex items-start p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-500 group-hover:text-blue-700 mt-0.5">
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
      <div className="p-4 m-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">💡 팁</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 드래그로 순서 변경</li>
          <li>• 섹션 클릭하여 편집</li>
          <li>• 복제로 빠르게 추가</li>
        </ul>
      </div>
    </div>
  )
}
