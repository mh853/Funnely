'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/outline'
import { SubscriptionPlan } from '@/types/subscription'
import Link from 'next/link'

interface ComparisonCardsProps {
  plans: SubscriptionPlan[]
}

function formatFeatures(plan: SubscriptionPlan): string[] {
  const features: string[] = []

  if (plan.max_landing_pages) {
    features.push(`랜딩페이지 ${plan.max_landing_pages}개`)
  } else if (plan.max_landing_pages === null) {
    features.push('랜딩페이지 무제한')
  }

  if (plan.max_users) {
    features.push(`관리자 ${plan.max_users}명`)
  } else if (plan.max_users === null) {
    features.push('관리자 무제한')
  }

  if (plan.features && typeof plan.features === 'object') {
    const featureLabels: { [key: string]: string } = {
      dashboard: '대시보드',
      db_status: 'DB 현황',
      db_schedule: 'DB 스케줄',
      reservation_schedule: '예약 스케줄',
      advanced_schedule: '스케줄 관리 기능',
      analytics: '분석',
      reports: '리포트',
      priority_support: '우선 지원',
      customization: '커스터마이징',
      custom_integration: '커스텀 통합',
    }

    Object.entries(plan.features).forEach(([key, value]) => {
      if (value === true && featureLabels[key]) {
        features.push(featureLabels[key])
      }
    })
  }

  return features
}

export default function ComparisonCards({ plans }: ComparisonCardsProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const priceLabel = billingCycle === 'monthly' ? '월' : '년'
  const sortedPlans = [...plans].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            요금제 비교
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            모든 플랜 한눈에 비교
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            비즈니스 규모에 맞는 최적의 플랜을 선택하세요
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월별 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              연간 결제
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                20% 할인
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {sortedPlans.map((plan, index) => {
            const isRecommended = plan.sort_order === 3
            const isEnterprise = plan.price_monthly === 0 && plan.price_yearly === 0
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
            const features = formatFeatures(plan)

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl border-2 p-6 transition-all hover:shadow-xl ${
                  isRecommended
                    ? 'border-indigo-500 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      ⭐ 추천
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="text-center mb-6 pb-6 border-b border-gray-200">
                  {isEnterprise ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900">가격 협의</p>
                      <p className="text-sm text-gray-500 mt-1">맞춤형 솔루션</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        ₩{price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">/ {priceLabel}</p>
                      {billingCycle === 'yearly' && (
                        <p className="text-xs text-green-600 mt-1">
                          연간 ₩{(price * 12).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6 min-h-[240px]">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href="/signup"
                  className={`block w-full py-3 px-4 rounded-lg font-semibold text-center transition-all ${
                    isRecommended
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isEnterprise ? '문의하기' : '시작하기'}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            모든 플랜은 14일 무료 체험이 가능합니다. 신용카드 정보 없이 시작하세요.
          </p>
        </div>
      </div>
    </section>
  )
}
