'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SimpleStatsCard from '../components/SimpleStatsCard'
import TrendsChart from '../components/TrendsChart'
import TopCompaniesTable from '../components/TopCompaniesTable'
import ActivityFeed from '../components/ActivityFeed'

interface DashboardData {
  trends: Array<{
    date: string
    companies: number
    users: number
    leads: number
  }>
  summary: {
    totalCompanies: number
    activeCompanies: number
    totalUsers: number
    activeUsers: number
    totalLeads: number
    leadsLast30d: number
    totalPages: number
    publishedPages: number
    companyGrowth: string
    userGrowth: string
  }
  topCompanies: Array<{
    id: string
    name: string
    totalUsers: number
    totalLeads: number
    leadsLast30d: number
    totalPages: number
    growth: string
  }>
  recentActivities: Array<{
    id: string
    activityType: string
    description: string
    companyName: string
    createdAt: string
  }>
}

export default function EnhancedDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const response = await fetch('/admin/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('대시보드 데이터를 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(type: 'companies' | 'users' | 'leads') {
    try {
      setExporting(true)
      const response = await fetch(`/admin/api/export?type=${type}&format=csv`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('내보내기에 실패했습니다')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error || '데이터를 불러올 수 없습니다'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">
            시스템 전체 통계 및 성과 분석
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('companies')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                회사 데이터 (CSV)
              </button>
              <button
                onClick={() => handleExport('users')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                사용자 데이터 (CSV)
              </button>
              <button
                onClick={() => handleExport('leads')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                리드 데이터 (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SimpleStatsCard
          title="전체 회사"
          value={data.summary.totalCompanies}
          subtitle={`활성: ${data.summary.activeCompanies}개`}
          trend={`${data.summary.companyGrowth}% 활성`}
          trendUp={parseFloat(data.summary.companyGrowth) > 50}
        />
        <SimpleStatsCard
          title="전체 사용자"
          value={data.summary.totalUsers}
          subtitle={`활성: ${data.summary.activeUsers}명`}
          trend={`${data.summary.userGrowth}% 활성`}
          trendUp={parseFloat(data.summary.userGrowth) > 50}
        />
        <SimpleStatsCard
          title="전체 리드"
          value={data.summary.totalLeads}
          subtitle={`최근 30일: ${data.summary.leadsLast30d}개`}
          trend={`${((data.summary.leadsLast30d / Math.max(data.summary.totalLeads, 1)) * 100).toFixed(1)}% 최근`}
          trendUp={data.summary.leadsLast30d > 0}
        />
        <SimpleStatsCard
          title="랜딩페이지"
          value={data.summary.totalPages}
          subtitle={`발행: ${data.summary.publishedPages}개`}
          trend={`${((data.summary.publishedPages / Math.max(data.summary.totalPages, 1)) * 100).toFixed(1)}% 발행`}
          trendUp={data.summary.publishedPages > 0}
        />
      </div>

      {/* 성장 추이 그래프 */}
      <TrendsChart data={data.trends} />

      {/* 상위 활성 회사 */}
      <TopCompaniesTable companies={data.topCompanies} />

      {/* 최근 활동 */}
      <ActivityFeed activities={data.recentActivities} />
    </div>
  )
}
