'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AutomationWorkflow } from '@/types/automation'

interface WorkflowsResponse {
  workflows: AutomationWorkflow[]
  total: number
}

export default function WorkflowsPage() {
  const [data, setData] = useState<WorkflowsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  async function fetchWorkflows() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/workflows')

      if (!response.ok) {
        throw new Error('Failed to fetch workflows')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching workflows:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load workflows'
      )
    } finally {
      setLoading(false)
    }
  }

  async function toggleWorkflow(id: string) {
    try {
      const response = await fetch(`/api/admin/workflows/${id}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to toggle workflow')
      }

      fetchWorkflows() // Refresh list
    } catch (err) {
      console.error('Error toggling workflow:', err)
      alert('워크플로우 상태 변경에 실패했습니다')
    }
  }

  async function executeWorkflow(id: string) {
    if (!confirm('이 워크플로우를 실행하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/workflows/${id}/execute`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to execute workflow')
      }

      const result = await response.json()
      alert(`워크플로우 실행이 시작되었습니다!\n실행 ID: ${result.execution_id}`)
    } catch (err) {
      console.error('Error executing workflow:', err)
      alert('워크플로우 실행에 실패했습니다')
    }
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('이 워크플로우를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/workflows/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete workflow')
      }

      fetchWorkflows() // Refresh list
    } catch (err) {
      console.error('Error deleting workflow:', err)
      alert('워크플로우 삭제에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">워크플로우 로딩 중...</p>
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
            onClick={fetchWorkflows}
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
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">자동화 워크플로우</h1>
          <p className="mt-1 text-sm text-gray-500">
            트리거 조건 기반 자동 실행 워크플로우 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/workflows/executions"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            실행 로그
          </Link>
          <Link
            href="/admin/workflows/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 새 워크플로우
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">총 워크플로우</p>
          <p className="text-2xl font-bold text-gray-900">{data.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-sm text-green-600">활성 워크플로우</p>
          <p className="text-2xl font-bold text-green-700">
            {data.workflows.filter((w) => w.is_active).length}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">비활성 워크플로우</p>
          <p className="text-2xl font-bold text-gray-700">
            {data.workflows.filter((w) => !w.is_active).length}
          </p>
        </div>
      </div>

      {/* Workflows Grid */}
      {data.workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">워크플로우가 없습니다.</p>
          <Link
            href="/admin/workflows/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            첫 워크플로우 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    workflow.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {workflow.is_active ? '활성' : '비활성'}
                </span>
              </div>

              {workflow.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {workflow.description}
                </p>
              )}

              <div className="mb-4 space-y-2">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 w-20">트리거:</span>
                  <span className="font-medium">
                    {workflow.trigger_type === 'schedule'
                      ? '스케줄'
                      : workflow.trigger_type === 'event'
                        ? '이벤트'
                        : '조건'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 w-20">액션:</span>
                  <span className="font-medium">
                    {workflow.actions.length}개
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => executeWorkflow(workflow.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  실행
                </button>
                <button
                  onClick={() => toggleWorkflow(workflow.id)}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  {workflow.is_active ? '비활성화' : '활성화'}
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
