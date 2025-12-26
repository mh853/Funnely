'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

const faqs = [
  {
    question: '무료 체험 기간이 있나요?',
    answer:
      '네, 프로 플랜은 14일 무료 체험이 가능합니다. 신용카드 등록 없이 바로 시작할 수 있으며, 체험 기간 동안 모든 기능을 제한 없이 사용하실 수 있습니다.',
  },
  {
    question: '베이직 플랜에서 프로 플랜으로 업그레이드할 수 있나요?',
    answer:
      '물론입니다. 언제든지 플랜을 업그레이드할 수 있으며, 기존 데이터는 모두 유지됩니다. 일할 계산으로 차액만 결제하시면 됩니다.',
  },
  {
    question: '팀원은 몇 명까지 추가할 수 있나요?',
    answer:
      '베이직 플랜은 3명, 프로 플랜은 무제한입니다. 팀원은 이메일 초대로 간편하게 추가할 수 있습니다.',
  },
  {
    question: '랜딩페이지는 몇 개까지 만들 수 있나요?',
    answer: '베이직 플랜은 3개, 프로 플랜은 무제한으로 제작 가능합니다.',
  },
  {
    question: '결제는 어떻게 하나요?',
    answer:
      '신용카드, 체크카드로 결제 가능하며, 월간 또는 연간 결제를 선택할 수 있습니다. 연간 결제 시 2개월 무료 혜택이 제공됩니다.',
  },
  {
    question: '데이터는 안전한가요?',
    answer:
      '모든 데이터는 암호화되어 저장되며, 회사별로 완전히 격리된 데이터베이스를 사용합니다. 전화번호 등 민감 정보는 자동으로 암호화됩니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '무료 체험 기간 동안에는 언제든 취소할 수 있으며, 결제 후 7일 이내 전액 환불이 가능합니다. (단, 서비스를 사용하지 않은 경우에 한함)',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-blue-600">
            FAQ
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            자주 묻는 질문
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            궁금하신 내용이 있다면 언제든 문의해주세요
          </p>
        </div>

        {/* FAQ list */}
        <dl className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <dt>
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex w-full items-start justify-between text-left p-6 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <span className="ml-6 flex h-7 items-center">
                    <ChevronDownIcon
                      className={`h-6 w-6 text-blue-600 transform transition-transform duration-200 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </dt>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.dd
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pr-12">
                      <p className="text-base text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.dd>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </dl>

        {/* Additional help */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-8 text-center"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            더 궁금하신 점이 있으신가요?
          </h3>
          <p className="text-gray-600 mb-6">
            고객 지원팀이 언제든 도와드리겠습니다
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            문의하기
          </a>
        </motion.div>
      </div>
    </section>
  )
}
