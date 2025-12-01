'use client'

import { Section } from '@/types/landing-page.types'

interface TestimonialsSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function TestimonialsSection({ section, themeColors }: TestimonialsSectionProps) {
  return (
    <section className="py-16 px-6 bg-white">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
        {section.props?.title || '고객 후기'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {(section.props?.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                👤
              </div>
              <div className="ml-3">
                <div className="font-semibold text-gray-900">{item.name || '김OO'}</div>
                <div className="flex text-yellow-400">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-gray-600">{item.comment || '후기 내용'}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
