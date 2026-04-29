'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid'
import InquiryModal from '@/components/marketing/modals/InquiryModal'

type FeatureValue = boolean | string

type Plan = {
  id: string
  name: string
  target: string
  price: number | null
  priceLabel?: string
  badge?: string
  highlighted: boolean
  cta: string
  ctaVariant: 'primary' | 'outline' | 'custom'
  features: FeatureValue[]
}

type FeatureRow = {
  label: string
  values: FeatureValue[]
}

const featureRows: FeatureRow[] = [
  { label: '이미지 교체', values: ['무제한', '무제한', '무제한', '무제한', '무제한'] },
  { label: '트래픽', values: ['무제한', '무제한', '무제한', '무제한', '무제한'] },
  { label: '랜딩페이지 제작', values: ['1건', '3건', '10건', '무제한', '무제한'] },
  { label: '관리자 계정 (팀 관리)', values: ['1건', '1건', '10건', '무제한', '무제한'] },
  { label: 'DB 리포트', values: [true, true, true, true, true] },
  { label: '대시보드', values: [true, true, true, true, true] },
  { label: '트래픽 분석', values: [true, true, true, true, true] },
  { label: '블랙리스트 관리', values: [true, true, true, true, true] },
  { label: '광고 픽셀 & API 연동', values: [true, true, true, true, true] },
  { label: '이메일 알림', values: [false, true, true, true, true] },
  { label: 'DB 스케줄 관리', values: [false, false, true, true, true] },
  { label: '예약 스케줄 관리', values: [false, false, true, true, true] },
  { label: 'DB 자동배분', values: [false, false, false, true, true] },
  { label: '커스터마이징', values: [false, false, false, false, true] },
]

const plans: Plan[] = [
  {
    id: 'starter',
    name: '스타터',
    target: '1인 사업자 및 개인',
    price: 19000,
    highlighted: false,
    cta: '시작하기',
    ctaVariant: 'outline',
    features: featureRows.map((r) => r.values[0]),
  },
  {
    id: 'starter-plus',
    name: '스타터 플러스',
    target: '1인 사업자 및 개인',
    price: 49000,
    highlighted: false,
    cta: '시작하기',
    ctaVariant: 'outline',
    features: featureRows.map((r) => r.values[1]),
  },
  {
    id: 'pro',
    name: '프로',
    target: '스타트업, 소규모 사업자',
    price: 290000,
    highlighted: false,
    badge: '7일 무료체험',
    cta: '7일 무료체험',
    ctaVariant: 'primary',
    features: featureRows.map((r) => r.values[2]),
  },
  {
    id: 'premium',
    name: '프리미엄',
    target: '기업 및 팀 조직',
    price: 490000,
    highlighted: true,
    badge: '기업 추천',
    cta: '시작하기',
    ctaVariant: 'primary',
    features: featureRows.map((r) => r.values[3]),
  },
  {
    id: 'custom',
    name: '커스터마이징',
    target: '맞춤형 개발이 필요한 기업',
    price: null,
    priceLabel: '협의',
    highlighted: false,
    cta: '상담하기',
    ctaVariant: 'custom',
    features: featureRows.map((r) => r.values[4]),
  },
]

function FeatureCell({ value, highlighted }: { value: FeatureValue; highlighted: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <CheckIcon className={`h-5 w-5 mx-auto ${highlighted ? 'text-blue-600' : 'text-green-500'}`} />
    ) : (
      <XMarkIcon className={`h-5 w-5 mx-auto text-gray-300`} />
    )
  }
  const isHighlight = value === '무제한' || value.endsWith('건')
  return (
    <span className={`text-sm font-semibold ${
      highlighted
        ? isHighlight ? 'text-blue-700' : 'text-blue-500'
        : isHighlight ? 'text-blue-600' : 'text-gray-700'
    }`}>
      {value}
    </span>
  )
}

export default function PricingSection() {
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)

  return (
    <>
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        inquiryType="sales"
      />

      <section id="pricing" className="py-24 sm:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600">요금제</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              성장에 맞는{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                플랜 선택
              </span>
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              미사용 기간 일할 계산 환불 • 언제든 업그레이드 가능
            </p>
          </div>

          {/* Plan cards row */}
          <div className="mb-4 overflow-x-auto pt-5 pb-4">
            <div className="min-w-[900px] grid grid-cols-5 gap-4">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07 }}
                  className="relative"
                >
                  <div
                    className={`relative rounded-2xl p-5 h-full flex flex-col ${
                      plan.highlighted
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl ring-2 ring-blue-500/30'
                        : 'bg-white shadow-sm ring-1 ring-gray-200'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-md ${
                          plan.highlighted
                            ? 'bg-amber-400 text-amber-900'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        }`}>
                          <SparklesIcon className="h-3 w-3" />
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    {/* Name */}
                    <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs mb-4 leading-snug ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                      {plan.target}
                    </p>

                    {/* Price */}
                    <div className="mb-5 flex-1">
                      {plan.price !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-bold tracking-tight ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                            ₩{plan.price.toLocaleString()}
                          </span>
                          <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>/월</span>
                        </div>
                      ) : (
                        <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                          {plan.priceLabel}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    {plan.ctaVariant === 'custom' ? (
                      <button
                        type="button"
                        onClick={() => setIsInquiryOpen(true)}
                        className="block w-full rounded-full py-2.5 text-center text-sm font-semibold transition-all bg-gray-900 text-white hover:bg-gray-700 shadow-sm"
                      >
                        {plan.cta}
                      </button>
                    ) : (
                      <Link
                        href={`/auth/signup?plan=${plan.id}${plan.id === 'pro' ? '&trial=true' : ''}`}
                        className={`block w-full rounded-full py-2.5 text-center text-sm font-semibold transition-all ${
                          plan.highlighted
                            ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg'
                            : plan.ctaVariant === 'primary'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md'
                            : 'border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Feature comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="overflow-x-auto rounded-2xl shadow-sm ring-1 ring-gray-200 bg-white"
          >
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 w-44">기능</th>
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      className={`px-4 py-4 text-center text-sm font-bold w-32 ${
                        plan.highlighted
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={`border-b border-gray-50 last:border-0 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{row.label}</td>
                    {plans.map((plan, planIndex) => (
                      <td
                        key={plan.id}
                        className={`px-4 py-3.5 text-center ${
                          plan.highlighted
                            ? 'bg-blue-600/[0.06]'
                            : ''
                        }`}
                      >
                        <FeatureCell value={row.values[planIndex]} highlighted={plan.highlighted} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Footer note */}
          <p className="mt-6 text-center text-sm text-gray-400">
            모든 플랜 미사용 기간 일할 계산 환불 • 7일 무료체험은 신용카드 등록 불필요
          </p>
        </div>
      </section>
    </>
  )
}
