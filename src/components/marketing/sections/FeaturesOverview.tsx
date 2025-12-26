'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  PaintBrushIcon,
  ChartBarIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    name: '랜딩페이지 빌더',
    slug: 'landing-page-builder',
    description: '드래그 앤 드롭으로 누구나 쉽게 제작. Hero, Pricing, FAQ 등 다양한 섹션 제공',
    icon: PaintBrushIcon,
    iconColor: 'from-pink-500 to-rose-500',
    features: ['비주얼 에디터', '실시간 모바일 프리뷰', '자동 폼 수집'],
    isPro: false,
  },
  {
    name: 'DB 관리',
    slug: 'database-management',
    description: '엑셀은 이제 그만. 상태별 자동 분류와 담당자 배정으로 효율적인 관리',
    icon: ChartBarIcon,
    iconColor: 'from-blue-500 to-cyan-500',
    features: ['상태별 워크플로우', '담당자 자동 배정', '상담 히스토리 추적'],
    isPro: false,
  },
  {
    name: '트래픽 분석',
    slug: 'traffic-analytics',
    description: '실시간 방문자 추적, 전환율 분석, UTM 파라미터로 광고 성과 측정',
    icon: ChartPieIcon,
    iconColor: 'from-violet-500 to-purple-500',
    features: ['실시간 트래픽 대시보드', '유입 경로 분석', '전환 퍼널 추적'],
    isPro: true,
  },
  {
    name: 'DB 리포트',
    slug: 'database-reports',
    description: '날짜별, 부서별, 담당자별 성과 분석으로 데이터 기반 의사결정',
    icon: DocumentChartBarIcon,
    iconColor: 'from-amber-500 to-orange-500',
    features: ['기간별 DB 현황', '팀원 성과 비교', '매출 분석'],
    isPro: true,
  },
  {
    name: '스케줄 관리',
    slug: 'schedule-management',
    description: 'DB와 연동된 캘린더로 상담 일정과 예약을 한 곳에서 관리',
    icon: CalendarDaysIcon,
    iconColor: 'from-green-500 to-emerald-500',
    features: ['캘린더 뷰', '담당자 배정', '자동 일정 생성'],
    isPro: true,
  },
  {
    name: '팀 협업',
    slug: 'team-collaboration',
    description: '회사 단위 관리로 모든 팀원이 실시간으로 DB와 일정을 공유',
    icon: UsersIcon,
    iconColor: 'from-indigo-500 to-blue-500',
    features: ['팀원 초대 시스템', '권한 관리', '활동 추적'],
    isPro: false,
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function FeaturesOverview() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            강력한 기능
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            비즈니스 성장에 필요한{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              모든 것
            </span>
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            랜딩페이지 제작부터 DB 관리, 분석까지 하나의 플랫폼에서 해결하세요
          </p>
        </div>

        {/* Features grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              variants={item}
              className="group relative"
            >
              <div
                className={`relative rounded-2xl border ${
                  feature.isPro
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                    : 'border-gray-200 bg-white'
                } p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                {/* Pro badge */}
                {feature.isPro && (
                  <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 shadow-lg">
                    <LockClosedIcon className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-bold text-white">PRO</span>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-r ${feature.iconColor} p-3 shadow-lg mb-5`}
                >
                  <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>

                {/* Feature list */}
                <ul className="space-y-2 mb-6">
                  {feature.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Learn more link */}
                <Link
                  href={`/features/${feature.slug}`}
                  className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 group-hover:gap-2 transition-all"
                >
                  자세히 보기
                  <svg
                    className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform"
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
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
