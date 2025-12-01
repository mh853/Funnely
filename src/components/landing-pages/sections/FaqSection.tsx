'use client'

import { Section } from '@/types/landing-page.types'

interface FaqSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function FaqSection({ section, themeColors }: FaqSectionProps) {
  return (
    <section className="py-16 px-6 bg-white">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
        {section.props?.title || '자주 묻는 질문'}
      </h2>
      <div className="max-w-3xl mx-auto space-y-4">
        {(section.props?.items || []).map((item: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Q. {item.question || '질문'}
            </h3>
            <p className="text-gray-600">A. {item.answer || '답변'}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
