'use client'

import { useEffect, useState } from 'react'
import type { ChurnAnalysisResponse } from '@/types/churn'
import ChurnMetricsCard from './components/ChurnMetricsCard'
import ChurnTrendChart from './components/ChurnTrendChart'
import ChurnReasonChart from './components/ChurnReasonChart'
import PreventableChurnCard from './components/PreventableChurnCard'
import AtRiskCompaniesTable from './components/AtRiskCompaniesTable'

export default function ChurnAnalysisPage() {
  const [data, setData] = useState<ChurnAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>(
    'monthly'
  )

  useEffect(() => {
    fetchChurnAnalysis()
  }, [period])

  async function fetchChurnAnalysis() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/churn/analysis?period=${period}`)

      if (!response.ok) {
        throw new Error('Failed to fetch churn analysis')
      }

      const analysisData = await response.json()
      setData(analysisData)
    } catch (err) {
      console.error('Error fetching churn analysis:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load churn analysis'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">이탈 분석 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium">오류가 발생했습니다</p>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={fetchChurnAnalysis}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">데이터를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이탈 분석</h1>
          <p className="mt-1 text-sm text-gray-500">
            구독 취소 패턴을 분석하고 예방 가능한 이탈을 식별합니다
          </p>
        </div>

        {/* 기간 선택 */}
        <select
          value={period}
          onChange={(e) =>
            setPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="monthly">월간</option>
          <option value="quarterly">분기</option>
          <option value="yearly">연간</option>
        </select>
      </div>

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <ChurnMetricsCard
          title="이탈률"
          value={data.current.churn_rate}
          unit="%"
          description={`${data.current.churned_count}개 회사 이탈`}
        />
        <ChurnMetricsCard
          title="손실 MRR"
          value={data.current.lost_mrr}
          unit="원"
          isCurrency
        />
        <ChurnMetricsCard
          title="평균 사용 기간"
          value={data.current.average_tenure_days}
          unit="일"
        />
      </div>

      {/* 트렌드 차트 */}
      {data.trends.last_12_months.length > 0 && (
        <div className="mb-6">
          <ChurnTrendChart data={data.trends.last_12_months} />
        </div>
      )}

      {/* 이탈 사유 & 예방 가능 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChurnReasonChart reasons={data.current.reasons} />
        <PreventableChurnCard analysis={data.current.preventable_analysis} />
      </div>

      {/* 고위험 회사 테이블 */}
      {data.at_risk_companies.length > 0 && (
        <AtRiskCompaniesTable companies={data.at_risk_companies} />
      )}

      {/* Empty State */}
      {data.current.churned_count === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">
            선택한 기간 동안 이탈한 회사가 없습니다.
          </p>
        </div>
      )}
    </div>
  )
}
