import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')

    const supabase = await createClient()

    // 최근 헬스체크 로그 조회
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const { data: healthLogs, error } = await supabase
      .from('system_health_logs')
      .select('*')
      .gte('checked_at', since.toISOString())
      .order('checked_at', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 서비스별 최신 상태
    const serviceStatus: Record<string, any> = {}
    healthLogs?.forEach((log: any) => {
      if (!serviceStatus[log.service_name]) {
        serviceStatus[log.service_name] = log
      }
    })

    // 서비스별 평균 응답 시간
    const serviceMetrics: Record<string, any> = {}
    healthLogs?.forEach((log: any) => {
      if (!serviceMetrics[log.service_name]) {
        serviceMetrics[log.service_name] = {
          count: 0,
          totalResponseTime: 0,
          totalCpuUsage: 0,
          totalMemoryUsage: 0,
          healthyCount: 0,
          degradedCount: 0,
          downCount: 0,
        }
      }
      const metrics = serviceMetrics[log.service_name]
      metrics.count++
      metrics.totalResponseTime += log.response_time_ms || 0
      metrics.totalCpuUsage += log.cpu_usage || 0
      metrics.totalMemoryUsage += log.memory_usage || 0

      if (log.status === 'healthy') metrics.healthyCount++
      else if (log.status === 'degraded') metrics.degradedCount++
      else if (log.status === 'down') metrics.downCount++
    })

    // 평균 계산
    Object.keys(serviceMetrics).forEach((service) => {
      const metrics = serviceMetrics[service]
      metrics.avgResponseTime = metrics.totalResponseTime / metrics.count
      metrics.avgCpuUsage = metrics.totalCpuUsage / metrics.count
      metrics.avgMemoryUsage = metrics.totalMemoryUsage / metrics.count
      metrics.uptime = (metrics.healthyCount / metrics.count) * 100
    })

    // 전체 시스템 상태
    const allHealthy = Object.values(serviceStatus).every(
      (log: any) => log.status === 'healthy'
    )
    const anyDown = Object.values(serviceStatus).some(
      (log: any) => log.status === 'down'
    )

    const overallStatus = anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded'

    return NextResponse.json({
      overallStatus,
      serviceStatus,
      serviceMetrics,
      lastCheck: healthLogs?.[0]?.checked_at || new Date().toISOString(),
    })
  } catch (error) {
    console.error('System health API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 헬스체크 실행 및 기록
export async function POST(request: Request) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()

    // 데이터베이스 헬스체크
    const dbStart = Date.now()
    const { error: dbError } = await supabase.from('companies').select('id').limit(1)
    const dbResponseTime = Date.now() - dbStart

    const dbStatus = dbError ? 'down' : dbResponseTime > 1000 ? 'degraded' : 'healthy'

    // 헬스체크 로그 저장
    await supabase.from('system_health_logs').insert({
      service_name: 'database',
      status: dbStatus,
      response_time_ms: dbResponseTime,
      checked_at: new Date().toISOString(),
    })

    // TODO: 다른 서비스들의 헬스체크 추가 (Auth, Storage, etc.)

    return NextResponse.json({
      success: true,
      checks: [
        {
          service: 'database',
          status: dbStatus,
          responseTime: dbResponseTime,
        },
      ],
    })
  } catch (error) {
    console.error('Health check execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
