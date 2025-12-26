'use client'

import { motion } from 'framer-motion'
import { IconName, getIcon } from '@/utils/iconMap'

interface Benefit {
  title: string
  description: string
  icon: IconName
}

interface KeyBenefitsProps {
  benefits: Benefit[]
}

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

export default function KeyBenefits({ benefits }: KeyBenefitsProps) {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            핵심 혜택
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            왜 이 기능을 사용해야 할까요?
          </p>
        </div>

        {/* Benefits Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className={`grid gap-8 ${
            benefits.length === 3 ? 'md:grid-cols-3' : benefits.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'
          }`}
        >
          {benefits.map((benefit, index) => {
            const BenefitIcon = getIcon(benefit.icon)
            return (
              <motion.div
                key={index}
                variants={item}
                className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 shadow-lg mb-5">
                  <BenefitIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
