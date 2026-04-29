'use client'

import { useState } from 'react'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import InquiryModal from '@/components/marketing/modals/InquiryModal'

const faqs = [
  {
    question: '퍼널리는 어떤 서비스인가요?',
    answer:
      '누구나 쉽게 홈페이지와 랜딩페이지를 제작할 수 있는 서비스입니다. 특히 DB수집을 많이 필요로 하는 업종에서 아웃바운드 콜, 예약, 방문까지의 과정을 한번에 관리할 수 있는 강점이 있습니다. 랜딩페이지 제작, DB 자동분배, DB 상태 관리, 리포트 등을 제공하여 마케팅 부서, 콜 부서, 관리자가 종합적으로 활용할 수 있는 서비스입니다.',
  },
  {
    question: '무료 체험 기간이 있나요?',
    answer:
      '네. 프리미엄 요금제 7일 무료체험이 가능합니다. 신용카드 등록 없이 바로 무료체험이 가능하며, 체험 기간 동안 모든 기능을 제한 없이 사용하실 수 있습니다.',
  },
  {
    question: '개발자 없이 랜딩페이지나 홈페이지를 만들 수 있나요?',
    answer:
      '네, 가능합니다. 퍼널리는 개발자 없이 쉽고 빠르게 홈페이지 혹은 랜딩페이지를 만들 수 있는 서비스입니다. DB 관리가 가능한 서비스이기 때문에 고객정보 관리가 필요한 경우 활용하시면 더욱 좋습니다.',
  },
  {
    question: '데이터는 안전한가요?',
    answer:
      '모든 데이터는 암호화되어 저장되며, 회사별로 완전히 독립된 데이터베이스를 사용합니다. 전화번호 등 민감 정보는 자동으로 암호화됩니다.',
  },
  {
    question: '커스터마이징 가능한가요?',
    answer:
      '네, 가능합니다. 커스터마이징은 기업 및 조직의 활용에 맞추어 제작되기 때문에 별도의 협의가 필요합니다. 커스터마이징 진행이 필요하신 경우, 고객센터로 문의를 남겨주시기 바랍니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '무료 체험 기간 동안에는 언제든 취소할 수 있습니다. 요금제 이용 중인 경우, 서비스를 이용하지 않은 기간에 대해 일할 계산하여 환불이 진행됩니다.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <Script
        id="faq-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        inquiryType="general"
      />

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
          <button
            onClick={() => setIsInquiryModalOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            문의하기
          </button>
        </motion.div>
      </div>
    </section>
    </>
  )
}
