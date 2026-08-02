import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { toKSTDateStr, getKSTDayRange } from '@/lib/utils/date'
import { getLeadStatusCategoryMapForAdmin } from '@/lib/leadStatusCategory'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    // conversion/trends 라우트와 동일하게 KST 하루 경계로 변환해서 조회한다.
    // 이전에는 문자열을 그대로 비교해 서버(UTC) 기준 하루와 최대 9시간
    // 어긋났다(67차 QA 확인).
    const startDate = searchParams.get('start_date') || toKSTDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    const endDate = searchParams.get('end_date') || toKSTDateStr(new Date())
    const companyId = searchParams.get('company_id')

    const supabase = await createClient()

    const queryStart = getKSTDayRange(startDate).start
    const queryEnd = getKSTDayRange(endDate).end // 배타적 상한(다음날 KST 시작)

    // UTM 소스별 리드 데이터 조회 - range() 없이 조회하면 Supabase 암묵적
    // max_rows(1000)에 걸려 리드가 1000건을 넘는 순간부터 오래된 1000건만
    // 집계되고 나머지는 조용히 누락된다. 1000건씩 배치로 반복 조회해 전체를 가져온다.
    const leads: Array<{
      company_id: string
      utm_source: string | null
      utm_medium: string | null
      utm_campaign: string | null
      status: string
      created_at: string
    }> = []
    {
      const BATCH_SIZE = 1000
      let offset = 0
      while (true) {
        let query = supabase
          .from('leads')
          .select('company_id, utm_source, utm_medium, utm_campaign, status, created_at')
          .gte('created_at', queryStart.toISOString())
          .lt('created_at', queryEnd.toISOString())
          .range(offset, offset + BATCH_SIZE - 1)

        if (companyId) {
          query = query.eq('company_id', companyId)
        }

        const { data, error } = await query
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!data || data.length === 0) break
        leads.push(...data)
        if (data.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }
    }

    const statusCategoryMap = await getLeadStatusCategoryMapForAdmin(supabase, companyId)

    // 채널별 집계
    const channelStats = new Map<string, {
      source: string
      total: number
      converted: number
      conversionRate: number
      byMedium: Map<string, number>
      byCampaign: Map<string, number>
    }>()

    leads.forEach((lead) => {
      const source = lead.utm_source || 'direct'
      const medium = lead.utm_medium || 'none'
      const campaign = lead.utm_campaign || 'none'
      const isConverted = statusCategoryMap.get(`${lead.company_id}:${lead.status}`) === 'converted'

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
    const totalLeads = leads.length
    const totalConverted = leads.filter(
      l => statusCategoryMap.get(`${l.company_id}:${l.status}`) === 'converted'
    ).length

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
