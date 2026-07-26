'use client'

import { useState, useEffect } from 'react'
import { HealthScoreCard } from '@/components/health/HealthScoreCard'

// 2025-12-21 커밋(7ca2603)에서 API(route.ts)는 실제 DB 스키마(score/risk_level/metrics)에
// 맞게 고쳐졌지만 이 페이지는 이전 스키마(overall_score/health_status 등 최상위 컬럼) 그대로
// 방치되어 있었다. 실제 값은 route.ts가 그대로 통과시키는 metrics JSONB 안에
// 들어있다(calculateHealthScore.ts의 toCustomerHealthScoreRow 참고).
interface HealthScore {
  id: string
  company: {
    id: string
    name: string
    short_id: string
    is_active: boolean
  }
  score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  metrics: {
    engagement_score?: number
    product_usage_score?: number
    support_score?: number
    payment_score?: number
    health_status?: 'critical' | 'at_risk' | 'healthy' | 'excellent'
    risk_factors?: any[]
    recommendations?: any[]
  }
  calculated_at: string
}

// metrics.health_status가 없는(과거) 데이터를 위한 risk_level 기반 대체 매핑
const RISK_LEVEL_TO_STATUS: Record<string, HealthScore['metrics']['health_status']> = {
  critical: 'critical',
  high: 'at_risk',
  medium: 'at_risk',
  low: 'healthy',
}

function getHealthStatus(s: HealthScore): NonNullable<HealthScore['metrics']['health_status']> {
  return s.metrics?.health_status || RISK_LEVEL_TO_STATUS[s.risk_level] || 'healthy'
}

export default function HealthDashboardPage() {
  const [healthScores, setHealthScores] = useState<HealthScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchHealthScores()
  }, [filter])

  async function fetchHealthScores() {
    setLoading(true)
    const params = new URLSearchParams({
      limit: '50',
      offset: '0',
      ...(filter !== 'all' && { healthStatus: filter }),
    })

    const res = await fetch(`/api/admin/health?${params}`)
    const data = await res.json()

    if (data.success) {
      setHealthScores(data.health_scores)
    }
    setLoading(false)
  }

  const stats = {
    critical: healthScores.filter((s) => getHealthStatus(s) === 'critical').length,
    at_risk: healthScores.filter((s) => getHealthStatus(s) === 'at_risk').length,
    healthy: healthScores.filter((s) => getHealthStatus(s) === 'healthy').length,
    excellent: healthScores.filter((s) => getHealthStatus(s) === 'excellent').length,
  }

  const filteredScores = search
    ? healthScores.filter((s) =>
        s.company.name.toLowerCase().includes(search.toLowerCase())
      )
    : healthScores

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">고객 건강도</h1>
        <p className="mt-1 text-sm text-gray-500">
          고객 건강도 점수를 모니터링하고 위험 고객을 식별합니다
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard
          label="위험"
          count={stats.critical}
          color="red"
          active={filter === 'critical'}
          onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
        />
        <StatCard
          label="주의 필요"
          count={stats.at_risk}
          color="yellow"
          active={filter === 'at_risk'}
          onClick={() => setFilter(filter === 'at_risk' ? 'all' : 'at_risk')}
        />
        <StatCard
          label="건강"
          count={stats.healthy}
          color="green"
          active={filter === 'healthy'}
          onClick={() => setFilter(filter === 'healthy' ? 'all' : 'healthy')}
        />
        <StatCard
          label="우수"
          count={stats.excellent}
          color="blue"
          active={filter === 'excellent'}
          onClick={() => setFilter(filter === 'excellent' ? 'all' : 'excellent')}
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="회사 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : filteredScores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          건강도 점수가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredScores.map((score) => (
            <HealthScoreCard
              key={score.id}
              companyId={score.company.id}
              companyName={score.company.name}
              overallScore={score.score}
              healthStatus={getHealthStatus(score)}
              componentScores={{
                engagement: score.metrics?.engagement_score ?? 0,
                productUsage: score.metrics?.product_usage_score ?? 0,
                support: score.metrics?.support_score ?? 0,
                payment: score.metrics?.payment_score ?? 0,
              }}
              riskFactorCount={score.metrics?.risk_factors?.length ?? 0}
              recommendationCount={score.metrics?.recommendations?.length ?? 0}
              calculatedAt={score.calculated_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  count: number
  color: 'red' | 'yellow' | 'green' | 'blue'
  active: boolean
  onClick: () => void
}

function StatCard({ label, count, color, active, onClick }: StatCardProps) {
  const colors = {
    red: active
      ? 'bg-red-100 border-red-500 text-red-900'
      : 'bg-white border-red-200 text-red-700 hover:bg-red-50',
    yellow: active
      ? 'bg-yellow-100 border-yellow-500 text-yellow-900'
      : 'bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-50',
    green: active
      ? 'bg-green-100 border-green-500 text-green-900'
      : 'bg-white border-green-200 text-green-700 hover:bg-green-50',
    blue: active
      ? 'bg-blue-100 border-blue-500 text-blue-900'
      : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-5 text-left transition ${colors[color]}`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{count}</p>
    </button>
  )
}
