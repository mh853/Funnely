'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/solid'

const plans = [
  {
    id: 'starter',
    name: '스타터',
    price: 19000,
    target: '1인 사업자 및 개인',
    highlights: ['랜딩페이지 1건', '관리자 1명', 'DB 리포트', '트래픽 분석'],
  },
  {
    id: 'starter-plus',
    name: '스타터 플러스',
    price: 49000,
    target: '1인 사업자 및 개인',
    highlights: ['랜딩페이지 3건', '이메일 알림', 'DB 리포트', '트래픽 분석'],
  },
  {
    id: 'pro',
    name: '프로',
    price: 290000,
    target: '스타트업, 소규모 사업자',
    badge: '추천',
    highlights: ['랜딩페이지 10건', '관리자 10명', 'DB 스케줄', '예약 스케줄'],
  },
  {
    id: 'premium',
    name: '프리미엄',
    price: 490000,
    target: '기업 및 팀 조직',
    highlights: ['랜딩페이지 무제한', '관리자 무제한', 'DB 자동배분', '모든 기능'],
  },
]

interface TrialExpiredModalProps {
  onDismiss: () => void
}

export default function TrialExpiredModal({ onDismiss }: TrialExpiredModalProps) {
  const router = useRouter()
  const [dismissConfirm, setDismissConfirm] = useState(false)

  const handleSelectPlan = () => {
    router.push('/dashboard/subscription')
  }

  const handleInquiry = () => {
    router.push('/dashboard/subscription')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 rounded-full mb-4">
            <SparklesIcon className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">무료 체험이 종료되었습니다</h2>
          <p className="text-gray-500 text-sm">
            서비스를 계속 이용하려면 플랜을 선택해주세요.<br />
            언제든지 취소 가능하며, 취소 후 결제 기간 만료까지 이용하실 수 있습니다.
          </p>
        </div>

        {/* Plan cards */}
        <div className="px-6 py-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-4 flex flex-col ${
                plan.badge
                  ? 'border-blue-400 ring-1 ring-blue-400'
                  : 'border-gray-200'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <p className="text-xs text-gray-400 mb-1">{plan.target}</p>
              <h3 className="font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-3">
                <span className="text-xl font-bold text-gray-900">
                  ₩{plan.price.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">/월</span>
              </div>
              <ul className="space-y-1 flex-1">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <CheckIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Custom plan row */}
        <div className="mx-6 mb-4 rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between">
          <div>
            <span className="font-semibold text-gray-900 text-sm">커스터마이징</span>
            <span className="ml-2 text-xs text-gray-400">맞춤형 개발이 필요한 기업</span>
          </div>
          <button
            onClick={handleInquiry}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            상담하기 →
          </button>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleSelectPlan}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all"
          >
            플랜 선택하기
          </button>

          {!dismissConfirm ? (
            <button
              onClick={() => setDismissConfirm(true)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              나중에 결정하기
            </button>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-xs text-amber-600">일부 기능이 제한될 수 있습니다. 계속 진행하시겠습니까?</p>
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                네, 나중에 선택할게요
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
