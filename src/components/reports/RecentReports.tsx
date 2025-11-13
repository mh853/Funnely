'use client'

import { DocumentArrowDownIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface Report {
  id: string
  report_type: string
  format: string
  start_date: string
  end_date: string
  campaign_count: number
  file_url: string | null
  created_at: string
}

interface RecentReportsProps {
  reports: Report[]
  hospitalId: string
}

const reportTypeLabels: Record<string, string> = {
  campaign_summary: '캠페인 요약',
  performance_detail: '성과 상세',
  budget_analysis: '예산 분석',
  conversion_report: '전환 리포트',
}

export default function RecentReports({ reports, hospitalId }: RecentReportsProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (reportId: string) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return

    setDeleting(reportId)
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.')
      }

      window.location.reload()
    } catch (error) {
      alert('삭제에 실패했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (report: Report) => {
    if (!report.file_url) return

    try {
      const response = await fetch(report.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${report.id}.${report.format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert('다운로드에 실패했습니다.')
    }
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">최근 생성 리포트</h3>
        <div className="text-center py-12">
          <DocumentArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">생성된 리포트가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">위에서 새 리포트를 생성해보세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">최근 생성 리포트</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  리포트 유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  캠페인 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  형식
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {reportTypeLabels[report.report_type] || report.report_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.start_date).toLocaleDateString('ko-KR')} ~{' '}
                    {new Date(report.end_date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.campaign_count}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {report.format === 'excel' ? 'Excel' : 'PDF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {report.file_url && (
                        <button
                          onClick={() => handleDownload(report)}
                          className="text-blue-600 hover:text-blue-900"
                          title="다운로드"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(report.id)}
                        disabled={deleting === report.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="삭제"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
