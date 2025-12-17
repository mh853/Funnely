'use client'

import { useEffect, useState } from 'react'
import { Building2, Users, FileText, AlertCircle } from 'lucide-react'
import StatsCard from './components/StatsCard'
import RecentCompanies from './components/RecentCompanies'
import SystemAlerts from './components/SystemAlerts'
import ActivityFeed from './components/ActivityFeed'

interface DashboardStats {
  summary: {
    totalCompanies: number
    activeCompanies: number
    totalUsers: number
    activeUsers30d: number
    totalLeads: number
    leads30d: number
    openTickets: number
    urgentTickets: number
  }
  recentCompanies: Array<{
    id: string
    name: string
    joinedAt: string
    totalUsers: number
    status: 'active' | 'inactive'
  }>
  systemAlerts: Array<{
    type: 'urgent_ticket' | 'unpaid_subscription' | 'system_health'
    count?: number
    severity: 'low' | 'medium' | 'high'
    message: string
    action?: {
      label: string
      href: string
    }
  }>
  recentActivities: Array<{
    id: string
    companyName: string
    activityType: string
    description: string
    createdAt: string
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">
            통계를 불러올 수 없습니다
          </p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">대시보드</h2>
        <p className="text-gray-500 mt-2">
          퍼널리 시스템 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="총 회사"
          value={stats.summary.totalCompanies}
          icon={Building2}
          description={`활성 ${stats.summary.activeCompanies}개`}
        />
        <StatsCard
          title="활성 회사"
          value={stats.summary.activeCompanies}
          icon={Building2}
          description={`${Math.round((stats.summary.activeCompanies / stats.summary.totalCompanies) * 100)}% 활성화율`}
        />
        <StatsCard
          title="총 사용자"
          value={stats.summary.totalUsers}
          icon={Users}
          description={`최근 30일 활성 ${stats.summary.activeUsers30d}명`}
        />
        <StatsCard
          title="신규 리드 (30일)"
          value={stats.summary.leads30d}
          icon={FileText}
          description={`전체 리드 ${stats.summary.totalLeads.toLocaleString()}건`}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <RecentCompanies companies={stats.recentCompanies} />

        {/* System Alerts */}
        <SystemAlerts alerts={stats.systemAlerts} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={stats.recentActivities} />
    </div>
  )
}
