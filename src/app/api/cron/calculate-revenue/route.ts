import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMRR, calculateARR } from '@/lib/revenue/calculations'
import type { Subscription } from '@/types/revenue'

/**
 * Daily revenue calculation cron job
 * Calculates and stores MRR/ARR for all companies
 *
 * Vercel Cron: 0 1 * * * (1 AM daily)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. 모든 활성 구독 조회
    const { data: activeSubscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select(
        `
        id,
        company_id,
        status,
        billing_cycle,
        subscription_plans:plan_id (
          id,
          name,
          price_monthly,
          price_yearly
        )
      `
      )
      .eq('status', 'active')

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // 4. 회사별 구독 그룹핑
    const companySubscriptionsMap = new Map<string, any[]>()

    activeSubscriptions?.forEach((sub: any) => {
      const existing = companySubscriptionsMap.get(sub.company_id) || []
      companySubscriptionsMap.set(sub.company_id, [...existing, sub])
    })

    // 5. 각 회사별 MRR/ARR 계산 및 저장
    const revenueMetrics = []
    const today = new Date().toISOString()

    for (const [companyId, companySubs] of Array.from(
      companySubscriptionsMap.entries()
    )) {
      // Convert to Subscription type
      const subscriptions: Subscription[] = companySubs.map((sub: any) => {
        const plan = sub.subscription_plans
        const amount =
          sub.billing_cycle === 'yearly'
            ? plan.price_yearly || plan.price_monthly * 12
            : plan.price_monthly

        return {
          id: sub.id,
          company_id: sub.company_id,
          plan_type: plan.name,
          billing_cycle: sub.billing_cycle,
          amount: amount,
          status: sub.status,
          started_at: '',
          ended_at: null,
          created_at: '',
          updated_at: '',
        }
      })

      // Calculate MRR/ARR
      const mrr = subscriptions.reduce(
        (total, sub) => total + calculateMRR(sub),
        0
      )
      const arr = calculateARR(mrr)

      // Get plan type and billing cycle from first subscription
      const firstSub = subscriptions[0]

      revenueMetrics.push({
        company_id: companyId,
        mrr,
        arr,
        mrr_growth_rate: null, // Will be calculated on next run
        arr_growth_rate: null, // Will be calculated on next run
        plan_type: firstSub.plan_type,
        billing_cycle: firstSub.billing_cycle,
        calculated_at: today,
      })
    }

    // 6. revenue_metrics 테이블에 저장
    if (revenueMetrics.length > 0) {
      const { error: insertError } = await supabase
        .from('revenue_metrics')
        .insert(revenueMetrics)

      if (insertError) {
        console.error('Error inserting revenue metrics:', insertError)
        return NextResponse.json(
          { error: 'Failed to save revenue metrics' },
          { status: 500 }
        )
      }
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      companiesProcessed: companySubscriptionsMap.size,
      totalMRR: revenueMetrics.reduce((sum, m) => sum + m.mrr, 0),
      totalARR: revenueMetrics.reduce((sum, m) => sum + m.arr, 0),
      timestamp: today,
    })
  } catch (error) {
    console.error('Revenue calculation cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
