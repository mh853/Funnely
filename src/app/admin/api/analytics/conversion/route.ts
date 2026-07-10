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
    // 리드 상태는 회사별로 커스터마이징 가능한 lead_statuses 테이블 기반이며,
    // 시스템 기본값(20250220000000_create_lead_statuses.sql)은
    // new/rejected/contacted/converted/contract_completed/needs_followup/other이다.
    // 이전 코드는 실제로 존재하지 않는 'qualified'/'lost' 코드를 집계하고 있어
    // 항상 0으로 표시됐고, 실제 존재하는 rejected/contract_completed/needs_followup/other
    // 상태의 리드는 어느 버킷에도 잡히지 않아 total 대비 퍼센트가 실제보다 낮게 나왔다.
    const statusCounts = {
      new: 0,
      contacted: 0,
      converted: 0,
      rejected: 0,
      contract_completed: 0,
      needs_followup: 0,
      other: 0,
    }

    leads?.forEach((lead) => {
      const status = lead.status as keyof typeof statusCounts
      if (status in statusCounts) {
        statusCounts[status]++
      } else {
        statusCounts.other++
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
        stage: 'converted',
        label: '전환 완료',
        count: statusCounts.converted,
        percentage: total > 0 ? (statusCounts.converted / total) * 100 : 0,
      },
      {
        stage: 'contract_completed',
        label: '예약 확정',
        count: statusCounts.contract_completed,
        percentage: total > 0 ? (statusCounts.contract_completed / total) * 100 : 0,
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
      contacted_to_converted: statusCounts.contacted > 0
        ? (statusCounts.converted / statusCounts.contacted) * 100
        : 0,
      converted_to_contract: statusCounts.converted > 0
        ? (statusCounts.contract_completed / statusCounts.converted) * 100
        : 0,
    }

    return NextResponse.json({
      funnel: conversionFunnel,
      summary: {
        total,
        converted: statusCounts.converted,
        lost: statusCounts.rejected,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
      stageConversionRates: {
        new_to_contacted: parseFloat(stageConversionRates.new_to_contacted.toFixed(2)),
        contacted_to_converted: parseFloat(stageConversionRates.contacted_to_converted.toFixed(2)),
        converted_to_contract: parseFloat(stageConversionRates.converted_to_contract.toFixed(2)),
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
