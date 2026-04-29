'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline'

const heroFeatures = [
  {
    number: '1',
    name: '랜딩페이지 생성',
    description: '누구나 5분만에 쉽게 제작. 홈페이지 및 DB수집용 랜딩페이지 제작 가능.',
  },
  {
    number: '2',
    name: '실시간 DB 수집 및 관리',
    description: '담당자별 DB 관리. 콜센터에서 활용 가능한 기능 추가.',
  },
  {
    number: '3',
    name: 'DB예약 스케줄 관리',
    description: '캘린더로 관리하는 DB 스케쥴. 예약, 방문 스케쥴 별도 관리 가능.',
  },
  {
    number: '4',
    name: '트래픽 분석',
    description: 'UTM, 기기별 유입경로 분석. 유입경로별 전환율 확인.',
  },
  {
    number: '5',
    name: '부서별/담당자별 성과 분석',
    description: '콜 전환 성과 분석. 월별·계정별 요약 리포트 제공.',
  },
  {
    number: '6',
    name: '광고 픽셀 & API 연동',
    description: '광고 진행을 위한 연동 가이드 제공. 효율 및 전환 체크 가능.',
  },
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-32 pb-20 sm:pt-40 sm:pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-l from-indigo-400/20 to-pink-400/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl mb-6"
          >
            DB 마케팅은
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              퍼널리에서 한 번에!
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10"
          >
            랜딩페이지 제작부터 DB 관리, 트래픽 분석까지
            <br className="hidden sm:block" />
            올인원 마케팅 플랫폼으로 편리하게 관리하세요!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link
              href="/auth/signup?plan=pro&trial=true"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              7일 무료체험
              <span className="absolute -top-2 -right-2 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500"></span>
              </span>
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-all"
            >
              회원가입
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-600"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">신용카드 등록 불필요</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">언제든 취소 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">5분 만에 시작</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16 sm:mt-24"
        >
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
            <div className="relative rounded-2xl bg-white/80 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-gray-900/10">
              {/* Mock dashboard UI */}
              <div className="rounded-lg bg-gray-50 overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center gap-2 bg-white px-4 py-3 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4 h-6 rounded-md bg-gray-100 flex items-center px-3">
                    <span className="text-xs text-gray-400">funnely.io/dashboard</span>
                  </div>
                </div>
                {/* Dashboard body */}
                <div className="p-4 sm:p-6 grid grid-cols-12 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-2 hidden sm:flex flex-col gap-2">
                    <div className="h-8 rounded-lg bg-blue-600 flex items-center px-2 gap-1.5">
                      <ChartBarIcon className="h-3.5 w-3.5 text-white flex-shrink-0" />
                      <div className="h-2 w-10 rounded-full bg-white/70" />
                    </div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-8 rounded-lg bg-white flex items-center px-2 gap-1.5">
                        <div className="h-3.5 w-3.5 rounded bg-gray-200 flex-shrink-0" />
                        <div className="h-2 w-12 rounded-full bg-gray-200" />
                      </div>
                    ))}
                  </div>
                  {/* Main content */}
                  <div className="col-span-12 sm:col-span-10 space-y-4">
                    {/* Stat cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: '총 방문자', value: '12,847', color: 'from-blue-500 to-blue-600' },
                        { label: '리드 수집', value: '1,293', color: 'from-violet-500 to-purple-600' },
                        { label: '전환율', value: '10.1%', color: 'from-emerald-500 to-teal-600' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} mb-2`}>
                            <SparklesIcon className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                          <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart placeholder */}
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-3 w-24 rounded-full bg-gray-200" />
                        <div className="h-6 w-16 rounded-lg bg-gray-100" />
                      </div>
                      <div className="flex items-end gap-1.5 h-20">
                        {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 to-indigo-400 opacity-80"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Table rows */}
                    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                      <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
                        {['랜딩페이지', '방문자', '전환율'].map((h) => (
                          <div key={h} className="h-2.5 w-16 rounded-full bg-gray-300" />
                        ))}
                      </div>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="grid grid-cols-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                          <div className="h-2 w-20 rounded-full bg-gray-200" />
                          <div className="h-2 w-12 rounded-full bg-gray-100" />
                          <div className={`h-2 w-10 rounded-full ${i === 0 ? 'bg-green-300' : 'bg-gray-100'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          {heroFeatures.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.05 }}
              className="rounded-2xl bg-white/80 backdrop-blur-sm p-4 shadow-md ring-1 ring-gray-200/50 text-center"
            >
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold mb-3">
                {feature.number}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{feature.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
