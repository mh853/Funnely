'use client'

import { motion } from 'framer-motion'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface UseCase {
  title: string
  description: string
}

interface UseCasesProps {
  useCases: UseCase[]
}

export default function UseCases({ useCases }: UseCasesProps) {
  return (
    <section className="py-24 sm:py-32 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            성공 사례
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            실제 고객의 성과
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="inline-flex rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-2 mb-4">
                <BuildingOfficeIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {useCase.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
