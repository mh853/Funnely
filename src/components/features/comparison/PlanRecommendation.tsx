'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  UserIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { SubscriptionPlan } from '@/types/subscription'

interface PlanRecommendationProps {
  plans: SubscriptionPlan[]
}

export default function PlanRecommendation({ plans }: PlanRecommendationProps) {
  // Build recommendations from actual plans
  const recommendations = [
    {
      title: '개인 사용자',
      description: '개인 프로젝트나 소규모 팀을 위한 기본 기능',
      icon: UserIcon,
      plan: plans[0] || null,
      gradient: 'from-blue-500 to-cyan-500',
      cta: '지금 시작하기',
      href: '/signup',
    },
    {
      title: '소규모 팀',
      description: '성장하는 팀을 위한 완전한 기능',
      icon: BuildingOfficeIcon,
      plan: plans[1] || null,
      gradient: 'from-purple-500 to-pink-500',
      cta: '시작하기',
      href: '/signup',
    },
    {
      title: '성장하는 기업',
      description: '본격적인 비즈니스를 위한 강력한 도구',
      icon: BuildingOffice2Icon,
      plan: plans[2] || null,
      gradient: 'from-amber-500 to-orange-500',
      cta: '지금 시작하기',
      href: '/signup',
      recommended: true,
    },
  ].filter(rec => rec.plan !== null)

  return (
    <section className="py-24 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            플랜 추천
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            어떤 플랜이 맞을까요?
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            비즈니스 단계와 목표에 맞는 플랜을 선택하세요
          </p>
        </div>

        {/* Recommendation Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {rec.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 shadow-lg">
                    <SparklesIcon className="h-4 w-4 text-white" />
                    <span className="text-sm font-bold text-white">추천</span>
                  </div>
                </div>
              )}

              <div
                className={`relative h-full rounded-2xl border-2 ${
                  rec.recommended
                    ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50'
                    : 'border-gray-200 bg-white'
                } p-8 shadow-lg hover:shadow-xl transition-all`}
              >
                {/* Icon */}
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-r ${rec.gradient} p-3 shadow-lg mb-5`}
                >
                  <rec.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {rec.title}
                </h3>
                <p className="text-gray-600 mb-6">{rec.description}</p>

                {/* Plan Info */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 mb-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {rec.plan.name}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {rec.plan.price_monthly === 0 ? (
                      '무료'
                    ) : (
                      <>
                        ₩{rec.plan.price_monthly.toLocaleString()}
                        <span className="text-lg font-normal text-gray-600">/월</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Key Features */}
                <ul className="space-y-3 mb-8">
                  {rec.plan.max_users && (
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">
                        최대 {rec.plan.max_users}명
                      </span>
                    </li>
                  )}
                  {rec.plan.max_landing_pages && (
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">
                        랜딩페이지 {rec.plan.max_landing_pages}개
                      </span>
                    </li>
                  )}
                  {rec.plan.features?.dashboard && (
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">DB 관리</span>
                    </li>
                  )}
                  {rec.plan.features?.db_schedule && (
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">스케줄 관리</span>
                    </li>
                  )}
                  {rec.plan.features?.analytics && (
                    <li className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">분석 및 리포트</span>
                    </li>
                  )}
                </ul>

                {/* CTA Button */}
                <Link
                  href={rec.href}
                  className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 ${
                    rec.recommended
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {rec.cta}
                  <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
