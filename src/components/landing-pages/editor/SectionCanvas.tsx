'use client'

import { Section } from '@/types/landing-page.types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Bars3Icon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface SectionCanvasProps {
  sections: Section[]
  selectedSectionId: string | null
  themeColors: {
    primary: string
    secondary: string
  }
  onSelectSection: (id: string) => void
  onDuplicateSection: (id: string) => void
  onDeleteSection: (id: string) => void
  onUpdateSection: (id: string, updates: Partial<Section>) => void
}

export default function SectionCanvas({
  sections,
  selectedSectionId,
  themeColors,
  onSelectSection,
  onDuplicateSection,
  onDeleteSection,
  onUpdateSection,
}: SectionCanvasProps) {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-4">
      {sections.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">섹션을 추가하여 페이지를 구성하세요</p>
          <p className="text-sm mt-2">왼쪽 패널에서 원하는 섹션 타입을 선택하세요</p>
        </div>
      ) : (
        sections.map((section) => (
          <SortableSection
            key={section.id}
            section={section}
            isSelected={section.id === selectedSectionId}
            themeColors={themeColors}
            onSelect={onSelectSection}
            onDuplicate={onDuplicateSection}
            onDelete={onDeleteSection}
            onUpdate={onUpdateSection}
          />
        ))
      )}
    </div>
  )
}

interface SortableSectionProps {
  section: Section
  isSelected: boolean
  themeColors: {
    primary: string
    secondary: string
  }
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Section>) => void
}

