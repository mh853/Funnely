import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select('id, total_amount, approved_at, status, subscription_id')
      .eq('company_id', params.id)
      .eq('status', 'success')
      .order('approved_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    // payment_transactions.subscription_id에는 FK 제약이 없어 PostgREST embed로
    // company_subscriptions를 바로 조인할 수 없다. subscription_id를 모아 별도
    // 조회 후 애플리케이션 레벨에서 병합한다.
    const subscriptionIds = Array.from(
      new Set((payments || []).map((p) => p.subscription_id).filter(Boolean))
    )

    const planNameBySubscriptionId = new Map<string, string>()
    if (subscriptionIds.length > 0) {
      const { data: subscriptions } = await supabase
        .from('company_subscriptions')
        .select('id, plan:subscription_plans!plan_id(name)')
        .in('id', subscriptionIds)

      for (const sub of subscriptions || []) {
        const planName = (sub.plan as any)?.name
        if (planName) planNameBySubscriptionId.set(sub.id, planName)
      }
    }

    const rows = (payments || []).map((p: any, i: number) => ({
      sequence: (payments?.length || 0) - i,
      date: p.approved_at,
      planName: planNameBySubscriptionId.get(p.subscription_id) || '-',
      amount: p.total_amount || 0,
    }))

    return NextResponse.json({ payments: rows })
  } catch (error) {
    console.error('[Payments API] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
