'use client'

import { Section } from '@/types/landing-page.types'

interface PricingSectionProps {
  section: Section
  themeColors: { primary: string; secondary: string }
}

export default function PricingSection({ section, themeColors }: PricingSectionProps) {
  const primaryColor = themeColors.primary || '#3B82F6'

  return (
    <section className="py-16 px-6 bg-gray-50">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
        {section.props?.title || '요금제'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {(section.props?.plans || []).map((plan: any, index: number) => (
          <div
            key={index}
            className={`bg-white rounded-lg p-8 ${
              plan.highlighted
                ? 'shadow-xl border-2'
                : 'border border-gray-200'
            }`}
            style={plan.highlighted ? { borderColor: primaryColor } : {}}
          >
            {plan.highlighted && (
              <div
                className="text-xs font-semibold text-white px-3 py-1 rounded-full inline-block mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                추천
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {plan.name || '요금제'}
            </h3>
            <p className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>
              {plan.price || '0원'}
            </p>
            <ul className="space-y-3 mb-8">
              {(plan.features || []).map((feature: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-md font-semibold ${
                plan.highlighted ? 'text-white' : 'border-2'
              }`}
              style={
                plan.highlighted
                  ? { backgroundColor: primaryColor }
                  : { borderColor: primaryColor, color: primaryColor }
              }
            >
              선택하기
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
