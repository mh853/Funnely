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

    // 전환 퍼널 데이터 조회
    let query = supabase
      .from('leads')
      .select('status, created_at, company_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 상태별 집계
    const statusCounts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    }

    leads?.forEach((lead) => {
      const status = lead.status as keyof typeof statusCounts
      if (status in statusCounts) {
        statusCounts[status]++
      }
    })

    const total = leads?.length || 0

    // 전환율 계산
    const conversionFunnel = [
      {
        stage: 'new',
        label: '신규 리드',
        count: statusCounts.new,
        percentage: total > 0 ? (statusCounts.new / total) * 100 : 0,
      },
      {
        stage: 'contacted',
        label: '연락 완료',
        count: statusCounts.contacted,
        percentage: total > 0 ? (statusCounts.contacted / total) * 100 : 0,
      },
      {
        stage: 'qualified',
        label: '적격 리드',
        count: statusCounts.qualified,
        percentage: total > 0 ? (statusCounts.qualified / total) * 100 : 0,
      },
      {
        stage: 'converted',
        label: '전환 완료',
        count: statusCounts.converted,
        percentage: total > 0 ? (statusCounts.converted / total) * 100 : 0,
      },
    ]

    // 전환율 계산 (신규 → 전환)
    const conversionRate = statusCounts.new > 0
      ? (statusCounts.converted / statusCounts.new) * 100
      : 0

    // 단계별 전환율
    const stageConversionRates = {
      new_to_contacted: statusCounts.new > 0
        ? (statusCounts.contacted / statusCounts.new) * 100
        : 0,
      contacted_to_qualified: statusCounts.contacted > 0
        ? (statusCounts.qualified / statusCounts.contacted) * 100
        : 0,
      qualified_to_converted: statusCounts.qualified > 0
        ? (statusCounts.converted / statusCounts.qualified) * 100
        : 0,
    }

    return NextResponse.json({
      funnel: conversionFunnel,
      summary: {
        total,
        converted: statusCounts.converted,
        lost: statusCounts.lost,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
      stageConversionRates: {
        new_to_contacted: parseFloat(stageConversionRates.new_to_contacted.toFixed(2)),
        contacted_to_qualified: parseFloat(stageConversionRates.contacted_to_qualified.toFixed(2)),
        qualified_to_converted: parseFloat(stageConversionRates.qualified_to_converted.toFixed(2)),
      },
      period: {
        start: startDate,
        end: endDate,
      },
    })
  } catch (error) {
    console.error('Conversion analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
