import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { createClient } from '@supabase/supabase-js'

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dayStart(dateStr: string) {
  return `${dateStr}T00:00:00.000Z`
}

function dayEnd(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`
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

    // Build list of date strings in range
    const dates: string[] = []
    let cur = fromDate
    while (cur <= toDate) {
      dates.push(toDateString(cur))
      cur = addDays(cur, 1)
    }

    if (dates.length > 90) {
      return NextResponse.json({ error: 'Date range too large (max 90 days)' }, { status: 400 })
    }

    const rangeStart = `${from}T00:00:00.000Z`
    const rangeEnd = `${to}T23:59:59.999Z`

    // Fetch all raw data in parallel for the full range
    const [
      signupsRaw,
      trialsRaw,
      paymentsRaw,
      withdrawalsRaw,
      cancellationsRaw,
      ticketsRaw,
      leadsRaw,
    ] = await Promise.all([
      supabase
        .from('companies')
        .select('created_at')
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd)
        .is('withdrawn_at', null),

      supabase
        .from('company_subscriptions')
        .select('created_at')
        .eq('status', 'trial')
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd),

      supabase
        .from('payment_transactions')
        .select('total_amount, approved_at')
        .eq('status', 'success')
        .gte('approved_at', rangeStart)
        .lte('approved_at', rangeEnd),

      supabase
        .from('companies')
        .select('withdrawn_at')
        .gte('withdrawn_at', rangeStart)
        .lte('withdrawn_at', rangeEnd),

      supabase
        .from('company_subscriptions')
        .select('updated_at')
        .eq('status', 'canceled')
        .gte('updated_at', rangeStart)
        .lte('updated_at', rangeEnd),

      supabase
        .from('support_tickets')
        .select('created_at')
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd),

      supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd),
    ])

    // Group by date
    const countByDate = (items: Array<{ [key: string]: any }>, key: string): Record<string, number> => {
      const map: Record<string, number> = {}
      for (const item of items) {
        const d = toDateString(new Date(item[key]))
        map[d] = (map[d] || 0) + 1
      }
      return map
    }

    const sumByDate = (items: Array<{ total_amount: number; approved_at: string }>): Record<string, number> => {
      const map: Record<string, number> = {}
      for (const item of items) {
        const d = toDateString(new Date(item.approved_at))
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
    const leadsByDate = countByDate(leadsRaw.data || [], 'created_at')

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
