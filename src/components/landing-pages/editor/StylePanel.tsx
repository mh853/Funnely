'use client'

import { useState } from 'react'
import { Section, SectionStyles } from '@/types/landing-page.types'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HexColorPicker } from 'react-colorful'

interface StylePanelProps {
  section: Section
  onUpdate: (updates: Partial<Section>) => void
  onClose: () => void
}

export default function StylePanel({ section, onUpdate, onClose }: StylePanelProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content')

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">섹션 편집</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'content'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          콘텐츠
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'style'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          스타일
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'content' ? (
          <ContentEditor section={section} onUpdate={onUpdate} />
        ) : (
          <StyleEditor section={section} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  )
}

function ContentEditor({
  section,
  onUpdate,
}: {
  section: Section
  onUpdate: (updates: Partial<Section>) => void
}) {
  const updateProp = (key: string, value: any) => {
    onUpdate({
      props: {
        ...section.props,
        [key]: value,
      },
    })
  }

  // Render different inputs based on section type
  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              부제목
            </label>
            <textarea
              value={section.props.subtitle || ''}
              onChange={(e) => updateProp('subtitle', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              버튼 텍스트
            </label>
            <input
              type="text"
              value={section.props.ctaText || ''}
              onChange={(e) => updateProp('ctaText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )

    case 'features':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              섹션 제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기능 목록
            </label>
            {(section.props.items || []).map((item: any, idx: number) => (
              <div key={idx} className="mb-3 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={item.icon || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, icon: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="아이콘 (이모지)"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, title: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="제목"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <textarea
                  value={item.description || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, description: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="설명"
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )

    case 'form':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              폼 제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={section.props.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              버튼 텍스트
            </label>
            <input
              type="text"
              value={section.props.submitButtonText || ''}
              onChange={(e) => updateProp('submitButtonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              성공 메시지
            </label>
            <input
              type="text"
              value={section.props.successMessage || ''}
              onChange={(e) => updateProp('successMessage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={section.props.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              버튼 텍스트
            </label>
            <input
              type="text"
              value={section.props.buttonText || ''}
              onChange={(e) => updateProp('buttonText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )

    case 'media':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              미디어 타입
            </label>
            <select
              value={section.props.mediaType || 'image'}
              onChange={(e) => updateProp('mediaType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="image">이미지</option>
              <option value="video">비디오</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="text"
              value={section.props.url || ''}
              onChange={(e) => updateProp('url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-800">
              💡 향후 업데이트: 파일 업로드 및 AI 이미지 생성 기능이 추가될 예정입니다.
            </p>
          </div>
        </div>
      )

    case 'gallery':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              레이아웃
            </label>
            <select
              value={section.props.layout || 'grid-3'}
              onChange={(e) => updateProp('layout', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="grid-2">2열 그리드</option>
              <option value="grid-3">3열 그리드</option>
              <option value="grid-4">4열 그리드</option>
              <option value="masonry">메이슨리</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이미지 목록
            </label>
            {(section.props.images || []).map((image: string, idx: number) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={image}
                  onChange={(e) => {
                    const newImages = [...(section.props.images || [])]
                    newImages[idx] = e.target.value
                    updateProp('images', newImages)
                  }}
                  placeholder="이미지 URL"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => {
                    const newImages = section.props.images.filter((_: any, i: number) => i !== idx)
                    updateProp('images', newImages)
                  }}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newImages = [...(section.props.images || []), '']
                updateProp('images', newImages)
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            >
              + 이미지 추가
            </button>
          </div>
        </div>
      )

    case 'testimonials':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              섹션 제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              고객 후기 목록
            </label>
            {(section.props.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-3 border border-gray-200 rounded-md mb-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">후기 {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newItems = section.props.items.filter((_: any, i: number) => i !== idx)
                      updateProp('items', newItems)
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>
                <input
                  type="text"
                  value={item.name || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, name: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="고객 이름"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <div>
                  <label className="block text-xs text-gray-600 mb-1">평점 (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={item.rating || 5}
                    onChange={(e) => {
                      const newItems = [...section.props.items]
                      newItems[idx] = { ...item, rating: parseInt(e.target.value) }
                      updateProp('items', newItems)
                    }}
                    className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <textarea
                  value={item.comment || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, comment: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="후기 내용"
                  rows={3}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...(section.props.items || []), { name: '', rating: 5, comment: '' }]
                updateProp('items', newItems)
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            >
              + 후기 추가
            </button>
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              섹션 제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              질문과 답변
            </label>
            {(section.props.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-3 border border-gray-200 rounded-md mb-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">FAQ {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newItems = section.props.items.filter((_: any, i: number) => i !== idx)
                      updateProp('items', newItems)
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>
                <input
                  type="text"
                  value={item.question || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, question: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="질문"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <textarea
                  value={item.answer || ''}
                  onChange={(e) => {
                    const newItems = [...section.props.items]
                    newItems[idx] = { ...item, answer: e.target.value }
                    updateProp('items', newItems)
                  }}
                  placeholder="답변"
                  rows={3}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...(section.props.items || []), { question: '', answer: '' }]
                updateProp('items', newItems)
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            >
              + FAQ 추가
            </button>
          </div>
        </div>
      )

    case 'pricing':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              섹션 제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              요금제 목록
            </label>
            {(section.props.plans || []).map((plan: any, idx: number) => (
              <div key={idx} className="p-3 border border-gray-200 rounded-md mb-3 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">요금제 {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newPlans = section.props.plans.filter((_: any, i: number) => i !== idx)
                      updateProp('plans', newPlans)
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>
                <input
                  type="text"
                  value={plan.name || ''}
                  onChange={(e) => {
                    const newPlans = [...section.props.plans]
                    newPlans[idx] = { ...plan, name: e.target.value }
                    updateProp('plans', newPlans)
                  }}
                  placeholder="요금제 이름"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={plan.price || ''}
                  onChange={(e) => {
                    const newPlans = [...section.props.plans]
                    newPlans[idx] = { ...plan, price: e.target.value }
                    updateProp('plans', newPlans)
                  }}
                  placeholder="가격 (예: 월 10,000원)"
                  className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                />
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={plan.highlighted || false}
                    onChange={(e) => {
                      const newPlans = [...section.props.plans]
                      newPlans[idx] = { ...plan, highlighted: e.target.checked }
                      updateProp('plans', newPlans)
                    }}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700">강조 표시</label>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">포함 기능 (한 줄에 하나씩)</label>
                  <textarea
                    value={(plan.features || []).join('\n')}
                    onChange={(e) => {
                      const newPlans = [...section.props.plans]
                      newPlans[idx] = { ...plan, features: e.target.value.split('\n').filter(f => f.trim()) }
                      updateProp('plans', newPlans)
                    }}
                    placeholder="기능 1&#10;기능 2&#10;기능 3"
                    rows={4}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                const newPlans = [...(section.props.plans || []), { name: '', price: '', features: [], highlighted: false }]
                updateProp('plans', newPlans)
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            >
              + 요금제 추가
            </button>
          </div>
        </div>
      )

    case 'timer':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={section.props.title || ''}
              onChange={(e) => updateProp('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              마감 시간
            </label>
            <input
              type="datetime-local"
              value={section.props.deadline ? new Date(section.props.deadline).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateProp('deadline', new Date(e.target.value).toISOString())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">표시 항목</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.props.showDays !== false}
                onChange={(e) => updateProp('showDays', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-700">일</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.props.showHours !== false}
                onChange={(e) => updateProp('showHours', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-700">시간</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.props.showMinutes !== false}
                onChange={(e) => updateProp('showMinutes', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-700">분</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={section.props.showSeconds !== false}
                onChange={(e) => updateProp('showSeconds', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-700">초</label>
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="text-sm text-gray-500 text-center py-8">
          이 섹션 타입은 콘텐츠 편집을<br />지원하지 않습니다.
        </div>
      )
  }
}

function StyleEditor({
  section,
  onUpdate,
}: {
  section: Section
  onUpdate: (updates: Partial<Section>) => void
}) {
  const [showBgColorPicker, setShowBgColorPicker] = useState(false)

  const styles = section.styles || {}

  const updateStyles = (updates: Partial<SectionStyles>) => {
    onUpdate({
      styles: {
        ...styles,
        ...updates,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Layout */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">레이아웃</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              컨테이너 너비
            </label>
            <select
              value={styles.layout?.container || 'contained'}
              onChange={(e) =>
                updateStyles({
                  layout: {
                    ...styles.layout,
                    container: e.target.value as any,
                  },
                })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="full-width">전체 너비</option>
              <option value="contained">표준 (1280px)</option>
              <option value="narrow">좁게 (768px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">여백</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              상단 패딩
            </label>
            <select
              value={styles.spacing?.paddingTop || '4rem'}
              onChange={(e) =>
                updateStyles({
                  spacing: {
                    paddingTop: e.target.value,
                    paddingBottom: styles.spacing?.paddingBottom || '4rem',
                    paddingLeft: styles.spacing?.paddingLeft,
                    paddingRight: styles.spacing?.paddingRight,
                  },
                })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="2rem">작게 (2rem)</option>
              <option value="4rem">중간 (4rem)</option>
              <option value="6rem">크게 (6rem)</option>
              <option value="8rem">매우 크게 (8rem)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              하단 패딩
            </label>
            <select
              value={styles.spacing?.paddingBottom || '4rem'}
              onChange={(e) =>
                updateStyles({
                  spacing: {
                    paddingTop: styles.spacing?.paddingTop || '4rem',
                    paddingBottom: e.target.value,
                    paddingLeft: styles.spacing?.paddingLeft,
                    paddingRight: styles.spacing?.paddingRight,
                  },
                })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="2rem">작게 (2rem)</option>
              <option value="4rem">중간 (4rem)</option>
              <option value="6rem">크게 (6rem)</option>
              <option value="8rem">매우 크게 (8rem)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Background */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">배경</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              배경 타입
            </label>
            <select
              value={styles.background?.type || 'color'}
              onChange={(e) =>
                updateStyles({
                  background: {
                    type: e.target.value as any,
                    value: styles.background?.value || '#ffffff',
                    opacity: styles.background?.opacity,
                  },
                })
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="color">단색</option>
              <option value="gradient">그라디언트</option>
              <option value="image">이미지</option>
            </select>
          </div>

          {styles.background?.type === 'color' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                배경 색상
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                  className="w-full h-10 rounded border border-gray-300"
                  style={{ backgroundColor: styles.background?.value || '#ffffff' }}
                />
                {showBgColorPicker && (
                  <div className="absolute z-10 mt-2">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowBgColorPicker(false)}
                    />
                    <HexColorPicker
                      color={styles.background?.value || '#ffffff'}
                      onChange={(color) =>
                        updateStyles({
                          background: {
                            type: 'color',
                            value: color,
                            opacity: styles.background?.opacity,
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {styles.background?.type === 'gradient' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                그라디언트 CSS
              </label>
              <input
                type="text"
                value={styles.background?.value || ''}
                onChange={(e) =>
                  updateStyles({
                    background: {
                      type: 'gradient',
                      value: e.target.value,
                      opacity: styles.background?.opacity,
                    },
                  })
                }
                placeholder="linear-gradient(...)"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}

          {styles.background?.type === 'image' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                이미지 URL
              </label>
              <input
                type="text"
                value={styles.background?.value || ''}
                onChange={(e) =>
                  updateStyles({
                    background: {
                      type: 'image',
                      value: e.target.value,
                      opacity: styles.background?.opacity,
                    },
                  })
                }
                placeholder="https://..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Shadow */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">그림자</h3>
        <select
          value={styles.shadow || 'none'}
          onChange={(e) => updateStyles({ shadow: e.target.value as any })}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        >
          <option value="none">없음</option>
          <option value="sm">작게</option>
          <option value="md">중간</option>
          <option value="lg">크게</option>
          <option value="xl">매우 크게</option>
        </select>
      </div>
    </div>
  )
}
