import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { createClient } from '@supabase/supabase-js'
import { toKSTDateStr, getKSTDayRange } from '@/lib/utils/date'

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to parameters' }, { status: 400 })
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)

    // Build list of date strings in range (달력 날짜 라벨 나열용 - from/to 자체가
    // "YYYY-MM-DD" 달력 날짜 문자열이므로 여기서는 KST 변환이 필요 없다)
    const dates: string[] = []
    let cur = fromDate
    while (cur <= toDate) {
      dates.push(toDateString(cur))
      cur = addDays(cur, 1)
    }

    // "N일" 옵션은 관리자 페이지들에서 대부분 subDays(today, N)~today(포함)로
    // 만들어지며 이는 N+1개의 날짜를 포함한다(예: /admin/analytics의 "90일"
    // 옵션은 subDays(today,90)~today = 91일치). 기존 코드는 90개 초과를 그대로
    // 거부해 이런 "90일" 선택이 항상 400으로 실패했다(67차 QA 확인 - off-by-one).
    if (dates.length > 91) {
      return NextResponse.json({ error: 'Date range too large (max 90 days)' }, { status: 400 })
    }

    // 서버(Vercel)는 UTC라서 "YYYY-MM-DD" 문자열을 그대로 TIMESTAMPTZ 컬럼과
    // 비교하면 Postgres가 UTC 자정으로 캐스팅해 KST 기준 하루와 최대 9시간
    // 어긋난다(trends/route.ts와 동일 문제 - 67차 QA 확인).
    const rangeStart = getKSTDayRange(from).start.toISOString()
    const rangeEnd = getKSTDayRange(to).end.toISOString() // 배타적 상한(다음날 KST 시작)

    // 리드 조회 - range() 없이 조회하면 Supabase 암묵적 max_rows(1000)에 걸려
    // 1000건을 넘는 순간부터 오래된 1000건만 집계되고 나머지는 조용히 누락된다.
    // 1000건씩 배치로 반복 조회해 전체를 가져온다.
    const fetchAllLeads = async () => {
      const result: Array<{ created_at: string }> = []
      const BATCH_SIZE = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('created_at')
          .gte('created_at', rangeStart)
          .lt('created_at', rangeEnd)
          .range(offset, offset + BATCH_SIZE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        result.push(...data)
        if (data.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }
      return result
    }

    // Fetch all raw data in parallel for the full range
    const [
      signupsRaw,
      trialsRaw,
      paymentsRaw,
      withdrawalsRaw,
      cancellationsRaw,
      ticketsRaw,
      leads,
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('created_at')
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd)
        .is('withdrawn_at', null),

      supabase
        .from('company_subscriptions')
        .select('created_at')
        .eq('status', 'trial')
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd),

      supabase
        .from('payment_transactions')
        .select('total_amount, approved_at')
        .eq('status', 'success')
        .gte('approved_at', rangeStart)
        .lt('approved_at', rangeEnd),

      supabase
        .from('companies')
        .select('withdrawn_at')
        .gte('withdrawn_at', rangeStart)
        .lt('withdrawn_at', rangeEnd),

      supabase
        .from('company_subscriptions')
        // company_subscriptions.status 값은 'canceled'가 아니라 'cancelled'(더블 L)이다.
        // 철자가 틀려 이 쿼리는 항상 0건을 반환했고, 일별 취소 추이가 계속 0으로만 표시됐다.
        .select('updated_at')
        .eq('status', 'cancelled')
        .gte('updated_at', rangeStart)
        .lt('updated_at', rangeEnd),

      supabase
        .from('support_tickets')
        .select('created_at')
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd),

      fetchAllLeads(),
    ])

    // Group by date - KST 캘린더 날짜 기준으로 묶어야 한다(new Date().toISOString()
    // 기반의 UTC 날짜로 묶으면 KST 자정~오전9시 사이 이벤트가 전날로 잘못 집계된다).
    const countByDate = (items: Array<{ [key: string]: any }>, key: string): Record<string, number> => {
      const map: Record<string, number> = {}
      for (const item of items) {
        const d = toKSTDateStr(new Date(item[key]))
        map[d] = (map[d] || 0) + 1
      }
      return map
    }

    const sumByDate = (items: Array<{ total_amount: number; approved_at: string }>): Record<string, number> => {
      const map: Record<string, number> = {}
      for (const item of items) {
        const d = toKSTDateStr(new Date(item.approved_at))
        map[d] = (map[d] || 0) + (item.total_amount || 0)
      }
      return map
    }

    const signupsByDate = countByDate(signupsRaw.data || [], 'created_at')
    const trialsByDate = countByDate(trialsRaw.data || [], 'created_at')
    const paymentsByDate = countByDate(paymentsRaw.data || [], 'approved_at')
    const revenueByDate = sumByDate(paymentsRaw.data || [])
    const withdrawalsByDate = countByDate(withdrawalsRaw.data || [], 'withdrawn_at')
    const cancellationsByDate = countByDate(cancellationsRaw.data || [], 'updated_at')
    const ticketsByDate = countByDate(ticketsRaw.data || [], 'created_at')
    const leadsByDate = countByDate(leads, 'created_at')

    const rows = dates.map((date) => ({
      date,
      leads: leadsByDate[date] || 0,
      signups: signupsByDate[date] || 0,
      trials: trialsByDate[date] || 0,
      payments: paymentsByDate[date] || 0,
      revenue: revenueByDate[date] || 0,
      withdrawals: withdrawalsByDate[date] || 0,
      cancellations: cancellationsByDate[date] || 0,
      tickets: ticketsByDate[date] || 0,
    }))

    // Totals
    const totals = rows.reduce(
      (acc, row) => ({
        leads: acc.leads + row.leads,
        signups: acc.signups + row.signups,
        trials: acc.trials + row.trials,
        payments: acc.payments + row.payments,
        revenue: acc.revenue + row.revenue,
        withdrawals: acc.withdrawals + row.withdrawals,
        cancellations: acc.cancellations + row.cancellations,
        tickets: acc.tickets + row.tickets,
      }),
      { leads: 0, signups: 0, trials: 0, payments: 0, revenue: 0, withdrawals: 0, cancellations: 0, tickets: 0 }
    )

    return NextResponse.json({ rows, totals })
  } catch (error) {
    console.error('Analytics daily API error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
