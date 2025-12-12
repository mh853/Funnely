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

    const supabase = await createClient()

    // UTM 소스별 리드 데이터 조회
    let query = supabase
      .from('leads')
      .select('utm_source, utm_medium, utm_campaign, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 채널별 집계
    const channelStats = new Map<string, {
      source: string
      total: number
      converted: number
      conversionRate: number
      byMedium: Map<string, number>
      byCampaign: Map<string, number>
    }>()

    leads?.forEach((lead) => {
      const source = lead.utm_source || 'direct'
      const medium = lead.utm_medium || 'none'
      const campaign = lead.utm_campaign || 'none'
      const isConverted = lead.status === 'converted'

      if (!channelStats.has(source)) {
        channelStats.set(source, {
          source,
          total: 0,
          converted: 0,
          conversionRate: 0,
          byMedium: new Map(),
          byCampaign: new Map(),
        })
      }

      const stats = channelStats.get(source)!
      stats.total++
      if (isConverted) stats.converted++

      // Medium 집계
      stats.byMedium.set(medium, (stats.byMedium.get(medium) || 0) + 1)

      // Campaign 집계
      stats.byCampaign.set(campaign, (stats.byCampaign.get(campaign) || 0) + 1)
    })

    // 전환율 계산 및 정렬
    const channelPerformance = Array.from(channelStats.values())
      .map((stats) => ({
        source: stats.source,
        total: stats.total,
        converted: stats.converted,
        conversionRate: stats.total > 0
          ? parseFloat(((stats.converted / stats.total) * 100).toFixed(2))
          : 0,
        mediums: Array.from(stats.byMedium.entries()).map(([medium, count]) => ({
          medium,
          count,
        })).sort((a, b) => b.count - a.count),
        campaigns: Array.from(stats.byCampaign.entries()).map(([campaign, count]) => ({
          campaign,
          count,
        })).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total)

    // 상위 채널 요약
    const topChannels = channelPerformance.slice(0, 5)
    const totalLeads = leads?.length || 0
    const totalConverted = leads?.filter(l => l.status === 'converted').length || 0

    return NextResponse.json({
      channels: channelPerformance,
      topChannels,
      summary: {
        totalLeads,
        totalConverted,
        overallConversionRate: totalLeads > 0
          ? parseFloat(((totalConverted / totalLeads) * 100).toFixed(2))
          : 0,
        channelCount: channelStats.size,
      },
      period: {
        start: startDate,
        end: endDate,
      },
    })
  } catch (error) {
    console.error('Channel analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
