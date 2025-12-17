'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export interface RiskFactor {
  type: string
  severity: 'high' | 'medium' | 'low'
  description: string
  metric?: string
  threshold?: string
  current_value?: string
}

interface RiskFactorListProps {
  riskFactors: RiskFactor[]
}

export function RiskFactorList({ riskFactors }: RiskFactorListProps) {
  if (riskFactors.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">리스크 요인</h3>
        <div className="text-center py-8 text-gray-500">
          확인된 리스크 요인이 없습니다
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        리스크 요인 ({riskFactors.length})
      </h3>
      <div className="space-y-3">
        {riskFactors.map((risk, index) => (
          <div
            key={index}
            className="rounded-lg border p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSeverityColor(
                      risk.severity
                    )}`}
                  >
                    {risk.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {risk.type}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{risk.description}</p>
                {risk.metric && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                    {risk.current_value && (
                      <span>
                        현재값: <strong>{risk.current_value}</strong>
                      </span>
                    )}
                    {risk.threshold && (
                      <span>
                        기준값: <strong>{risk.threshold}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
