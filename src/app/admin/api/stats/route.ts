import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { createClient } from '@supabase/supabase-js'

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start: start.toISOString(), end: now.toISOString() }
}

export async function GET() {
  try {
    await requireSuperAdmin()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { start, end } = getMonthRange()

    // Run all this-month stats queries in parallel
    const [
      signupsResult,
      trialsResult,
      paymentsResult,
      withdrawalsResult,
      cancellationsResult,
      ticketsResult,
      leadsResult,
      recentSignupsResult,
      recentPaymentsResult,
      recentWithdrawalsResult,
      recentCancellationsResult,
      recentTicketsResult,
    ] = await Promise.all([
      // 이번달 회원가입 (신규 회사)
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end)
        .is('withdrawn_at', null),

      // 이번달 무료체험 시작
      supabase
        .from('company_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trial')
        .gte('created_at', start)
        .lte('created_at', end),

      // 이번달 결제 (건수 + 매출)
      supabase
        .from('payment_transactions')
        .select('total_amount')
        .eq('status', 'success')
        .gte('approved_at', start)
        .lte('approved_at', end),

      // 이번달 탈퇴
      supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('withdrawn_at', start)
        .lte('withdrawn_at', end),

      // 이번달 구독취소
      supabase
        .from('company_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', start)
        .lte('updated_at', end),

      // 이번달 신규 문의
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end),

      // 이번달 유입 (랜딩페이지를 통한 리드)
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end),

      // 최신 회원가입 3개
      supabase
        .from('companies')
        .select('id, name, created_at')
        .is('withdrawn_at', null)
        .order('created_at', { ascending: false })
        .limit(3),

      // 최신 결제 3개
      supabase
        .from('payment_transactions')
        .select('id, total_amount, approved_at, company_id, companies(name)')
        .eq('status', 'success')
        .order('approved_at', { ascending: false })
        .limit(3),

      // 최신 탈퇴 3개
      supabase
        .from('companies')
        .select('id, name, withdrawn_at')
        .not('withdrawn_at', 'is', null)
        .order('withdrawn_at', { ascending: false })
        .limit(3),

      // 최신 구독취소 3개
      supabase
        .from('company_subscriptions')
        .select('id, updated_at, company_id, companies(name)')
        .eq('status', 'cancelled')
        .order('updated_at', { ascending: false })
        .limit(3),

      // 최신 문의 3개
      supabase
        .from('support_tickets')
        .select('id, subject, created_at, company_id, companies(name)')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const payments = paymentsResult.data || []
    const paymentCount = payments.length
    const revenue = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0)

    return NextResponse.json({
      thisMonth: {
        signups: signupsResult.count || 0,
        trials: trialsResult.count || 0,
        payments: paymentCount,
        revenue,
        withdrawals: withdrawalsResult.count || 0,
        cancellations: cancellationsResult.count || 0,
        tickets: ticketsResult.count || 0,
        leads: leadsResult.count || 0,
      },
      recent: {
        signups: (recentSignupsResult.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          date: c.created_at,
        })),
        payments: (recentPaymentsResult.data || []).map((p: any) => ({
          id: p.id,
          companyName: p.companies?.name || '-',
          amount: p.total_amount,
          date: p.approved_at,
        })),
        withdrawals: (recentWithdrawalsResult.data || []).map((c) => ({
          id: c.id,
          name: c.name,
          date: c.withdrawn_at,
        })),
        cancellations: (recentCancellationsResult.data || []).map((s: any) => ({
          id: s.id,
          companyName: s.companies?.name || '-',
          date: s.updated_at,
        })),
        tickets: (recentTicketsResult.data || []).map((t: any) => ({
          id: t.id,
          subject: t.subject,
          companyName: t.companies?.name || '-',
          date: t.created_at,
        })),
      },
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