function SortableSection({
  section,
  isSelected,
  themeColors,
  onSelect,
  onDuplicate,
  onDelete,
  onUpdate,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Get section background style
  const getBackgroundStyle = () => {
    const bg = section.styles?.background
    if (!bg) return {}

    switch (bg.type) {
      case 'color':
        return { backgroundColor: bg.value, opacity: bg.opacity || 1 }
      case 'gradient':
        return { backgroundImage: bg.value, opacity: bg.opacity || 1 }
      case 'image':
        return {
          backgroundImage: `url(${bg.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: bg.opacity || 1
        }
      default:
        return {}
    }
  }

  // Get padding style
  const getPaddingStyle = () => {
    const spacing = section.styles?.spacing
    if (!spacing) return {}

    return {
      paddingTop: spacing.paddingTop || '4rem',
      paddingBottom: spacing.paddingBottom || '4rem',
      paddingLeft: spacing.paddingLeft || '1rem',
      paddingRight: spacing.paddingRight || '1rem',
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(section.id)}
    >
      {/* Drag Handle and Actions */}
      <div className="absolute -left-12 top-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-grab active:cursor-grabbing"
          title="드래그하여 순서 변경"
        >
          <Bars3Icon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Top Actions */}
      <div className="absolute -top-3 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect(section.id)
          }}
          className="p-1.5 bg-white border border-gray-300 rounded shadow-sm hover:bg-blue-50"
          title="편집"
        >
          <PencilIcon className="w-4 h-4 text-blue-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(section.id)
          }}
          className="p-1.5 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
          title="복제"
        >
          <DocumentDuplicateIcon className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(section.id)
          }}
          className="p-1.5 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
          title="삭제"
        >
          <TrashIcon className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {/* Section Content Preview */}
      <div
        style={{
          ...getBackgroundStyle(),
          ...getPaddingStyle(),
        }}
        className={`min-h-[100px] ${section.styles?.shadow ? `shadow-${section.styles.shadow}` : ''}`}
      >
        <div
          className={`mx-auto ${
            section.styles?.layout?.container === 'full-width'
              ? 'max-w-full'
              : section.styles?.layout?.container === 'narrow'
              ? 'max-w-3xl'
              : 'max-w-6xl'
          }`}
          style={{ maxWidth: section.styles?.layout?.maxWidth }}
        >
          <SectionPreview section={section} themeColors={themeColors} />
        </div>
      </div>

      {/* Section Type Label */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-medium text-gray-600 border border-gray-200">
        {getSectionTypeLabel(section.type)}
      </div>
    </div>
  )
}

// Section preview renderer
function SectionPreview({
  section,
  themeColors
}: {
  section: Section
  themeColors: { primary: string; secondary: string }
}) {
  const { primary } = themeColors

  switch (section.type) {
    case 'hero':
      return (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {section.props?.title || '제목'}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {section.props?.subtitle || '부제목'}
          </p>
          <button
            className="px-8 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            {section.props?.ctaText || '버튼'}
          </button>
        </div>
      )

    case 'features':
      return (
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {section.props?.title || '주요 기능'}
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {(section.props?.items || []).map((item: any, idx: number) => (
              <div key={idx} className="text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'form':
      return (
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {section.props?.title || '신청하기'}
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            {section.props?.description || '정보를 입력해주세요'}
          </p>
          <div className="space-y-4 bg-white p-6 rounded-lg border">
            {(section.props?.fields || []).map((field: string) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field === 'name' && '이름'}
                  {field === 'phone' && '연락처'}
                  {field === 'email' && '이메일'}
                  {section.props?.requiredFields?.includes(field) && ' *'}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled
                />
              </div>
            ))}
            <button
              className="w-full py-3 rounded-md font-medium text-white"
              style={{ backgroundColor: primary }}
            >
              {section.props?.submitButtonText || '제출'}
            </button>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {section.props?.title || '지금 바로 시작하세요'}
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            {section.props?.description || '오늘부터 바로 이용 가능합니다'}
          </p>
          <button
            className="px-8 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            {section.props?.buttonText || '시작하기'}
          </button>
        </div>
      )

    case 'testimonials':
      return (
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {section.props?.title || '고객 후기'}
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {(section.props?.items || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-6 rounded-lg border">
                <div className="flex items-center mb-2">
                  <span className="font-semibold">{item.name}</span>
                  <span className="ml-2 text-yellow-500">{'★'.repeat(item.rating)}</span>
                </div>
                <p className="text-gray-600">{item.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {section.props?.title || '자주 묻는 질문'}
          </h2>
          <div className="space-y-4">
            {(section.props?.items || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                <p className="text-gray-600 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'pricing':
      return (
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {section.props?.title || '요금제'}
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {(section.props?.plans || []).map((plan: any, idx: number) => (
              <div
                key={idx}
                className={`p-6 rounded-lg border-2 ${
                  plan.highlighted ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold mt-2" style={{ color: primary }}>
                  {plan.price}
                </p>
                <ul className="mt-4 space-y-2">
                  {(plan.features || []).map((feature: string, fidx: number) => (
                    <li key={fidx} className="text-sm text-gray-600">✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )

    case 'timer':
      return (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {section.props?.title || '특별 할인 마감까지'}
          </h2>
          <div className="flex justify-center gap-4">
            {section.props?.showDays && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: primary }}>00</div>
                <div className="text-sm text-gray-600">일</div>
              </div>
            )}
            {section.props?.showHours && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: primary }}>00</div>
                <div className="text-sm text-gray-600">시간</div>
              </div>
            )}
            {section.props?.showMinutes && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: primary }}>00</div>
                <div className="text-sm text-gray-600">분</div>
              </div>
            )}
            {section.props?.showSeconds && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: primary }}>00</div>
                <div className="text-sm text-gray-600">초</div>
              </div>
            )}
          </div>
        </div>
      )

    case 'media':
      return (
        <div className="text-center">
          {section.props?.url ? (
            section.props?.mediaType === 'video' ? (
              <video src={section.props?.url} controls className="mx-auto max-w-full rounded-lg" />
            ) : (
              <img src={section.props?.url} alt="Media" className="mx-auto max-w-full rounded-lg" />
            )
          ) : (
            <div className="bg-gray-100 rounded-lg p-12 text-gray-400">
              미디어 파일을 업로드하세요
            </div>
          )}
        </div>
      )

    case 'gallery':
      return (
        <div>
          {section.props?.images?.length > 0 ? (
            <div className={`grid gap-4 ${
              section.props?.layout === 'grid-2' ? 'grid-cols-2' :
              section.props?.layout === 'grid-3' ? 'grid-cols-3' :
              section.props?.layout === 'grid-4' ? 'grid-cols-4' : 'grid-cols-3'
            }`}>
              {section.props?.images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt={`Gallery ${idx}`} className="w-full h-48 object-cover rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-12 text-center text-gray-400">
              갤러리 이미지를 추가하세요
            </div>
          )}
        </div>
      )

    default:
      return (
        <div className="text-center text-gray-400 py-8">
          섹션 미리보기
        </div>
      )
  }
}

function getSectionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    hero: '히어로',
    features: '기능 소개',
    form: '신청 폼',
    testimonials: '고객 후기',
    cta: '행동 유도',
    timer: '타이머',
    faq: 'FAQ',
    pricing: '요금제',
    media: '미디어',
    gallery: '갤러리',
  }
  return labels[type] || type
}
