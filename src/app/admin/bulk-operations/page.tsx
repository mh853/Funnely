'use client'

// Phase 4.2: Bulk Operations History Page
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Building2,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type { BulkOperationLog } from '@/types/bulk'

interface OperationsResponse {
  operations: BulkOperationLog[]
  total: number
  limit: number
  offset: number
}

export default function BulkOperationsPage() {
  const [data, setData] = useState<OperationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchOperations()
  }, [entityTypeFilter, statusFilter])

  async function fetchOperations() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (entityTypeFilter !== 'all') params.set('entity_type', entityTypeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const response = await fetch(`/api/admin/bulk/operations?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch operations:', error)
    } finally {
      setLoading(false)
    }
  }

  function getEntityIcon(entityType: string) {
    switch (entityType) {
      case 'lead':
        return <Users className="w-4 h-4" />
      case 'company':
        return <Building2 className="w-4 h-4" />
      case 'subscription':
        return <CreditCard className="w-4 h-4" />
      default:
        return null
    }
  }

  function getEntityLabel(entityType: string) {
    switch (entityType) {
      case 'lead':
        return '리드'
      case 'company':
        return '고객사'
      case 'subscription':
        return '구독'
      default:
        return entityType
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            완료
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            실패
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            처리 중
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3" />
            대기
          </span>
        )
      default:
        return <span className="text-xs text-gray-600">{status}</span>
    }
  }

  function getOperationLabel(operation: string) {
    const labels: Record<string, string> = {
      change_status: '상태 변경',
      add_tags: '태그 추가',
      remove_tags: '태그 제거',
      assign: '담당자 할당',
      delete: '삭제',
      add_note: '메모 추가',
      recalculate_health: '헬스 스코어 재계산',
      assign_cs_manager: 'CS 매니저 할당',
      change_plan: '플랜 변경',
      change_billing_cycle: '결제 주기 변경',
      extend_next_billing: '다음 결제일 연장',
    }
    return labels[operation] || operation
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          일괄 작업 이력
        </h1>
        <p className="text-gray-600">
          실행된 일괄 작업의 상세 내역과 결과를 확인할 수 있습니다.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            엔티티 타입
          </label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체</option>
            <option value="lead">리드</option>
            <option value="company">고객사</option>
            <option value="subscription">구독</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체</option>
            <option value="completed">완료</option>
            <option value="failed">실패</option>
            <option value="processing">처리 중</option>
            <option value="pending">대기</option>
          </select>
        </div>
      </div>

      {/* Operations List */}
      <div className="space-y-4">
        {data?.operations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">실행된 일괄 작업이 없습니다.</p>
          </div>
        ) : (
          data?.operations.map((operation) => (
            <Link
              key={operation.id}
              href={`/admin/bulk-operations/${operation.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getEntityIcon(operation.entity_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getOperationLabel(operation.operation)}
                      </h3>
                      <span className="text-sm text-gray-500">
                        · {getEntityLabel(operation.entity_type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(operation.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(operation.status)}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">총 개수</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {operation.total_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">성공</p>
                  <p className="text-lg font-semibold text-green-600">
                    {operation.success_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">실패</p>
                  <p className="text-lg font-semibold text-red-600">
                    {operation.failed_count}
                  </p>
                </div>
              </div>

              {operation.failed_count > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    ⚠️ {operation.failed_count}개 항목 처리 실패 - 클릭하여
                    상세 정보 확인
                  </p>
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Pagination Info */}
      {data && data.total > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          총 {data.total}개의 작업 중 {data.operations.length}개 표시
        </div>
      )}
    </div>
  )
}
