import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const companyId = searchParams.get('company_id')
    const granularity = searchParams.get('granularity') || 'day' // day, week, month

    const supabase = await createClient()

    // 시계열 데이터 조회
    let query = supabase
      .from('leads')
      .select('created_at, status, company_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 날짜별 집계 함수
    const getDateKey = (date: string) => {
      const d = new Date(date)
      if (granularity === 'day') {
        return d.toISOString().split('T')[0]
      } else if (granularity === 'week') {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        return weekStart.toISOString().split('T')[0]
      } else if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }
      return d.toISOString().split('T')[0]
    }

    // 시계열 데이터 집계
    const timeSeriesData = new Map<string, {
      date: string
      total: number
      new: number
      contacted: number
      qualified: number
      converted: number
      lost: number
    }>()

    leads?.forEach((lead) => {
      const dateKey = getDateKey(lead.created_at)

      if (!timeSeriesData.has(dateKey)) {
        timeSeriesData.set(dateKey, {
          date: dateKey,
          total: 0,
          new: 0,
          contacted: 0,
          qualified: 0,
          converted: 0,
          lost: 0,
        })
      }

      const data = timeSeriesData.get(dateKey)!
      data.total++

      const status = lead.status as 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
      if (status in data) {
        data[status]++
      }
    })

    // 정렬된 배열로 변환
    const trends = Array.from(timeSeriesData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 전환율 추이 계산
    const conversionTrends = trends.map((data) => ({
      date: data.date,
      conversionRate: data.total > 0
        ? parseFloat(((data.converted / data.total) * 100).toFixed(2))
        : 0,
    }))

    // 성장률 계산 (전일 대비)
    const growthRates = trends.map((data, index) => {
      if (index === 0) {
        return {
          date: data.date,
          growthRate: 0,
        }
      }
      const prevData = trends[index - 1]
      const growthRate = prevData.total > 0
        ? parseFloat((((data.total - prevData.total) / prevData.total) * 100).toFixed(2))
        : 0
      return {
        date: data.date,
        growthRate,
      }
    })

    // 요약 통계
    const totalLeads = trends.reduce((sum, data) => sum + data.total, 0)
    const totalConverted = trends.reduce((sum, data) => sum + data.converted, 0)
    const avgLeadsPerPeriod = trends.length > 0
      ? parseFloat((totalLeads / trends.length).toFixed(2))
      : 0

    return NextResponse.json({
      trends,
      conversionTrends,
      growthRates,
      summary: {
        totalLeads,
        totalConverted,
        avgLeadsPerPeriod,
        overallConversionRate: totalLeads > 0
          ? parseFloat(((totalConverted / totalLeads) * 100).toFixed(2))
          : 0,
        dataPoints: trends.length,
      },
      period: {
        start: startDate,
        end: endDate,
        granularity,
      },
    })
  } catch (error) {
    console.error('Trends analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
