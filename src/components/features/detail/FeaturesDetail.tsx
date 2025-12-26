'use client'

import { motion } from 'framer-motion'
import CheckIcon from '../shared/CheckIcon'

interface FeatureDetail {
  title: string
  description: string
}

interface FeaturesDetailProps {
  features: FeatureDetail[]
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function FeaturesDetail({ features }: FeaturesDetailProps) {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            세부 기능
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            포함된 모든 기능
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="flex items-start gap-4 p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 mt-1">
                <CheckIcon />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
