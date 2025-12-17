import Link from 'next/link'
import { HealthStatusBadge } from './HealthStatusBadge'

interface HealthScoreCardProps {
  companyId: string
  companyName: string
  overallScore: number
  healthStatus: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  componentScores: {
    engagement: number
    productUsage: number
    support: number
    payment: number
  }
  riskFactorCount: number
  recommendationCount: number
  calculatedAt: string
}

export function HealthScoreCard({
  companyId,
  companyName,
  overallScore,
  healthStatus,
  componentScores,
  riskFactorCount,
  recommendationCount,
  calculatedAt,
}: HealthScoreCardProps) {
  const timeAgo = getTimeAgo(calculatedAt)

  return (
    <Link
      href={`/admin/health/${companyId}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{companyName}</h3>
          <p className="text-sm text-gray-500">{timeAgo} 업데이트</p>
        </div>
        <HealthStatusBadge status={healthStatus} />
      </div>

      {/* Overall Score */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">
            {overallScore}
          </span>
          <span className="text-gray-500">/100</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full ${getScoreColor(overallScore)}`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Component Scores */}
      <div className="mb-4 grid grid-cols-4 gap-3 text-sm">
        <ScorePill label="참여도" score={componentScores.engagement} />
        <ScorePill label="제품사용" score={componentScores.productUsage} />
        <ScorePill label="고객지원" score={componentScores.support} />
        <ScorePill label="결제" score={componentScores.payment} />
      </div>

      {/* Alerts */}
      {(riskFactorCount > 0 || recommendationCount > 0) && (
        <div className="flex items-center gap-4 border-t pt-3 text-sm">
          {riskFactorCount > 0 && (
            <span className="text-red-600">
              🚨 {riskFactorCount}개 리스크
            </span>
          )}
          {recommendationCount > 0 && (
            <span className="text-blue-600">
              💡 {recommendationCount}개 권장사항
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function ScorePill({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-1 text-center">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="font-semibold text-gray-900">{score}</div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-blue-500'
  if (score >= 60) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 30) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}
