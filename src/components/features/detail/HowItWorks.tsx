'use client'

import { motion } from 'framer-motion'

interface Step {
  title: string
  description: string
}

interface HowItWorksProps {
  steps: Step[]
}

export default function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="py-24 sm:py-32 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            사용 방법
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            간단한 3단계로 시작하세요
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-4xl">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative pb-12 last:pb-0"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-blue-600 to-indigo-600" />
              )}

              <div className="flex gap-6">
                {/* Step number */}
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
                    <span className="text-2xl font-bold text-white">{index + 1}</span>
                  </div>
                </div>

                {/* Step content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
