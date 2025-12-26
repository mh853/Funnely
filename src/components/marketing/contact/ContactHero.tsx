'use client'

import { motion } from 'framer-motion'
import { PhoneIcon as HeadphonesIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function ContactHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 sm:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex"
          >
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 shadow-xl">
              <HeadphonesIcon className="h-12 w-12 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6"
          >
            고객 지원팀이{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              도와드리겠습니다
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg leading-8 text-gray-600 mb-10"
          >
            궁금한 점이나 도움이 필요하신가요?
            <br />
            아래 양식을 작성해주시면 영업일 기준 24시간 내에 답변드리겠습니다.
          </motion.p>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-600"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <span>평균 응답 시간 12시간</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>고객 만족도 98%</span>
            </div>
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5 text-indigo-600" />
              <span>전문 지원팀 운영</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
