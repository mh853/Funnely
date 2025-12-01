'use client'

import { useState } from 'react'
import { Section, SectionType } from '@/types/landing-page.types'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SectionCanvas from './SectionCanvas'
import SectionList from './SectionList'
import StylePanel from './StylePanel'

interface VisualEditorProps {
  sections: Section[]
  onChange: (sections: Section[]) => void
  themeColors: {
    primary: string
    secondary: string
  }
}

export default function VisualEditor({ sections, onChange, themeColors }: VisualEditorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id)
      const newIndex = sections.findIndex(s => s.id === over.id)

      const reorderedSections = arrayMove(sections, oldIndex, newIndex).map((section, index) => ({
        ...section,
        order: index,
      }))

      onChange(reorderedSections)
    }
  }

  const handleAddSection = (type: SectionType) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      type,
      order: sections.length,
      props: getDefaultProps(type),
      styles: getDefaultStyles(),
    }

    onChange([...sections, newSection])
    setSelectedSectionId(newSection.id)
  }

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    const newSection = {
      ...section,
      id: `section-${Date.now()}`,
      order: section.order! + 1,
    }

    const newSections = [...sections]
    newSections.splice(section.order! + 1, 0, newSection)

    onChange(newSections.map((s, index) => ({ ...s, order: index })))
    setSelectedSectionId(newSection.id)
  }

  const handleDeleteSection = (sectionId: string) => {
    const newSections = sections
      .filter(s => s.id !== sectionId)
      .map((s, index) => ({ ...s, order: index }))

    onChange(newSections)
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null)
    }
  }

  const handleUpdateSection = (sectionId: string, updates: Partial<Section>) => {
    const newSections = sections.map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    )
    onChange(newSections)
  }

  return (
    <div className="flex h-full">
      {/* 좌측: 섹션 목록 */}
      <SectionList onAddSection={handleAddSection} />

      {/* 중앙: 캔버스 */}
      <div className="flex-1 bg-gray-50 overflow-y-auto pb-20">
        <DndContext
          id="landing-page-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <SectionCanvas
              sections={sections}
              selectedSectionId={selectedSectionId}
              themeColors={themeColors}
              onSelectSection={setSelectedSectionId}
              onDuplicateSection={handleDuplicateSection}
              onDeleteSection={handleDeleteSection}
              onUpdateSection={handleUpdateSection}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* 우측: 스타일 패널 */}
      {selectedSection && (
        <StylePanel
          section={selectedSection}
          onUpdate={(updates) => handleUpdateSection(selectedSection.id, updates)}
          onClose={() => setSelectedSectionId(null)}
        />
      )}
    </div>
  )
}

// 섹션 타입별 기본 props
function getDefaultProps(type: SectionType): any {
  const defaults: Record<SectionType, any> = {
    hero: {
      title: '제목을 입력하세요',
      subtitle: '부제목을 입력하세요',
      ctaText: '시작하기',
    },
    features: {
      title: '주요 기능',
      items: [
        { icon: '✨', title: '기능 1', description: '설명' },
        { icon: '🚀', title: '기능 2', description: '설명' },
        { icon: '💎', title: '기능 3', description: '설명' },
      ],
    },
    form: {
      title: '신청하기',
      description: '정보를 입력해주세요',
      fields: ['name', 'phone', 'email'],
      requiredFields: ['name', 'phone'],
      submitButtonText: '제출',
      successMessage: '신청이 완료되었습니다',
    },
    testimonials: {
      title: '고객 후기',
      items: [
        { name: '김OO', rating: 5, comment: '정말 좋아요!' },
      ],
    },
    cta: {
      title: '지금 바로 시작하세요',
      description: '오늘부터 바로 이용 가능합니다',
      buttonText: '무료로 시작하기',
    },
    timer: {
      title: '특별 할인 마감까지',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        { question: '질문 1', answer: '답변 1' },
        { question: '질문 2', answer: '답변 2' },
      ],
    },
    pricing: {
      title: '요금제',
      plans: [
        { name: '기본', price: '무료', features: ['기능 1', '기능 2'], highlighted: false },
        { name: '프로', price: '월 10,000원', features: ['기능 1', '기능 2', '기능 3'], highlighted: true },
      ],
    },
    media: {
      mediaType: 'image',
      url: '',
      layout: 'contained',
      position: 'center',
    },
    gallery: {
      images: [],
      layout: 'grid-3',
    },
    hero_image: {
      title: '제목을 입력하세요',
      subtitle: '부제목을 입력하세요',
      imageUrl: '',
      ctaText: '시작하기',
    },
    description: {
      title: '설명 제목',
      content: '설명 내용을 입력하세요',
    },
    cta_button: {
      text: '지금 시작하기',
      enabled: true,
    },
    call_button: {
      phone: '',
      enabled: true,
    },
    realtime_status: {
      template: '{count}명이 지금 보고 있습니다',
      enabled: true,
    },
    privacy_consent: {
      privacyRequired: true,
      marketingRequired: false,
      privacyContent: '',
      marketingContent: '',
    },
  }

  return defaults[type] || {}
}

// 기본 스타일
function getDefaultStyles() {
  return {
    layout: {
      container: 'contained' as const,
      maxWidth: '1280px',
    },
    spacing: {
      paddingTop: '4rem',
      paddingBottom: '4rem',
    },
    background: {
      type: 'color' as const,
      value: '#ffffff',
    },
    shadow: 'none' as const,
  }
}
