'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'

const plans = [
  {
    name: '베이직 플랜',
    id: 'basic',
    price: 19000,
    description: '스타트업, 개인 사업자에게 추천',
    features: [
      { name: '랜딩페이지 1개 생성', included: true },
      { name: '기본 리드 관리', included: true },
      { name: '팀원 1명까지', included: true },
      { name: '기본 지원', included: true },
      { name: '트래픽 분석 대시보드', included: false, pro: true },
      { name: 'DB 리포트 시스템', included: false, pro: true },
      { name: '스케줄 관리 (DB + 예약)', included: false, pro: true },
    ],
    cta: '시작하기',
    highlighted: false,
  },
  {
    name: '프로 플랜',
    id: 'pro',
    price: 200000,
    description: '성장하는 기업, 마케팅 팀에게 최적',
    badge: '가장 인기',
    features: [
      { name: '무제한 랜딩페이지', included: true, highlight: true },
      { name: '고급 리드 관리', included: true },
      { name: '무제한 팀원', included: true, highlight: true },
      { name: '트래픽 분석 대시보드', included: true, highlight: true },
      { name: 'DB 리포트 시스템', included: true, highlight: true },
      { name: '스케줄 관리 (DB + 예약)', included: true, highlight: true },
      { name: '우선 고객 지원', included: true },
    ],
    cta: '7일 무료체험',
    highlighted: true,
    savings: '연간 결제 시 2개월 무료',
  },
]

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const getPrice = (monthlyPrice: number) => {
    if (isAnnual) {
      return Math.floor((monthlyPrice * 10) / 12)
    }
    return monthlyPrice
  }

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            요금제
          </h2>
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

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
            월간 결제
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isAnnual ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                isAnnual ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
            연간 결제
          </span>
          {isAnnual && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              2개월 무료
            </span>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div
                className={`relative rounded-3xl ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl ring-4 ring-blue-600/20 scale-105'
                    : 'bg-white shadow-lg ring-1 ring-gray-200'
                } p-8 transition-all hover:scale-105 duration-300`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 shadow-lg">
                      <SparklesIcon className="h-4 w-4 text-white" />
                      <span className="text-sm font-bold text-white">{plan.badge}</span>
                    </div>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-8">
                  <h3
                    className={`text-2xl font-bold ${
                      plan.highlighted ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-2 text-sm ${
                      plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-bold tracking-tight ${
                        plan.highlighted ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      ₩{getPrice(plan.price).toLocaleString()}
                    </span>
                    <span
                      className={`text-lg ${
                        plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                      }`}
                    >
                      /월
                    </span>
                  </div>
                  {isAnnual && (
                    <p className={`mt-1 text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                      연 ₩{(getPrice(plan.price) * 12).toLocaleString()} 결제
                    </p>
                  )}
                  {plan.savings && !isAnnual && (
                    <p className="mt-2 text-sm font-medium text-blue-100">
                      💰 {plan.savings}
                    </p>
                  )}
                  {plan.savings && isAnnual && (
                    <p className="mt-2 text-sm font-medium text-green-300">
                      ✓ 2개월 무료 적용됨
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-3">
                      {feature.included ? (
                        <CheckIcon
                          className={`h-5 w-5 flex-shrink-0 ${
                            plan.highlighted ? 'text-blue-200' : 'text-green-500'
                          }`}
                        />
                      ) : (
                        <XMarkIcon
                          className={`h-5 w-5 flex-shrink-0 ${
                            plan.highlighted ? 'text-blue-300/50' : 'text-gray-300'
                          }`}
                        />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? plan.highlighted
                              ? 'text-white font-medium'
                              : 'text-gray-700'
                            : plan.highlighted
                            ? 'text-blue-200/60'
                            : 'text-gray-400'
                        } ${'highlight' in feature && feature.highlight ? 'font-semibold' : ''}`}
                      >
                        {feature.name}
                        {'pro' in feature && feature.pro && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            PRO
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Link
                  href={`/auth/signup?plan=${plan.id}${plan.id === 'pro' ? '&trial=true' : ''}`}
                  className={`block w-full rounded-full py-4 text-center text-base font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl hover:scale-105'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {plan.cta}
                </Link>

                {plan.highlighted && (
                  <p className="mt-4 text-center text-xs text-blue-100">
                    신용카드 등록 불필요 • 언제든 취소 가능
                  </p>
                )}
                {!plan.highlighted && (
                  <p className="mt-4 text-center text-xs text-gray-400">
                    미사용 기간 일할 계산 환불
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600 mb-4">
            모든 기능 비교가 필요하신가요?
          </p>
          <Link
            href="/features/comparison"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
