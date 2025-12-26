'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { SubscriptionPlan } from '@/types/subscription'

interface ComparisonCardsProps {
  plans: SubscriptionPlan[]
}

// Feature mapping and formatting
interface PlanFeature {
  name: string
  included: boolean
  pro?: boolean
  highlight?: boolean
}

function formatPlanFeatures(plan: SubscriptionPlan): PlanFeature[] {
  const features: PlanFeature[] = []
  const isPro = plan.sort_order === 3 // Pro plan

  // Landing pages
  if (plan.max_landing_pages) {
    features.push({
      name: `랜딩페이지 ${plan.max_landing_pages}개 생성`,
      included: true,
    })
  } else if (plan.max_landing_pages === null) {
    features.push({
      name: '무제한 랜딩페이지',
      included: true,
      highlight: isPro,
    })
  }

  // Lead management
  features.push({
    name: isPro ? '고급 리드 관리' : '기본 리드 관리',
    included: true,
  })

  // Team members
  if (plan.max_users) {
    features.push({
      name: `팀원 ${plan.max_users}명까지`,
      included: true,
    })
  } else if (plan.max_users === null) {
    features.push({
      name: '무제한 팀원',
      included: true,
      highlight: isPro,
    })
  }

  // Support
  features.push({
    name: plan.features?.priority_support ? '우선 고객 지원' : '기본 지원',
    included: true,
  })

  // Pro features
  const proFeatures = [
    {
      key: 'analytics' as keyof typeof plan.features,
      basicName: '트래픽 분석',
      proName: '트래픽 분석 대시보드',
    },
    {
      key: 'reports' as keyof typeof plan.features,
      basicName: 'DB 리포트',
      proName: 'DB 리포트 시스템',
    },
    {
      key: 'advanced_schedule' as keyof typeof plan.features,
      basicName: '스케줄 관리',
      proName: '스케줄 관리 (DB + 예약)',
    },
  ]

  proFeatures.forEach((feature) => {
    const hasFeature = plan.features?.[feature.key] === true
    features.push({
      name: isPro ? feature.proName : feature.basicName,
      included: hasFeature,
      pro: !hasFeature && !isPro,
      highlight: hasFeature && isPro,
    })
  })

  return features
}

export default function ComparisonCards({ plans }: ComparisonCardsProps) {
  // Display all plans sorted by sort_order
  const sortedPlans = [...plans].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <section className="py-24 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">요금제</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            성장에 맞는{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              플랜 선택
            </span>
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            모든 플랜에서 기본 기능을 사용할 수 있으며, 언제든 업그레이드 가능합니다
          </p>
        </div>

        {/* Pricing Cards - Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {sortedPlans.map((plan, index) => {
            const isPro = plan.sort_order === 3
            const isEnterprise = plan.price_monthly === 0 && plan.price_yearly === 0
            const features = formatPlanFeatures(plan)

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div
                  className={`relative rounded-2xl ${
                    isPro
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl ring-4 ring-blue-600/20 scale-105'
                      : 'bg-white shadow-lg ring-1 ring-gray-200'
                  } p-6 transition-all hover:scale-105 duration-300`}
                >
                  {/* Badge */}
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 shadow-lg">
                        <SparklesIcon className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold text-white">가장 인기</span>
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3
                      className={`text-lg font-bold ${
                        isPro ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`mt-1 text-xs leading-tight ${
                        isPro ? 'text-blue-100' : 'text-gray-600'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    {isEnterprise ? (
                      <div>
                        <p
                          className={`text-2xl font-bold ${
                            isPro ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          가격 협의
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isPro ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          맞춤형 솔루션
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-3xl font-bold tracking-tight ${
                              isPro ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            ₩{plan.price_monthly.toLocaleString()}
                          </span>
                          <span
                            className={`text-sm ${
                              isPro ? 'text-blue-100' : 'text-gray-600'
                            }`}
                          >
                            /월
                          </span>
                        </div>
                        {isPro && (
                          <p className="mt-1 text-xs font-medium text-blue-100">
                            💰 연 2개월 무료
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 min-h-[200px]">
                    {features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-2">
                        {feature.included ? (
                          <CheckIcon
                            className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                              isPro ? 'text-blue-200' : 'text-green-500'
                            }`}
                          />
                        ) : (
                          <XMarkIcon
                            className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                              isPro ? 'text-blue-300/50' : 'text-gray-300'
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs leading-tight ${
                            feature.included
                              ? isPro
                                ? 'text-white font-medium'
                                : 'text-gray-700'
                              : isPro
                              ? 'text-blue-200/60'
                              : 'text-gray-400'
                          } ${feature.highlight ? 'font-semibold' : ''}`}
                        >
                          {feature.name}
                          {feature.pro && (
                            <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              PRO
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    href={isEnterprise ? '/contact' : `/auth/signup?plan=${plan.id}${isPro ? '&trial=true' : ''}`}
                    className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
                      isPro
                        ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl hover:scale-105'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                    }`}
                  >
                    {isEnterprise ? '문의하기' : isPro ? '14일 무료 체험' : '시작하기'}
                  </Link>

                  {isPro && (
                    <p className="mt-3 text-center text-[10px] text-blue-100">
                      신용카드 등록 불필요 • 언제든 취소 가능
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600 mb-4">모든 기능 비교가 필요하신가요?</p>
          <Link
            href="#comparison-table"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            전체 기능 비교표 보기
            <svg
              className="ml-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
