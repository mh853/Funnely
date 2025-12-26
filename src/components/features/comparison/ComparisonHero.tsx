'use client'

import { motion } from 'framer-motion'

export default function ComparisonHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-24 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6"
          >
            기능별 플랜{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              비교표
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg leading-8 text-gray-600 mb-8"
          >
            무료부터 프로까지, 모든 기능을 한눈에 비교하세요.
            <br />
            비즈니스 성장에 맞는 최적의 플랜을 선택하세요.
          </motion.p>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-sm text-gray-600"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>신용카드 등록 불필요</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>언제든 플랜 변경 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>14일 무료 체험</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
