'use client'

import { motion } from 'framer-motion'
import {
  PaintBrushIcon,
  ChartBarIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  SignalIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    name: '랜딩페이지 생성',
    description: '누구나 5분만에 쉽고 빠르게 랜딩페이지 생성이 가능합니다. 홈페이지 및 DB수집용 랜딩페이지 제작 가능.',
    icon: PaintBrushIcon,
    iconColor: 'from-pink-500 to-rose-500',
    features: ['이미지/영상 삽입', 'DB 수집 마감 타이머', '실시간 DB 수집현황', 'DB 수집 폼', '상담신청·전화연결 버튼'],
    isPro: false,
  },
  {
    name: '실시간 DB 수집 및 관리',
    description: '실시간으로 수집된 DB를 간편하게 관리. 콜센터 운영 중인 경우 DB배분 기능으로 콜 관리가 가능합니다.',
    icon: ChartBarIcon,
    iconColor: 'from-blue-500 to-cyan-500',
    features: ['DB 현황 리스트', 'DB 배분 (콜 담당자)', 'DB 수동 추가', '콜 결과 관리'],
    isPro: false,
  },
  {
    name: 'DB예약 스케줄 관리',
    description: '캘린더로 관리하는 DB 스케쥴. 예약, 방문 스케쥴 별도 관리가 가능합니다.',
    icon: CalendarDaysIcon,
    iconColor: 'from-green-500 to-emerald-500',
    features: ['DB 스케쥴 캘린더', '예약 스케쥴 관리', '월별·주간별 스케쥴 노트'],
    isPro: true,
  },
  {
    name: '트래픽 분석',
    description: 'UTM, 기기별 유입경로 분석. DB 유입 경로를 PC·모바일·태블릿으로 구별하여 전환율까지 확인.',
    icon: ChartPieIcon,
    iconColor: 'from-violet-500 to-purple-500',
    features: ['실시간 트래픽 대시보드', '기기별 유입 분석', '유입경로별 전환율'],
    isPro: true,
  },
  {
    name: '부서별/담당자별 성과 분석',
    description: '콜 전환 성과 분석. 일별·월별 유입된 DB 결과를 한눈에 체크하고 월별·계정별 요약 리포트를 제공합니다.',
    icon: DocumentChartBarIcon,
    iconColor: 'from-amber-500 to-orange-500',
    features: ['일별·월별 DB 현황', '담당자 성과 비교', '데일리 성과 측정'],
    isPro: true,
  },
  {
    name: '광고 픽셀 & API 연동',
    description: '광고 진행을 위한 픽셀 및 API 연동 가이드 제공. 성과 측정 및 효율 증대를 쉽게 하실 수 있습니다.',
    icon: SignalIcon,
    iconColor: 'from-indigo-500 to-blue-500',
    features: ['광고 픽셀 연동', 'API 연동 가이드', '효율 및 전환 체크'],
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

              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
