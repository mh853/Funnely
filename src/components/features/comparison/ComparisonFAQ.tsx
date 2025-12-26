'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface FAQ {
  question: string
  answer: string
}

interface ComparisonFAQProps {
  faqs: FAQ[]
}

export default function ComparisonFAQ({ faqs }: ComparisonFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            자주 묻는 질문
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            플랜 선택 FAQ
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mx-auto max-w-3xl divide-y divide-gray-200 rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left px-6 py-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-lg font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <ChevronDownIcon
                    className={`h-6 w-6 flex-shrink-0 text-gray-400 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {openIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 text-gray-600 leading-7"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
