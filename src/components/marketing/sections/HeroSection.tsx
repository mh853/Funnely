'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { SparklesIcon, ChartBarIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

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
            비즈니스 성장,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              이제 퍼널리로 한 번에
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
            올인원 마케팅 플랫폼으로 효율을 극대화하세요
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
              <RocketLaunchIcon className="h-5 w-5" />
              14일 무료 체험 시작
              <span className="absolute -top-2 -right-2 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500"></span>
              </span>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-all"
            >
              <ChartBarIcon className="h-5 w-5" />
              둘러보기
            </a>
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

        {/* Hero image/screenshot placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16 sm:mt-24"
        >
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
            <div className="relative rounded-2xl bg-white/80 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-gray-900/10">
              <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                    <ChartBarIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-gray-600 font-medium">대시보드 미리보기</p>
                  <p className="text-sm text-gray-500 mt-1">실제 스크린샷은 추후 추가</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
