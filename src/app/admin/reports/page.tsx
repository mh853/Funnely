'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  Building2,
  User,
} from 'lucide-react'
import { format } from 'date-fns'

interface Report {
  id: string
  name: string
  period_start: string
  period_end: string
  generated_at: string
  template: {
    id: string
    name: string
    type: string
  }
  company: {
    id: string
    name: string
  } | null
  generated_by_user: {
    id: string
    full_name: string
  } | null
}

interface ReportsData {
  reports: Report[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const TYPE_LABELS: Record<string, string> = {
  conversion: '전환 분석',
  performance: '성과 분석',
  roi: 'ROI 분석',
  channel: '채널 분석',
  custom: '커스텀',
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchReports()
  }, [page])

  async function fetchReports() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      const response = await fetch(`/api/admin/reports?${params}`)
      if (!response.ok) throw new Error('Failed to fetch reports')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(reportId: string, reportName: string) {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/export`)
      if (!response.ok) throw new Error('Failed to export report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportName}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('리포트 내보내기에 실패했습니다')
    }
  }

  async function handleDelete(reportId: string) {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete report')

      fetchReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('리포트 삭제에 실패했습니다')
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">데이터를 불러올 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">리포트 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            생성된 리포트를 조회하고 다운로드합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            새 리포트 생성
          </Button>
        </div>
      </div>

      {/* 리포트 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전체 리포트</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {data.pagination.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">이번 달</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {data.reports.filter(r => {
                const generated = new Date(r.generated_at)
                const now = new Date()
                return generated.getMonth() === now.getMonth() &&
                  generated.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">이번 주</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {data.reports.filter(r => {
                const generated = new Date(r.generated_at)
                const now = new Date()
                const weekStart = new Date(now)
                weekStart.setDate(now.getDate() - now.getDay())
                return generated >= weekStart
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">오늘</div>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              {data.reports.filter(r => {
                const generated = new Date(r.generated_at)
                const now = new Date()
                return generated.toDateString() === now.toDateString()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 리포트 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>
            리포트 목록 ({data.pagination.total.toLocaleString()}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{report.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(report.period_start), 'yyyy.MM.dd')} -{' '}
                          {format(new Date(report.period_end), 'yyyy.MM.dd')}
                        </div>
                        {report.company && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {report.company.name}
                          </div>
                        )}
                        {report.generated_by_user && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {report.generated_by_user.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {TYPE_LABELS[report.template.type] || report.template.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      생성일: {format(new Date(report.generated_at), 'yyyy.MM.dd HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(report.id, report.name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(report.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {data.reports.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                생성된 리포트가 없습니다
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                전체 {data.pagination.total.toLocaleString()}개 중{' '}
                {((page - 1) * 20 + 1).toLocaleString()}-
                {Math.min(page * 20, data.pagination.total).toLocaleString()}개
                표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
