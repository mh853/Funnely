import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()

    // 활성 구독 조회
    const { data: activeSubscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select(
        `
        *,
        plan:subscription_plans!company_subscriptions_plan_id_fkey(price_monthly, price_yearly)
      `
      )
      .eq('status', 'active')

    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 })
    }

    // MRR 계산
    let mrr = 0
    let arr = 0

    activeSubscriptions?.forEach((sub: any) => {
      if (sub.billing_cycle === 'monthly') {
        mrr += parseFloat(sub.plan.price_monthly || 0)
      } else if (sub.billing_cycle === 'yearly') {
        // 연간 구독을 월간으로 환산
        mrr += parseFloat(sub.plan.price_yearly || 0) / 12
      }
    })

    arr = mrr * 12

    // 이번 달 결제 성공 건수 및 금액
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('paid_at', startOfMonth.toISOString())

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    const monthlyRevenue = monthlyPayments?.reduce(
      (sum: number, payment: any) => sum + parseFloat(payment.amount || 0),
      0
    ) || 0

    // 구독 상태별 분포
    const { data: allSubscriptions } = await supabase
      .from('company_subscriptions')
      .select('status')

    const statusDistribution = allSubscriptions?.reduce((acc: any, sub: any) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {})

    // 플랜별 분포
    const { data: planDistribution } = await supabase
      .from('company_subscriptions')
      .select(
        `
        plan:subscription_plans!company_subscriptions_plan_id_fkey(name)
      `
      )
      .eq('status', 'active')

    const planCounts = planDistribution?.reduce((acc: any, sub: any) => {
      const planName = sub.plan?.name || 'Unknown'
      acc[planName] = (acc[planName] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      monthlyRevenue: Math.round(monthlyRevenue),
      activeSubscriptions: activeSubscriptions?.length || 0,
      statusDistribution: statusDistribution || {},
      planDistribution: planCounts || {},
    })
  } catch (error) {
    console.error('Subscription metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
