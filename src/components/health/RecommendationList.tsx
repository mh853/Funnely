'use client'

import { LightBulbIcon } from '@heroicons/react/24/outline'
import type { Recommendation } from '@/lib/health/calculateHealthScore'

export type { Recommendation }

interface RecommendationListProps {
  recommendations: Recommendation[]
}

export function RecommendationList({
  recommendations,
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">권장사항</h3>
        <div className="text-center py-8 text-gray-500">
          현재 권장사항이 없습니다
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <LightBulbIcon className="h-5 w-5 text-blue-500" />
        권장사항 ({recommendations.length})
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="rounded-lg border p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(
                    rec.priority
                  )}`}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {rec.action}
            </h4>
            <p className="text-sm text-gray-700 mb-2">{rec.rationale}</p>
            {rec.expected_impact && (
              <div className="mt-3 pl-4 border-l-2 border-blue-200">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  예상 효과:
                </p>
                <p className="text-xs text-gray-600">{rec.expected_impact}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
