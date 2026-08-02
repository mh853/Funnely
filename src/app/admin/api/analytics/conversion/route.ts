import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { toKSTDateStr, getKSTDayRange } from '@/lib/utils/date'
import { getLeadStatusCategoryMapForAdmin } from '@/lib/leadStatusCategory'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    // start_date/end_date는 KST 캘린더 날짜 문자열로 다룬다 - trends/route.ts와
    // 동일하게 실제 쿼리 경계는 getKSTDayRange()로 KST 하루 단위 UTC 인스턴트로
    // 변환해야 한다. 이전에는 문자열을 그대로 비교해 서버(UTC) 기준 하루와
    // 최대 9시간 어긋났다(67차 QA 확인).
    const startDate = searchParams.get('start_date') || toKSTDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    const endDate = searchParams.get('end_date') || toKSTDateStr(new Date())
    const companyId = searchParams.get('company_id')

    const supabase = await createClient()

    const queryStart = getKSTDayRange(startDate).start
    const queryEnd = getKSTDayRange(endDate).end // 배타적 상한(다음날 KST 시작)

    // 전환 퍼널 데이터 조회 - range() 없이 조회하면 Supabase 암묵적 max_rows(1000)에
    // 걸려 리드가 1000건을 넘는 순간부터 오래된 1000건만 집계되고 나머지는 조용히
    // 누락된다(다른 admin 라우트에서 이미 겪은 것과 동일 원인). 1000건씩 배치로
    // 반복 조회해 전체를 가져온다.
    const leads: Array<{ status: string; created_at: string; company_id: string }> = []
    {
      const BATCH_SIZE = 1000
      let offset = 0
      while (true) {
        let query = supabase
          .from('leads')
          .select('status, created_at, company_id')
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

    // 상태별 집계
    // 리드 상태는 회사별로 커스터마이징 가능한 lead_statuses 테이블 기반이다. 이전
    // 코드는 고정된 상태 코드 집합만 카운트해 회사가 만든 커스텀 상태의 리드는 어느
    // 버킷에도 잡히지 않았다 - channels/trends 라우트와 동일하게 실제 category
    // 매핑(new/contacted/converted/rejected/contract_completed/needs_followup/other)
    // 기준으로 집계한다(67차 QA 확인).
    const statusCounts = {
      new: 0,
      contacted: 0,
      converted: 0,
      rejected: 0,
      contract_completed: 0,
      needs_followup: 0,
      other: 0,
    }

    leads.forEach((lead) => {
      const category = statusCategoryMap.get(`${lead.company_id}:${lead.status}`) || 'other'
      statusCounts[category]++
    })

    const total = leads.length

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
