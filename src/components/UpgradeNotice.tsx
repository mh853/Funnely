'use client'

import Link from 'next/link'
import { LockClosedIcon, ArrowUpIcon } from '@heroicons/react/24/outline'

interface UpgradeNoticeProps {
  featureName: string
  requiredPlan?: string
}

export default function UpgradeNotice({ featureName, requiredPlan }: UpgradeNoticeProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <LockClosedIcon className="h-8 w-8 text-blue-600" />
        </div>

        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          업그레이드가 필요합니다
        </h2>

        <p className="mt-3 text-gray-600">
          <span className="font-semibold">{featureName}</span> 기능은 현재 플랜에서 사용할 수 없습니다.
        </p>

        {requiredPlan && (
          <p className="mt-2 text-sm text-gray-500">
            이 기능을 사용하려면 <span className="font-semibold">{requiredPlan}</span> 이상의 플랜이 필요합니다.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <ArrowUpIcon className="h-5 w-5" />
            플랜 업그레이드
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            대시보드로 돌아가기
          </Link>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">플랜별 기능 비교</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 개인 플랜: 대시보드, DB 현황</li>
            <li>• 개인 + 스케줄: DB/예약 스케줄, 분석, 리포트</li>
            <li>• 소규모 기업: 3명, 3페이지 + 모든 기능</li>
            <li>• 성장 기업: 20명, 20페이지 + 우선 지원</li>
            <li>• 대규모 조직: 무제한 + 커스터마이징</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
