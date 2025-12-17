'use client'

import { formatCurrency, formatPercentage } from '@/lib/revenue/calculations'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

interface PreventableChurnCardProps {
  analysis: {
    preventable_count: number
    preventable_percentage: number
    potential_saved_mrr: number
  }
}

export default function PreventableChurnCard({
  analysis,
}: PreventableChurnCardProps) {
  const { preventable_count, preventable_percentage, potential_saved_mrr } =
    analysis

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheckIcon className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          예방 가능 이탈 분석
        </h3>
      </div>

      <div className="space-y-4">
        {/* 예방 가능 이탈 비율 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">예방 가능 비율</span>
            <span className="text-2xl font-bold text-green-600">
              {formatPercentage(preventable_percentage)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${Math.min(preventable_percentage, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* 예방 가능 이탈 수 */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">예방 가능 이탈 수</span>
          <span className="text-xl font-semibold text-gray-900">
            {preventable_count}개 회사
          </span>
        </div>

        {/* 잠재 절감 MRR */}
        <div className="flex items-center justify-between py-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">잠재 절감 MRR</span>
          <span className="text-xl font-semibold text-green-600">
            {formatCurrency(potential_saved_mrr)}
          </span>
        </div>

        {/* 설명 */}
        <div className="bg-green-50 rounded-lg p-4 mt-4">
          <p className="text-sm text-green-800">
            💡 이탈 고객 중 {formatPercentage(preventable_percentage)}는 고객
            건강도 점수가 사전에 하락했습니다. 조기 개입으로{' '}
            {formatCurrency(potential_saved_mrr)}의 MRR을 보존할 수 있었습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
