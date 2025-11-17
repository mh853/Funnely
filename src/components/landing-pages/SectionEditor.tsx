'use client'

import { useState } from 'react'
import { Section, SectionType } from '@/types/landing-page.types'
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'

interface SectionEditorProps {
  sections: Section[]
  onChange: (sections: Section[]) => void
}

const SECTION_TEMPLATES: Record<
  SectionType,
  { label: string; icon: string; defaultProps: any }
> = {
  hero: {
    label: '히어로 섹션',
    icon: '🎯',
    defaultProps: {
      title: '환영합니다',
      subtitle: '부제목을 입력하세요',
      ctaText: '시작하기',
      ctaLink: '#',
      backgroundImage: '',
    },
  },
  features: {
    label: '기능 섹션',
    icon: '✨',
    defaultProps: {
      title: '주요 기능',
      items: [
        { title: '기능 1', description: '설명 1', icon: '🎯' },
        { title: '기능 2', description: '설명 2', icon: '🚀' },
        { title: '기능 3', description: '설명 3', icon: '💡' },
      ],
    },
  },
  form: {
    label: '폼 섹션',
    icon: '📝',
    defaultProps: {
      title: '신청하기',
      description: '아래 양식을 작성해주세요',
      submitButtonText: '제출',
      fields: ['name', 'phone', 'email'],
    },
  },
  testimonials: {
    label: '후기 섹션',
    icon: '💬',
    defaultProps: {
      title: '고객 후기',
      items: [
        {
          name: '김OO',
          rating: 5,
          comment: '매우 만족스러운 서비스입니다.',
          image: '',
        },
      ],
    },
  },
  cta: {
    label: 'CTA 섹션',
    icon: '🎯',
    defaultProps: {
      title: '지금 바로 시작하세요',
      description: '오늘부터 바로 이용 가능합니다',
      buttonText: '무료로 시작하기',
      buttonLink: '#',
    },
  },
  timer: {
    label: '타이머 섹션',
    icon: '⏰',
    defaultProps: {
      title: '특별 할인 마감까지',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
    },
  },
  faq: {
    label: 'FAQ 섹션',
    icon: '❓',
    defaultProps: {
      title: '자주 묻는 질문',
      items: [
        { question: '질문 1', answer: '답변 1' },
        { question: '질문 2', answer: '답변 2' },
      ],
    },
  },
  pricing: {
    label: '가격 섹션',
    icon: '💰',
    defaultProps: {
      title: '요금제',
      plans: [
        {
          name: '기본',
          price: '무료',
          features: ['기능 1', '기능 2'],
          highlighted: false,
        },
        {
          name: '프리미엄',
          price: '29,000원/월',
          features: ['기능 1', '기능 2', '기능 3', '기능 4'],
          highlighted: true,
        },
      ],
    },
  },
}

