'use client'

// Phase 4.2: Bulk Operation Detail Page
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Building2,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type { BulkOperationLog } from '@/types/bulk'

interface OperationDetailResponse {
  operation: BulkOperationLog
}

export default function BulkOperationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [operation, setOperation] = useState<BulkOperationLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOperationDetail()
  }, [params.id])

  async function fetchOperationDetail() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/bulk/operations/${params.id}`)
      if (response.ok) {
        const result: OperationDetailResponse = await response.json()
        setOperation(result.operation)
      } else {
        alert('작업 정보를 찾을 수 없습니다.')
        router.push('/admin/bulk-operations')
      }
    } catch (error) {
      console.error('Failed to fetch operation detail:', error)
      alert('작업 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function getEntityIcon(entityType: string) {
    switch (entityType) {
      case 'lead':
        return <Users className="w-5 h-5" />
      case 'company':
        return <Building2 className="w-5 h-5" />
      case 'subscription':
        return <CreditCard className="w-5 h-5" />
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
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            완료
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            실패
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4" />
            처리 중
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="w-4 h-4" />
            대기
          </span>
        )
      default:
        return <span className="text-sm text-gray-600">{status}</span>
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

  function formatDuration(started: string, completed?: string) {
    if (!completed) return '-'
    const start = new Date(started).getTime()
    const end = new Date(completed).getTime()
    const seconds = Math.floor((end - start) / 1000)
    if (seconds < 60) return `${seconds}초`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}분 ${seconds % 60}초`
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!operation) {
    return null
  }

  const errorDetails = (operation.error_details as any[]) || []

  return (
    <div className="p-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/bulk-operations')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        일괄 작업 이력으로 돌아가기
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              {getEntityIcon(operation.entity_type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {getOperationLabel(operation.operation)}
              </h1>
              <p className="text-gray-600">
                {getEntityLabel(operation.entity_type)} 일괄 작업
              </p>
            </div>
          </div>
          {getStatusBadge(operation.status)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">시작 시간</p>
            <p className="text-base font-medium text-gray-900">
              {new Date(operation.started_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">완료 시간</p>
            <p className="text-base font-medium text-gray-900">
              {operation.completed_at
                ? new Date(operation.completed_at).toLocaleString('ko-KR')
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">소요 시간</p>
            <p className="text-base font-medium text-gray-900">
              {formatDuration(operation.started_at, operation.completed_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">총 개수</p>
            <p className="text-base font-medium text-gray-900">
              {operation.total_count}
            </p>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">총 개수</p>
              <p className="text-3xl font-bold text-gray-900">
                {operation.total_count}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">성공</p>
              <p className="text-3xl font-bold text-green-600">
                {operation.success_count}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {operation.total_count > 0
                  ? Math.round(
                      (operation.success_count / operation.total_count) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">실패</p>
              <p className="text-3xl font-bold text-red-600">
                {operation.failed_count}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {operation.total_count > 0
                  ? Math.round(
                      (operation.failed_count / operation.total_count) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Parameters */}
      {operation.parameters && Object.keys(operation.parameters).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            작업 파라미터
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(operation.parameters, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Error Details */}
      {errorDetails.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            실패 상세 정보 ({errorDetails.length}개)
          </h2>
          <div className="space-y-3">
            {errorDetails.map((error, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-100 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Entity ID: {error.entity_id}
                    </p>
                    <p className="text-sm text-red-700">
                      {error.error_message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
