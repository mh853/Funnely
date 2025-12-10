'use client'

import { useState } from 'react'
import { CheckCircleIcon, ArrowRightIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

interface MetaConnectionGuideProps {
  onStartConnection: () => void
  isConnecting: boolean
}

export default function MetaConnectionGuide({ onStartConnection, isConnecting }: MetaConnectionGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  const prerequisites = [
    {
      id: 1,
      title: 'Facebook 비즈니스 계정',
      description: 'Meta Business Suite (business.facebook.com)에 접속 가능한 계정이 있어야 합니다.',
      tip: 'Facebook 개인 계정으로 로그인하면 비즈니스 계정을 만들 수 있어요.',
    },
    {
      id: 2,
      title: '광고 계정 관리자 권한',
      description: '연동하려는 광고 계정의 관리자(Admin) 권한이 필요합니다.',
      tip: '권한이 없다면 현재 관리자에게 권한을 요청하세요.',
    },
    {
      id: 3,
      title: '페이지 관리 권한 (선택)',
      description: 'Facebook/Instagram 페이지 광고를 하려면 페이지 관리 권한도 필요합니다.',
      tip: '나중에 페이지를 추가로 연결할 수도 있어요.',
    },
  ]

  const steps = [
    {
      number: 1,
      title: '연동 시작하기',
      description: '아래 버튼을 클릭하면 Meta(Facebook) 로그인 화면으로 이동합니다.',
      action: '연동 시작',
    },
    {
      number: 2,
      title: 'Meta 계정 로그인',
      description: 'Facebook 계정으로 로그인해주세요. 비밀번호를 입력하고 로그인 버튼을 클릭합니다.',
      tip: '2단계 인증이 설정되어 있다면 인증 코드도 입력해주세요.',
    },
    {
      number: 3,
      title: '권한 승인',
      description: '"Funnely에서 광고 계정 정보를 확인하려고 합니다"라는 메시지가 나타납니다. 모든 권한을 승인해주세요.',
      tip: '권한을 승인하지 않으면 광고 데이터를 가져올 수 없어요.',
    },
    {
      number: 4,
      title: '광고 계정 선택',
      description: '연동하려는 광고 계정을 선택합니다. 여러 개의 광고 계정이 있다면 원하는 계정을 선택해주세요.',
      tip: '나중에 다른 계정을 추가로 연동할 수 있어요.',
    },
    {
      number: 5,
      title: '연동 완료!',
      description: '모든 과정이 끝나면 자동으로 이 페이지로 돌아옵니다. 연동된 계정이 목록에 표시됩니다.',
      tip: '연동 후 첫 데이터 동기화에 몇 분이 걸릴 수 있어요.',
    },
  ]

  const toggleChecked = (id: number) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const allPrerequisitesChecked = prerequisites.every(p => checkedItems[p.id])

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">f</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Meta 광고 계정 연동하기</h2>
            <p className="text-blue-100 text-sm mt-1">
              Facebook & Instagram 광고 계정을 연동하여 성과를 한눈에 확인하세요
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Prerequisites Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">연동 전 확인사항</h3>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-800">
              아래 항목을 확인한 후 연동을 진행해주세요. 준비가 안 되어 있으면 연동이 실패할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            {prerequisites.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecked(item.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  checkedItems[item.id]
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 pt-0.5">
                  {checkedItems[item.id] ? (
                    <CheckCircleSolidIcon className="h-6 w-6 text-green-500" />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${checkedItems[item.id] ? 'text-green-800' : 'text-gray-900'}`}>
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-start gap-2 mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{item.tip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Indicator */}
        {allPrerequisitesChecked && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">모든 준비가 완료되었습니다!</span>
            </div>
          </div>
        )}

        {/* Steps Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100">
              <span className="text-blue-600 font-bold text-sm">?</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">연동 과정 안내</h3>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.number} className="relative flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                    index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.number}
                  </div>
                  <div className="flex-1 pb-4">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    {step.tip && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
                        <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="border-t pt-6">
          <button
            onClick={onStartConnection}
            disabled={!allPrerequisitesChecked || isConnecting}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
              allPrerequisitesChecked && !isConnecting
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>연동 진행 중...</span>
              </>
            ) : (
              <>
                <span className="text-xl">f</span>
                <span>Meta 계정 연동 시작하기</span>
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>

          {!allPrerequisitesChecked && (
            <p className="text-center text-sm text-gray-500 mt-3">
              위의 확인사항을 모두 체크해주세요
            </p>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2">도움이 필요하신가요?</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 연동에 문제가 있다면 페이지를 새로고침 후 다시 시도해주세요.</p>
            <p>• Meta 비즈니스 계정이 없다면 <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">business.facebook.com</a>에서 먼저 생성해주세요.</p>
            <p>• 계속 문제가 발생하면 관리자에게 문의해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
