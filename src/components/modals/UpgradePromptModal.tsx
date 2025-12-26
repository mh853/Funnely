'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: '트래픽 분석' | 'DB 리포트' | 'DB 스케줄' | '예약 스케줄'
}

const featureDescriptions = {
  '트래픽 분석': {
    title: '트래픽 분석으로 고객 행동 이해하기',
    description: '실시간 트래픽 분석으로 마케팅 ROI를 극대화하세요.',
    features: [
      '실시간 방문자 추적 및 행동 분석',
      '전환율 분석 및 퍼널 최적화',
      '유입 경로 분석 (검색, SNS, 직접 유입)',
      'UTM 파라미터 추적으로 캠페인 성과 측정'
    ],
    icon: '📊'
  },
  'DB 리포트': {
    title: 'DB 리포트로 데이터 기반 의사결정',
    description: '종합적인 데이터 분석 리포트로 비즈니스 인사이트를 확보하세요.',
    features: [
      '일/주/월 단위 종합 성과 리포트',
      '리드 전환율 및 ROI 분석',
      '담당자별 성과 비교 분석',
      '맞춤형 리포트 자동 생성 및 공유'
    ],
    icon: '📈'
  },
  'DB 스케줄': {
    title: 'DB 스케줄로 효율적인 리드 관리',
    description: '자동화된 스케줄링으로 리드 관리 시간을 절약하세요.',
    features: [
      '리드 자동 배정 스케줄 설정',
      '팔로우업 자동 알림 및 리마인더',
      '우선순위 기반 리드 관리',
      '스케줄 템플릿 저장 및 재사용'
    ],
    icon: '📅'
  },
  '예약 스케줄': {
    title: '예약 스케줄로 고객 만족도 향상',
    description: '고객 예약 관리를 자동화하여 노쇼를 방지하고 운영 효율을 높이세요.',
    features: [
      '고객 예약 자동 확인 및 알림',
      '예약 변경 및 취소 관리',
      '캘린더 동기화 (구글, 네이버, 애플)',
      '예약 리마인더 SMS/이메일 자동 발송'
    ],
    icon: '🗓️'
  }
}

export default function UpgradePromptModal({
  isOpen,
  onClose,
  featureName
}: UpgradePromptModalProps) {
  const feature = featureDescriptions[featureName]

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                      <LockClosedIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-gray-900"
                      >
                        {feature.icon} {featureName}
                      </Dialog.Title>
                      <p className="text-xs text-purple-600 font-medium mt-0.5">
                        프로 플랜 이상 필요
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2">
                    {feature.features.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Info */}
                  <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border border-indigo-100">
                    <p className="text-xs text-gray-600 mb-1">프로 플랜으로 업그레이드</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">39,000원</span>
                      <span className="text-sm text-gray-500">/월</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      모든 프리미엄 기능 무제한 사용
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <Link
                    href="/dashboard/settings?tab=subscription"
                    className="flex-1 inline-flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                    onClick={onClose}
                  >
                    업그레이드 하기
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    나중에 하기
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
