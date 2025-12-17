'use client'

import { useEffect, useState } from 'react'
import { CompanyFeatureAnalysis, FEATURE_CATEGORIES } from '@/types/features'
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'

interface FeaturesTabProps {
  companyId: string
}

export default function FeaturesTab({ companyId }: FeaturesTabProps) {
  const [data, setData] = useState<CompanyFeatureAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFeatureAnalysis()
  }, [companyId])

  async function fetchFeatureAnalysis() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/companies/${companyId}/features`
      )
      if (!response.ok) throw new Error('Failed to fetch feature analysis')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('기능 사용 분석을 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">
          {error || '기능 사용 분석을 불러올 수 없습니다'}
        </p>
      </div>
    )
  }

  const { analysis } = data

  // 카테고리별로 그룹화
  const featuresByCategory = analysis.features.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = []
      }
      acc[feature.category].push(feature)
      return acc
    },
    {} as Record<string, typeof analysis.features>
  )

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">전체 기능</p>
          <p className="text-2xl font-bold">{analysis.total_features}개</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">사용 중인 기능</p>
          <p className="text-2xl font-bold text-blue-600">
            {analysis.used_features}개
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">활용률</p>
          <p className="text-2xl font-bold text-green-600">
            {analysis.adoption_rate}%
          </p>
        </div>
      </div>

      {/* 기능 사용 목록 */}
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">기능 사용 현황</h3>
        </div>
        <div className="p-4 space-y-6">
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {FEATURE_CATEGORIES[category as keyof typeof FEATURE_CATEGORIES]}
              </h4>
              <div className="space-y-2">
                {features.map((feature) => (
                  <div
                    key={feature.feature_name}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {feature.is_used ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {feature.display_name}
                        </p>
                        {feature.is_used && (
                          <p className="text-xs text-gray-500">
                            사용 횟수: {feature.usage_count}회
                            {feature.last_used_at && (
                              <> · 마지막 사용:{' '}
                                {new Date(
                                  feature.last_used_at
                                ).toLocaleDateString('ko-KR')}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    {feature.is_used && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          활성 사용자: {feature.unique_users}명
                        </p>
                        {feature.adoption_rate > 0 && (
                          <p className="text-xs text-gray-500">
                            활용률: {Math.round(feature.adoption_rate)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 권장사항 */}
      {analysis.recommendations.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-yellow-500" />
              권장사항 ({analysis.recommendations.length})
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(
                          rec.priority
                        )}`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-semibold">
                        {rec.display_name}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-700">{rec.reason}</p>
                  </div>
                </div>
                <p className="text-sm text-blue-600 font-medium mt-2">
                  💡 {rec.benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
