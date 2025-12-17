'use client'

import { useEffect, useState } from 'react'
import type { GrowthOpportunitiesResponse } from '@/types/growth'

export default function GrowthOpportunitiesPage() {
  const [data, setData] = useState<GrowthOpportunitiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'active',
    minConfidence: '50',
  })

  useEffect(() => {
    fetchOpportunities()
  }, [filter])

  async function fetchOpportunities() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        type: filter.type,
        status: filter.status,
        min_confidence: filter.minConfidence,
      })

      const response = await fetch(
        `/api/admin/growth-opportunities?${params}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch growth opportunities')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching growth opportunities:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load growth opportunities'
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
          <p className="mt-4 text-gray-600">성장 기회 로딩 중...</p>
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
            onClick={fetchOpportunities}
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">성장 기회</h1>
        <p className="mt-1 text-sm text-gray-500">
          업셀 기회 및 다운셀 위험을 식별하고 관리합니다
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">총 기회</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.summary.total_opportunities}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-sm text-green-600">업셀 기회</p>
          <p className="text-2xl font-bold text-green-700">
            {data.summary.upsell_count}
          </p>
          <p className="text-xs text-green-600 mt-1">
            +{data.summary.total_potential_mrr.toLocaleString()}원 잠재 MRR
          </p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <p className="text-sm text-red-600">다운셀 위험</p>
          <p className="text-2xl font-bold text-red-700">
            {data.summary.downsell_risk_count}
          </p>
          <p className="text-xs text-red-600 mt-1">
            -{data.summary.total_at_risk_mrr.toLocaleString()}원 위험 MRR
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <p className="text-sm text-blue-600">평균 신뢰도</p>
          <p className="text-2xl font-bold text-blue-700">
            {data.summary.avg_confidence_score}%
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기회 유형
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="upsell">업셀 기회</option>
              <option value="downsell_risk">다운셀 위험</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={filter.status}
              onChange={(e) =>
                setFilter({ ...filter, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="contacted">연락함</option>
              <option value="converted">전환됨</option>
              <option value="dismissed">무시됨</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최소 신뢰도
            </label>
            <select
              value={filter.minConfidence}
              onChange={(e) =>
                setFilter({ ...filter, minConfidence: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">0%</option>
              <option value="50">50%</option>
              <option value="70">70%</option>
              <option value="85">85%</option>
            </select>
          </div>
        </div>
      </div>

      {/* 기회 목록 */}
      {data.opportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">조건에 맞는 성장 기회가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랜 변경
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신뢰도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주요 신호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MRR 영향
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {opp.company.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        opp.opportunity_type === 'upsell'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {opp.opportunity_type === 'upsell'
                        ? '업셀 기회'
                        : '다운셀 위험'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {opp.current_plan} →{' '}
                    {opp.recommended_plan || '검토 필요'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {opp.confidence_score}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {opp.signals.slice(0, 2).map((signal, idx) => (
                        <div key={idx} className="truncate max-w-xs">
                          • {signal.message}
                        </div>
                      ))}
                      {opp.signals.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{opp.signals.length - 2}개 더
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {opp.estimated_additional_mrr && (
                      <span className="text-green-600 font-medium">
                        +{opp.estimated_additional_mrr.toLocaleString()}원
                      </span>
                    )}
                    {opp.potential_lost_mrr && (
                      <span className="text-red-600 font-medium">
                        -{opp.potential_lost_mrr.toLocaleString()}원
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
