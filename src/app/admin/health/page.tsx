'use client'

import { useState, useEffect } from 'react'
import { HealthScoreCard } from '@/components/health/HealthScoreCard'

interface HealthScore {
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
  risk_factors: any[]
  recommendations: any[]
  calculated_at: string
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
    critical: healthScores.filter((s) => s.health_status === 'critical').length,
    at_risk: healthScores.filter((s) => s.health_status === 'at_risk').length,
    healthy: healthScores.filter((s) => s.health_status === 'healthy').length,
    excellent: healthScores.filter((s) => s.health_status === 'excellent').length,
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
        <h1 className="text-2xl font-bold text-gray-900">Customer Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor customer health scores and identify at-risk accounts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard
          label="Critical"
          count={stats.critical}
          color="red"
          active={filter === 'critical'}
          onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
        />
        <StatCard
          label="At Risk"
          count={stats.at_risk}
          color="yellow"
          active={filter === 'at_risk'}
          onClick={() => setFilter(filter === 'at_risk' ? 'all' : 'at_risk')}
        />
        <StatCard
          label="Healthy"
          count={stats.healthy}
          color="green"
          active={filter === 'healthy'}
          onClick={() => setFilter(filter === 'healthy' ? 'all' : 'healthy')}
        />
        <StatCard
          label="Excellent"
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
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredScores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No health scores found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredScores.map((score) => (
            <HealthScoreCard
              key={score.id}
              companyId={score.company.id}
              companyName={score.company.name}
              overallScore={score.overall_score}
              healthStatus={score.health_status}
              componentScores={{
                engagement: score.engagement_score,
                productUsage: score.product_usage_score,
                support: score.support_score,
                payment: score.payment_score,
              }}
              riskFactorCount={score.risk_factors.length}
              recommendationCount={score.recommendations.length}
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
