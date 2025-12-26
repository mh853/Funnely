'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import FeatureIcon from '../shared/FeatureIcon'
import { IconName } from '@/utils/iconMap'

interface RelatedFeature {
  name: string
  description: string
  icon: IconName
  iconColor: string
  href: string
}

interface RelatedFeaturesProps {
  features: RelatedFeature[]
}

export default function RelatedFeatures({ features }: RelatedFeaturesProps) {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            연관 기능
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            이 기능과 함께 사용하면 좋은 기능
          </p>
        </div>

        {/* Related Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={feature.href}
                className="group block h-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all hover:scale-105"
              >
                <FeatureIcon Icon={feature.icon} gradient={feature.iconColor} size="md" />
                <h3 className="text-xl font-semibold text-gray-900 mt-5 mb-2 group-hover:text-blue-600 transition-colors">
                  {feature.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <div className="inline-flex items-center text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                  자세히 보기
                  <ArrowRightIcon className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
