'use client'

import { Section } from '@/types/landing-page.types'

interface FeaturesSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function FeaturesSection({ section, themeColors }: FeaturesSectionProps) {
  return (
    <section className="py-16 px-6 bg-white">
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
    </section>
  )
}
