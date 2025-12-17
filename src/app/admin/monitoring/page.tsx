'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  Server,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HealthData {
  overallStatus: string
  serviceStatus: Record<string, any>
  serviceMetrics: Record<string, any>
  lastCheck: string
}

interface ErrorStats {
  total: number
  resolved: number
  unresolved: number
  bySeverity: Record<string, number>
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'text-green-600 bg-green-50',
  degraded: 'text-yellow-600 bg-yellow-50',
  down: 'text-red-600 bg-red-50',
}

const STATUS_ICONS: Record<string, any> = {
  healthy: CheckCircle,
  degraded: AlertCircle,
  down: XCircle,
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetchData()
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [healthResponse, errorsResponse] = await Promise.all([
        fetch('/api/admin/monitoring/health'),
        fetch('/api/admin/monitoring/errors'),
      ])

      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setHealth(healthData)
      }

      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json()
        setErrorStats(errorsData.statistics)
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runHealthCheck() {
    try {
      setChecking(true)
      const response = await fetch('/api/admin/monitoring/health', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Health check failed')

      await fetchData()
      alert('헬스체크가 완료되었습니다')
    } catch (error) {
      console.error('Error running health check:', error)
      alert('헬스체크 실행에 실패했습니다')
    } finally {
      setChecking(false)
    }
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const OverallIcon = health?.overallStatus
    ? STATUS_ICONS[health.overallStatus]
    : Activity
  const overallColor = health?.overallStatus
    ? STATUS_COLORS[health.overallStatus]
    : 'text-gray-600 bg-gray-50'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">시스템 모니터링</h2>
          <p className="text-sm text-gray-500 mt-1">
            시스템 상태, 성능 및 에러를 모니터링합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={runHealthCheck} disabled={checking}>
            <Activity className="h-4 w-4 mr-2" />
            {checking ? '확인 중...' : '헬스체크 실행'}
          </Button>
        </div>
      </div>

      {/* 전체 시스템 상태 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-lg ${overallColor}`}>
                <OverallIcon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {health?.overallStatus === 'healthy'
                    ? '정상'
                    : health?.overallStatus === 'degraded'
                    ? '성능 저하'
                    : '장애'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  마지막 확인:{' '}
                  {health?.lastCheck
                    ? format(new Date(health.lastCheck), 'yyyy.MM.dd HH:mm:ss', {
                        locale: ko,
                      })
                    : '-'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">서비스 상태</div>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {Object.keys(health?.serviceStatus || {}).length}개 서비스 모니터링
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 서비스별 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(health?.serviceStatus || {}).map(([service, data]: [string, any]) => {
          const Icon = STATUS_ICONS[data.status] || Server
          const colorClass = STATUS_COLORS[data.status]

          return (
            <Card key={service}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-5 w-5 text-gray-600" />
                      <h3 className="font-medium text-gray-900 capitalize">
                        {service.replace('_', ' ')}
                      </h3>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        {data.status === 'healthy'
                          ? '정상'
                          : data.status === 'degraded'
                          ? '성능 저하'
                          : '장애'}
                      </span>
                    </div>
                    {data.response_time_ms && (
                      <div className="mt-3 text-sm text-gray-600">
                        응답 시간: {data.response_time_ms}ms
                      </div>
                    )}
                    {data.cpu_usage && (
                      <div className="text-sm text-gray-600">
                        CPU: {data.cpu_usage.toFixed(1)}%
                      </div>
                    )}
                    {data.memory_usage && (
                      <div className="text-sm text-gray-600">
                        메모리: {data.memory_usage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 에러 통계 */}
      {errorStats && (
        <Card>
          <CardHeader>
            <CardTitle>에러 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500">전체 에러</div>
                <div className="text-2xl font-bold text-gray-900 mt-2">
                  {errorStats.total.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-600">해결됨</div>
                <div className="text-2xl font-bold text-green-700 mt-2">
                  {errorStats.resolved.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm font-medium text-red-600">미해결</div>
                <div className="text-2xl font-bold text-red-700 mt-2">
                  {errorStats.unresolved.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm font-medium text-orange-600">Critical</div>
                <div className="text-2xl font-bold text-orange-700 mt-2">
                  {errorStats.bySeverity.critical || 0}
                </div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm font-medium text-yellow-600">Warning</div>
                <div className="text-2xl font-bold text-yellow-700 mt-2">
                  {errorStats.bySeverity.warning || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 성능 메트릭스 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(health?.serviceMetrics || {}).map(
          ([service, metrics]: [string, any]) => (
            <Card key={service}>
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  {service.replace('_', ' ')} 성능
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">평균 응답시간</span>
                    <span className="text-sm font-medium text-gray-900">
                      {metrics.avgResponseTime?.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">가동률</span>
                    <span className="text-sm font-medium text-green-600">
                      {metrics.uptime?.toFixed(2)}%
                    </span>
                  </div>
                  {metrics.avgCpuUsage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">평균 CPU</span>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.avgCpuUsage?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {metrics.avgMemoryUsage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">평균 메모리</span>
                      <span className="text-sm font-medium text-gray-900">
                        {metrics.avgMemoryUsage?.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