export default function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAddMenu, setShowAddMenu] = useState(false)

  const addSection = (type: SectionType) => {
    const template = SECTION_TEMPLATES[type]
    const newSection: Section = {
      id: `section_${Date.now()}`,
      type,
      props: { ...template.defaultProps },
    }
    onChange([...sections, newSection])
    setShowAddMenu(false)
    // Auto-expand the new section
    const newExpanded = new Set(expandedSections)
    newExpanded.add(newSection.id)
    setExpandedSections(newExpanded)
  }

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index)
    onChange(newSections)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newSections.length) return

    ;[newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ]
    onChange(newSections)
  }

  const updateSectionProps = (index: number, props: any) => {
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], props }
    onChange(newSections)
  }

  const toggleExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Section List */}
      <div className="space-y-3">
        {sections.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 text-sm">
              섹션을 추가하여 랜딩 페이지를 디자인하세요
            </p>
          </div>
        ) : (
          sections.map((section, index) => {
            const template = SECTION_TEMPLATES[section.type]
            const isExpanded = expandedSections.has(section.id)

            return (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg bg-white hover:border-blue-300 transition"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between p-4">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(section.id)}
                    className="flex items-center space-x-3 flex-1 text-left"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{template.label}</h4>
                      <p className="text-xs text-gray-500">
                        {section.type === 'hero' && section.props.title}
                        {section.type === 'features' && `${section.props.items?.length || 0}개 항목`}
                        {section.type === 'form' && '신청 폼'}
                        {section.type === 'testimonials' &&
                          `${section.props.items?.length || 0}개 후기`}
                        {section.type === 'cta' && section.props.title}
                        {section.type === 'timer' && '카운트다운 타이머'}
                        {section.type === 'faq' && `${section.props.items?.length || 0}개 질문`}
                        {section.type === 'pricing' && `${section.props.plans?.length || 0}개 요금제`}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="위로 이동"
                    >
                      <ArrowUpIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="아래로 이동"
                    >
                      <ArrowDownIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="삭제"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(section.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Content (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <SectionPropsEditor
                      type={section.type}
                      props={section.props}
                      onChange={(newProps) => updateSectionProps(index, newProps)}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Section Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full inline-flex justify-center items-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-blue-400 transition"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          섹션 추가
        </button>

        {/* Add Section Menu */}
        {showAddMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowAddMenu(false)}
            ></div>
            <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              {Object.entries(SECTION_TEMPLATES).map(([type, template]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addSection(type as SectionType)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                >
                  <span className="text-xl">{template.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{template.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Props Editor for each section type
function SectionPropsEditor({
  type,
  props,
  onChange,
}: {
  type: SectionType
  props: any
  onChange: (props: any) => void
}) {
  const updateProp = (key: string, value: any) => {
    onChange({ ...props, [key]: value })
  }

  const updateArrayItem = (key: string, index: number, updates: any) => {
    const newArray = [...(props[key] || [])]
    newArray[index] = { ...newArray[index], ...updates }
    updateProp(key, newArray)
  }

  const addArrayItem = (key: string, template: any) => {
    const newArray = [...(props[key] || []), template]
    updateProp(key, newArray)
  }

  const removeArrayItem = (key: string, index: number) => {
    const newArray = (props[key] || []).filter((_: any, i: number) => i !== index)
    updateProp(key, newArray)
  }

  switch (type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부제목</label>
            <textarea
              value={props.subtitle || ''}
              onChange={(e) => updateProp('subtitle', e.target.value)}
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                버튼 텍스트
              </label>
              <input
                type="text"
                value={props.ctaText || ''}
                onChange={(e) => updateProp('ctaText', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">버튼 링크</label>
              <input
                type="text"
                value={props.ctaLink || ''}
                onChange={(e) => updateProp('ctaLink', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'features':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">섹션 제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">기능 목록</label>
            <div className="space-y-2">
              {(props.items || []).map((item: any, index: number) => (
                <div key={index} className="flex gap-2 items-start border p-3 rounded-md bg-white">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.icon || ''}
                      onChange={(e) => updateArrayItem('items', index, { icon: e.target.value })}
                      placeholder="🎯 아이콘"
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => updateArrayItem('items', index, { title: e.target.value })}
                      placeholder="기능 제목"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                    <textarea
                      value={item.description || ''}
                      onChange={(e) =>
                        updateArrayItem('items', index, { description: e.target.value })
                      }
                      placeholder="기능 설명"
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('items', index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  addArrayItem('items', { title: '새 기능', description: '설명', icon: '✨' })
                }
                className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + 기능 추가
              </button>
            </div>
          </div>
        </div>
      )

    case 'form':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">폼 제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={props.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제출 버튼 텍스트
            </label>
            <input
              type="text"
              value={props.submitButtonText || ''}
              onChange={(e) => updateProp('submitButtonText', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      )

    case 'testimonials':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">섹션 제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">후기 목록</label>
            <div className="space-y-2">
              {(props.items || []).map((item: any, index: number) => (
                <div key={index} className="flex gap-2 items-start border p-3 rounded-md bg-white">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => updateArrayItem('items', index, { name: e.target.value })}
                        placeholder="이름"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={item.rating || 5}
                        onChange={(e) =>
                          updateArrayItem('items', index, { rating: parseInt(e.target.value) })
                        }
                        placeholder="평점 (1-5)"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <textarea
                      value={item.comment || ''}
                      onChange={(e) =>
                        updateArrayItem('items', index, { comment: e.target.value })
                      }
                      placeholder="후기 내용"
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('items', index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  addArrayItem('items', {
                    name: '김OO',
                    rating: 5,
                    comment: '후기를 입력하세요',
                  })
                }
                className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + 후기 추가
              </button>
            </div>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={props.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                버튼 텍스트
              </label>
              <input
                type="text"
                value={props.buttonText || ''}
                onChange={(e) => updateProp('buttonText', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">버튼 링크</label>
              <input
                type="text"
                value={props.buttonLink || ''}
                onChange={(e) => updateProp('buttonLink', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'timer':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">마감 시간</label>
            <input
              type="datetime-local"
              value={
                props.deadline
                  ? new Date(props.deadline).toISOString().slice(0, 16)
                  : ''
              }
              onChange={(e) => updateProp('deadline', new Date(e.target.value).toISOString())}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['showDays', 'showHours', 'showMinutes', 'showSeconds'].map((key) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={props[key] ?? true}
                  onChange={(e) => updateProp(key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {key === 'showDays' && '일'}
                  {key === 'showHours' && '시'}
                  {key === 'showMinutes' && '분'}
                  {key === 'showSeconds' && '초'}
                  {' 표시'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">섹션 제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">질문 목록</label>
            <div className="space-y-2">
              {(props.items || []).map((item: any, index: number) => (
                <div key={index} className="flex gap-2 items-start border p-3 rounded-md bg-white">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.question || ''}
                      onChange={(e) =>
                        updateArrayItem('items', index, { question: e.target.value })
                      }
                      placeholder="질문"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                    <textarea
                      value={item.answer || ''}
                      onChange={(e) =>
                        updateArrayItem('items', index, { answer: e.target.value })
                      }
                      placeholder="답변"
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('items', index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('items', { question: '질문', answer: '답변' })}
                className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + 질문 추가
              </button>
            </div>
          </div>
        </div>
      )

    case 'pricing':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">섹션 제목</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">요금제 목록</label>
            <div className="space-y-2">
              {(props.plans || []).map((plan: any, index: number) => (
                <div key={index} className="flex gap-2 items-start border p-3 rounded-md bg-white">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={plan.name || ''}
                        onChange={(e) =>
                          updateArrayItem('plans', index, { name: e.target.value })
                        }
                        placeholder="요금제 이름"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        value={plan.price || ''}
                        onChange={(e) =>
                          updateArrayItem('plans', index, { price: e.target.value })
                        }
                        placeholder="가격"
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <textarea
                      value={(plan.features || []).join('\n')}
                      onChange={(e) =>
                        updateArrayItem('plans', index, {
                          features: e.target.value.split('\n').filter((f) => f.trim()),
                        })
                      }
                      placeholder="기능 (한 줄에 하나씩)"
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={plan.highlighted || false}
                        onChange={(e) =>
                          updateArrayItem('plans', index, { highlighted: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">추천 요금제</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('plans', index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  addArrayItem('plans', {
                    name: '새 요금제',
                    price: '0원',
                    features: [],
                    highlighted: false,
                  })
                }
                className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                + 요금제 추가
              </button>
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="text-sm text-gray-500">
          이 섹션 타입에 대한 편집기가 아직 구현되지 않았습니다.
        </div>
      )
  }
}
