'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { RocketLaunchIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import InquiryModal from '@/components/marketing/modals/InquiryModal'

const benefits = [
  '7일 무료체험',
  '언제든 취소 가능',
  '신용카드 등록 불필요',
  '모든 기능 제한 없이 사용',
]

export default function FinalCTASection() {
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false)

  return (
    <>
      <InquiryModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        inquiryType="sales"
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 py-24 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Headline */}
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            7일 무료체험, 신용카드 등록 필요 없음
          </p>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 text-left"
              >
                <CheckCircleIcon className="h-6 w-6 text-green-300 flex-shrink-0" />
                <span className="text-white font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth/signup?plan=pro&trial=true"
              className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-2xl hover:shadow-3xl transition-all hover:scale-110"
            >
              <RocketLaunchIcon className="h-6 w-6" />
              무료로 시작하기
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
            </Link>
            <button
              onClick={() => setIsSalesModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-white hover:bg-white/20 transition-all"
            >
              영업팀과 상담하기
            </button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-sm text-blue-100"
          >
            🔒 안전한 결제 시스템 • 개인정보 보호 보장
          </motion.p>
        </motion.div>
      </div>
    </section>
    </>
  )
}
