'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ShareIcon,
  LinkIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

const SERVICE_ACCOUNT_EMAIL = 'funnely@funnely-480706.iam.gserviceaccount.com'

export default function SheetSyncGuide() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = SERVICE_ACCOUNT_EMAIL
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step)
  }

  const markComplete = (step: number) => {
    if (completedSteps.includes(step)) {
      setCompletedSteps(completedSteps.filter(s => s !== step))
    } else {
      setCompletedSteps([...completedSteps, step])
      // Auto-expand next step
      if (step < 3) {
        setExpandedStep(step + 1)
      }
    }
  }

  const steps = [
    {
      number: 1,
      title: 'Google Sheets 열기',
      icon: DocumentTextIcon,
      description: '연동할 Google Sheets 파일을 열어주세요',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              Meta 광고 데이터가 저장된 Google Sheets 파일을 웹 브라우저에서 열어주세요.
            </p>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs text-gray-500 mb-1">예시 URL</p>
              <code className="text-xs text-gray-600 break-all">
                https://docs.google.com/spreadsheets/d/<span className="bg-yellow-100 px-1 rounded font-bold">스프레드시트ID</span>/edit
              </code>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
            <span className="text-lg">💡</span>
            <p>URL의 <strong>/d/</strong> 와 <strong>/edit</strong> 사이에 있는 긴 문자열이 스프레드시트 ID입니다. 나중에 사용하니 기억해두세요!</p>
          </div>
        </div>
      ),
    },
    {
      number: 2,
      title: '시트 공유하기 (가장 중요!)',
      icon: ShareIcon,
      description: '아래 이메일 주소를 복사해서 시트에 공유해주세요',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm font-medium text-purple-900 mb-3">
              이 이메일 주소를 복사하세요 👇
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white rounded-lg border-2 border-purple-300 px-4 py-3 font-mono text-sm text-gray-800 break-all">
                {SERVICE_ACCOUNT_EMAIL}
              </div>
              <button
                onClick={handleCopyEmail}
                className={`flex-shrink-0 px-4 py-3 rounded-lg font-medium transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <CheckCircleIcon className="h-5 w-5" />
                    복사됨!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ClipboardDocumentIcon className="h-5 w-5" />
                    복사
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="font-medium text-gray-900 mb-3">📋 공유 방법 (따라해보세요)</p>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Google Sheets에서 오른쪽 상단의 <strong className="text-indigo-600">&quot;공유&quot;</strong> 버튼을 클릭하세요</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>&quot;사용자 및 그룹 추가&quot; 입력창에 위에서 복사한 이메일을 붙여넣으세요</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>권한을 <strong className="text-indigo-600">&quot;편집자&quot;</strong>로 선택하세요</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span><strong className="text-indigo-600">&quot;전송&quot;</strong> 버튼을 클릭하세요</span>
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
            <span className="text-lg">⚠️</span>
            <p><strong>중요!</strong> 이 단계를 건너뛰면 데이터를 가져올 수 없습니다. 반드시 &quot;편집자&quot; 권한으로 공유해주세요.</p>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      title: '아래에서 시트 연결하기',
      icon: LinkIcon,
      description: '스프레드시트 ID를 입력하고 연결하세요',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              아래 &quot;시트 연결&quot; 버튼을 클릭하고 다음 정보를 입력하세요:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <strong>스프레드시트 ID</strong>: URL에서 복사한 긴 문자열
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <strong>시트 이름</strong>: 기본값 &quot;Sheet1&quot; 또는 실제 시트 탭 이름
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <strong>컬럼 매핑</strong>: 시트의 열 이름 (이름, 전화번호, 이메일 등)
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <p className="font-medium text-gray-900 mb-2">📊 컬럼 매핑 예시</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">시트의 열 이름</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">입력할 값</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-3 py-2 text-gray-700">A열이 &quot;이름&quot;이면</td>
                    <td className="px-3 py-2 font-mono bg-gray-50">이름</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-700">B열이 &quot;연락처&quot;이면</td>
                    <td className="px-3 py-2 font-mono bg-gray-50">연락처</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-700">C열이 &quot;이메일&quot;이면</td>
                    <td className="px-3 py-2 font-mono bg-gray-50">이메일</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
            <span className="text-lg">✅</span>
            <p>연결 완료 후 &quot;지금 동기화&quot; 버튼을 클릭하면 바로 데이터를 가져올 수 있습니다!</p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <TableCellsIcon className="h-8 w-8 text-white" />
          <div>
            <h2 className="text-lg font-bold text-white">Google Sheets 연동 가이드</h2>
            <p className="text-sm text-indigo-100">3단계만 따라하면 완료!</p>
          </div>
        </div>
        {/* 진행 표시 */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  completedSteps.includes(step.number)
                    ? 'bg-green-400 text-white'
                    : 'bg-white/20 text-white'
                }`}
              >
                {completedSteps.includes(step.number) ? (
                  <CheckCircleSolidIcon className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    completedSteps.includes(step.number) ? 'bg-green-400' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="ml-3 text-sm text-white/80">
            {completedSteps.length}/3 완료
          </span>
        </div>
      </div>

      {/* 단계별 가이드 */}
      <div className="divide-y divide-gray-100">
        {steps.map((step) => (
          <div key={step.number} className="group">
            {/* 단계 헤더 */}
            <button
              onClick={() => toggleStep(step.number)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSteps.includes(step.number)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {completedSteps.includes(step.number) ? (
                    <CheckCircleSolidIcon className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-indigo-600">
                      STEP {step.number}
                    </span>
                    {completedSteps.includes(step.number) && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        완료
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
              {expandedStep === step.number ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {/* 단계 내용 */}
            {expandedStep === step.number && (
              <div className="px-6 pb-6">
                <div className="ml-14">
                  {step.content}

                  {/* 완료 버튼 */}
                  <button
                    onClick={() => markComplete(step.number)}
                    className={`mt-4 w-full py-2.5 rounded-lg font-medium transition-all ${
                      completedSteps.includes(step.number)
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {completedSteps.includes(step.number)
                      ? '✓ 완료됨 (클릭하여 취소)'
                      : '이 단계 완료했어요!'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 완료 메시지 */}
      {completedSteps.length === 3 && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleSolidIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">준비 완료!</p>
              <p className="text-sm text-green-600">아래에서 &quot;시트 연결&quot; 버튼을 클릭해서 연동을 완료하세요.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
