'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building2,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'

interface AuditLog {
  id: string
  userId: string | null
  userName: string
  userEmail: string | null
  companyId: string | null
  companyName: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  createdAt: string
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  })

  // 필터 상태
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })

  // 상세 모달
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // 로그 조회
  const fetchLogs = async (offset = 0) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      })

      if (filters.search) params.append('search', filters.search)
      if (filters.action) params.append('action', filters.action)
      if (filters.entityType) params.append('entityType', filters.entityType)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // 필터 적용
  const applyFilters = () => {
    fetchLogs(0)
  }

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    })
    fetchLogs(0)
  }

  // 페이지 이동
  const goToPage = (newOffset: number) => {
    fetchLogs(newOffset)
  }

  // 액션 레이블 포맷
  const formatAction = (action: string) => {
    const labels: Record<string, string> = {
      'company.create': '회사 생성',
      'company.update': '회사 수정',
      'company.delete': '회사 삭제',
      'user.create': '사용자 생성',
      'user.update': '사용자 수정',
      'user.delete': '사용자 삭제',
      'lead.create': '리드 생성',
      'lead.update': '리드 수정',
      'lead.export': '리드 내보내기',
      'admin.login': '관리자 로그인',
      'admin.logout': '관리자 로그아웃',
    }
    return labels[action] || action
  }

  // CSV 내보내기
  const exportToCSV = () => {
    const csvHeaders = [
      '날짜',
      '사용자',
      '이메일',
      '회사',
      '작업',
      '대상 타입',
      '대상 ID',
      'IP 주소',
    ]
    const csvRows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString('ko-KR'),
      log.userName,
      log.userEmail || '',
      log.companyName || '',
      formatAction(log.action),
      log.entityType || '',
      log.entityId || '',
      log.ipAddress,
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">
            감사 로그를 불러올 수 없습니다
          </p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">감사 로그</h2>
        <p className="text-gray-500 mt-2">
          모든 관리자 작업을 추적하고 감사합니다
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 검색 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              검색 (IP 또는 User Agent)
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="검색어 입력..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 작업 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Activity className="w-4 h-4 inline mr-1" />
              작업 타입
            </label>
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="company.create">회사 생성</option>
              <option value="company.update">회사 수정</option>
              <option value="user.create">사용자 생성</option>
              <option value="user.update">사용자 수정</option>
              <option value="lead.export">리드 내보내기</option>
              <option value="admin.login">관리자 로그인</option>
            </select>
          </div>

          {/* 시작 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              시작 날짜
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 종료 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              종료 날짜
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={applyFilters}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            필터 적용
          </button>
          <button
            onClick={resetFilters}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            초기화
          </button>
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 로그</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pagination.total.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">현재 페이지</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Math.floor(pagination.offset / pagination.limit) + 1}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">표시 중</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {logs.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜/시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  대상
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP 주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.createdAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.userEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.entityType && (
                      <div>
                        <div className="font-medium">{log.entityType}</div>
                        <div className="text-xs truncate max-w-[150px]">
                          {log.entityId}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLog(log)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            총 <span className="font-medium">{pagination.total}</span>개 중{' '}
            <span className="font-medium">{pagination.offset + 1}</span> -{' '}
            <span className="font-medium">
              {Math.min(
                pagination.offset + pagination.limit,
                pagination.total
              )}
            </span>
            번째 표시
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(pagination.offset - pagination.limit)}
              disabled={pagination.offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <button
              onClick={() => goToPage(pagination.offset + pagination.limit)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  감사 로그 상세
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">날짜/시간</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">작업</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatAction(selectedLog.action)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">사용자</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.userName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedLog.userEmail}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">회사</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.companyName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">대상 타입</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.entityType || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">대상 ID</p>
                  <p className="text-sm text-gray-900 mt-1 break-all">
                    {selectedLog.entityId || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">IP 주소</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedLog.ipAddress}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    User Agent
                  </p>
                  <p className="text-sm text-gray-900 mt-1 break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    추가 정보 (Metadata)
                  </p>
                  <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
