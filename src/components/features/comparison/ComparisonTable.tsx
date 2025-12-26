'use client'

import { motion } from 'framer-motion'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SubscriptionPlan, ComparisonCategory } from '@/types/subscription'

interface ComparisonTableProps {
  categories: ComparisonCategory[]
  plans: SubscriptionPlan[]
}

export default function ComparisonTable({ categories, plans }: ComparisonTableProps) {
  // Use actual plans from database (already sorted by sort_order)
  const allPlans = plans
  const gridCols = allPlans.length + 1 // +1 for feature name column

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            상세 비교
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            모든 기능 한눈에 비교
          </p>
        </div>

        {/* Comparison Table - Horizontal Scroll on Mobile */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xl">
          <div className="min-w-max">
            {/* Table Header */}
            <div
              className="sticky top-0 z-10 grid gap-4 bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200"
              style={{ gridTemplateColumns: `minmax(200px, 1fr) repeat(${allPlans.length}, minmax(150px, 1fr))` }}
            >
              <div className="text-sm font-semibold text-gray-900">기능</div>
              {allPlans.map((plan) => (
                <div key={plan.id} className="text-center">
                  <div className="text-base font-bold text-gray-900 truncate">
                    {plan.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {plan.price_monthly === 0
                      ? '₩0'
                      : `₩${plan.price_monthly.toLocaleString()}/월`
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 bg-white">
              {categories.map((category, categoryIndex) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div className="bg-gray-50 px-6 py-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      {category.name}
                    </h3>
                  </div>

                  {/* Category Features */}
                  {category.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="grid gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                      style={{ gridTemplateColumns: `minmax(200px, 1fr) repeat(${allPlans.length}, minmax(150px, 1fr))` }}
                    >
                      <div className="text-sm text-gray-700">{feature.name}</div>
                      {allPlans.map((plan) => (
                        <div key={plan.id} className="flex justify-center">
                          {renderFeatureValue(feature.values[plan.id])}
                        </div>
                      ))}
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Scroll Hint */}
        <p className="mt-4 text-center text-sm text-gray-500 lg:hidden">
          좌우로 스크롤하여 모든 플랜을 확인하세요
        </p>
      </div>
    </section>
  )
}

function renderFeatureValue(value: boolean | string) {
  if (typeof value === 'boolean') {
    return value ? (
      <CheckIcon className="h-6 w-6 text-green-500" />
    ) : (
      <XMarkIcon className="h-6 w-6 text-gray-300" />
    )
  }
  return <span className="text-sm font-medium text-gray-900">{value}</span>
}
