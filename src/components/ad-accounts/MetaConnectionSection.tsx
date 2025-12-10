'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MetaConnectionGuide from './MetaConnectionGuide'
import { ExclamationTriangleIcon, Cog6ToothIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface MetaConnectionSectionProps {
  hasMetaAccount: boolean
  canManage: boolean
}

interface ApiError {
  error: string
  needsSetup?: boolean
  setupUrl?: string
}

export default function MetaConnectionSection({ hasMetaAccount, canManage }: MetaConnectionSectionProps) {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [setupRequired, setSetupRequired] = useState<ApiError | null>(null)

  const handleStartConnection = async () => {
    setIsConnecting(true)
    setSetupRequired(null)

    try {
      const response = await fetch('/api/ad-accounts/connect/meta', {
        method: 'GET',
      })

      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else if (data.needsSetup) {
        // API 설정이 필요한 경우
        setSetupRequired(data)
        setIsConnecting(false)
      } else {
        throw new Error(data.error || '인증 URL을 받지 못했습니다.')
      }
    } catch (error: any) {
      console.error('Connection error:', error)
      alert(error.message || '계정 연동에 실패했습니다. 다시 시도해주세요.')
      setIsConnecting(false)
    }
  }

  // 이미 Meta 계정이 연동되어 있거나 관리 권한이 없으면 표시 안 함
  if (hasMetaAccount || !canManage) {
    return null
  }

  // API 설정이 필요한 경우 친절한 안내 표시
  if (setupRequired) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Cog6ToothIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Meta API 설정이 필요합니다</h2>
              <p className="text-amber-100 text-sm mt-1">
                광고 계정 연동 전에 먼저 API 인증 정보를 설정해야 합니다
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* 안내 메시지 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">왜 설정이 필요한가요?</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Meta 광고 계정을 연동하려면 먼저 Meta Business에서 발급받은 App ID와 App Secret을 시스템에 등록해야 합니다.
                  이 정보가 있어야 Facebook/Instagram 광고 데이터에 안전하게 접근할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 설정 단계 안내 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API 설정 방법</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Meta for Developers 접속</h4>
                  <p className="text-sm text-gray-600">
                    <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      developers.facebook.com
                    </a>에 접속하여 앱을 생성합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">App ID와 App Secret 복사</h4>
                  <p className="text-sm text-gray-600">
                    생성된 앱의 설정에서 App ID와 App Secret을 복사합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Funnely에 등록</h4>
                  <p className="text-sm text-gray-600">
                    아래 버튼을 클릭하여 API 설정 페이지에서 복사한 정보를 입력합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(setupRequired.setupUrl || '/dashboard/settings/api-credentials')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span>API 설정하러 가기</span>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSetupRequired(null)}
              className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              돌아가기
            </button>
          </div>

          {/* 도움말 */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-2">도움이 필요하신가요?</h4>
            <p className="text-sm text-gray-600">
              Meta 앱 생성이 처음이시라면 관리자에게 문의해주세요. 회사 대표 계정으로 한 번만 설정하면 모든 팀원이 광고 계정을 연동할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MetaConnectionGuide
      onStartConnection={handleStartConnection}
      isConnecting={isConnecting}
    />
  )
}
