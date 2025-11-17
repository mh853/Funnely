'use client'

import { Section } from '@/types/landing-page.types'

interface HeroSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function HeroSection({ section, themeColors }: HeroSectionProps) {
  const primaryColor = themeColors.primary || '#3B82F6'

  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 px-6 text-center">
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
    </section>
  )
}
