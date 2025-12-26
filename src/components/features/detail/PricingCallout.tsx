'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

interface PricingCalloutProps {
  message: string
  note?: string
  isPro?: boolean
}

export default function PricingCallout({ message, note, isPro = false }: PricingCalloutProps) {
  return (
    <section className="py-24 sm:py-32 bg-gradient-to-br from-blue-600 to-indigo-600">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {message}
          </h3>
          {note && (
            <p className="text-lg text-blue-100 mb-8">
              {note}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-blue-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              요금제 자세히 보기
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/signup?plan=pro&trial=true"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white hover:text-blue-600 transition-all"
            >
              14일 무료 체험
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
