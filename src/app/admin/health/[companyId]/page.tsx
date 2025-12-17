'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { HealthStatusBadge } from '@/components/health/HealthStatusBadge'
import { HealthScoreTrend } from '@/components/health/HealthScoreTrend'
import { RiskFactorList, RiskFactor } from '@/components/health/RiskFactorList'
import {
  RecommendationList,
  Recommendation,
} from '@/components/health/RecommendationList'

interface HealthScoreDetail {
  id: string
  company: {
    id: string
    name: string
    slug: string
    status: string
  }
  overall_score: number
  engagement_score: number
  product_usage_score: number
  support_score: number
  payment_score: number
  health_status: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  risk_factors: RiskFactor[]
  recommendations: Recommendation[]
  calculated_at: string
  history: Array<{
    calculated_at: string
    overall_score: number
    health_status: string
  }>
}

export default function HealthDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.companyId as string

  const [healthScore, setHealthScore] = useState<HealthScoreDetail | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    fetchHealthScore()
  }, [companyId])

  async function fetchHealthScore() {
    setLoading(true)
    const res = await fetch(`/api/admin/health/${companyId}`)
    const data = await res.json()

    if (data.success) {
      setHealthScore(data.health_score)
    }
    setLoading(false)
  }

  async function handleRecalculate() {
    if (!confirm('건강도 점수를 다시 계산하시겠습니까?')) {
      return
    }

    setRecalculating(true)
    const res = await fetch('/api/admin/health/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    })

    const data = await res.json()

    if (data.success) {
      alert('건강도 점수가 재계산되었습니다.')
      fetchHealthScore()
    } else {
      alert('재계산에 실패했습니다.')
    }
    setRecalculating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!healthScore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">건강도 점수를 찾을 수 없습니다</div>
      </div>
    )
  }

  const componentScores = [
    {
      name: '참여도',
      score: healthScore.engagement_score,
      weight: '35%',
    },
    {
      name: '제품 사용',
      score: healthScore.product_usage_score,
      weight: '30%',
    },
    { name: '고객 지원', score: healthScore.support_score, weight: '20%' },
    { name: '결제', score: healthScore.payment_score, weight: '15%' },
  ]

  function getScoreColor(score: number): string {
    if (score >= 80) return 'bg-blue-500'
    if (score >= 60) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/health')}
            className="rounded-lg p-2 hover:bg-gray-100 transition"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {healthScore.company.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              고객 건강도 점수 상세
            </p>
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {recalculating ? '재계산 중...' : '점수 재계산'}
        </button>
      </div>

      {/* Overall Score Card */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">전체 건강도 점수</h2>
          <HealthStatusBadge status={healthScore.health_status} size="lg" />
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-5xl font-bold text-gray-900">
            {healthScore.overall_score}
          </span>
          <span className="text-2xl text-gray-500 mb-2">/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${getScoreColor(
              healthScore.overall_score
            )}`}
            style={{ width: `${healthScore.overall_score}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          마지막 계산:{' '}
          {new Date(healthScore.calculated_at).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* Component Scores */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {componentScores.map((component) => (
          <div key={component.name} className="rounded-lg border bg-white p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {component.name}
              </p>
              <span className="text-xs text-gray-500">{component.weight}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {component.score}
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getScoreColor(
                  component.score
                )}`}
                style={{ width: `${component.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 30-Day Trend */}
      {healthScore.history && healthScore.history.length > 0 && (
        <HealthScoreTrend history={healthScore.history} />
      )}

      {/* Risk Factors and Recommendations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RiskFactorList riskFactors={healthScore.risk_factors} />
        <RecommendationList recommendations={healthScore.recommendations} />
      </div>
    </div>
  )
}
