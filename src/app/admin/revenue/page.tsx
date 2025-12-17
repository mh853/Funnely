'use client'

import { useEffect, useState } from 'react'
import type { RevenueMetricsResponse } from '@/types/revenue'
import RevenueMetricsCard from './components/RevenueMetricsCard'
import RevenueTrendChart from './components/RevenueTrendChart'
import PlanBreakdownChart from './components/PlanBreakdownChart'

export default function RevenuePage() {
  const [data, setData] = useState<RevenueMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRevenueMetrics()
  }, [])

  async function fetchRevenueMetrics() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/revenue/metrics')

      if (!response.ok) {
        throw new Error('Failed to fetch revenue metrics')
      }

      const metrics = await response.json()
      setData(metrics)
    } catch (err) {
      console.error('Error fetching revenue metrics:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load revenue data'
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
          <p className="mt-4 text-gray-600">수익 데이터 로딩 중...</p>
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
            onClick={fetchRevenueMetrics}
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">수익 대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          MRR, ARR 및 수익 추이를 확인하세요
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RevenueMetricsCard
          title="월간 반복 수익 (MRR)"
          value={data.current.mrr}
          growth={data.current.mrr_growth}
          subtitle="전월 대비"
        />
        <RevenueMetricsCard
          title="연간 반복 수익 (ARR)"
          value={data.current.arr}
          growth={data.current.arr_growth}
          subtitle="전년 대비"
        />
      </div>

      {/* Revenue Trend Chart */}
      {data.trends.last_6_months.length > 0 && (
        <div className="mb-6">
          <RevenueTrendChart data={data.trends.last_6_months} />
        </div>
      )}

      {/* Plan and Billing Breakdown */}
      {(data.breakdown.by_plan.length > 0 ||
        data.breakdown.by_billing_cycle.length > 0) && (
        <PlanBreakdownChart
          planData={data.breakdown.by_plan}
          billingData={data.breakdown.by_billing_cycle}
        />
      )}

      {/* Empty State */}
      {data.breakdown.by_plan.length === 0 &&
        data.breakdown.by_billing_cycle.length === 0 &&
        data.trends.last_6_months.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">
              아직 수익 데이터가 없습니다.
              <br />
              활성 구독이 생성되면 자동으로 표시됩니다.
            </p>
          </div>
        )}
    </div>
  )
}
