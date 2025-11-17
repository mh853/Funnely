'use client'

import { Section } from '@/types/landing-page.types'

interface CtaSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function CtaSection({ section, themeColors }: CtaSectionProps) {
  const primaryColor = themeColors.primary || '#3B82F6'

  return (
    <section
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
    </section>
  )
}
