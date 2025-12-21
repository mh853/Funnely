import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // 4. 모든 구독 조회 (plan 정보 포함)
    const { data: subscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_end,
        subscription_plans!inner (
          id,
          name,
          price_monthly,
          price_yearly
        )
      `)

    if (subsError) {
      console.error('[Billing Metrics] Error fetching subscriptions:', subsError)
      throw subsError
    }

    // 5. 활성 구독 필터링 (active, trial, past_due)
    const activeStatuses = ['active', 'trial', 'past_due']
    const activeSubscriptions = (subscriptions || []).filter(sub =>
      activeStatuses.includes(sub.status)
    )

    // 6. MRR 계산 (Monthly Recurring Revenue)
    let mrr = 0
    activeSubscriptions.forEach(sub => {
      const plan = (sub as any).subscription_plans
      if (sub.billing_cycle === 'monthly' && plan?.price_monthly) {
        mrr += Number(plan.price_monthly)
      } else if (sub.billing_cycle === 'yearly' && plan?.price_yearly) {
        mrr += Number(plan.price_yearly) / 12 // 연간 금액을 월 단위로 환산
      }
    })

    // 7. ARR 계산 (Annual Recurring Revenue)
    const arr = mrr * 12

    // 8. 이번 달 실제 매출 (성공한 결제 내역 기준)
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('amount, payment_date, status')
      .eq('status', 'success')
      .gte(
        'payment_date',
        new Date(currentYear, currentMonth - 1, 1).toISOString()
      )
      .lt('payment_date', new Date(currentYear, currentMonth, 1).toISOString())

    if (paymentsError) {
      console.error('[Billing Metrics] Error fetching payments:', paymentsError)
    }

    const monthlyRevenue = (payments || []).reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    )

    // 9. 상태별 분포
    const statusDistribution: Record<string, number> = {}
    ;(subscriptions || []).forEach(sub => {
      const status = sub.status || 'unknown'
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
    })

    // 10. 플랜별 분포
    const planDistribution: Record<string, number> = {}
    ;(subscriptions || []).forEach(sub => {
      const plan = (sub as any).subscription_plans?.name || 'unknown'
      planDistribution[plan] = (planDistribution[plan] || 0) + 1
    })

    // 11. 응답 반환
    return NextResponse.json({
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      monthlyRevenue: Math.round(monthlyRevenue),
      activeSubscriptions: activeSubscriptions.length,
      statusDistribution,
      planDistribution,
    })
  } catch (error) {
    console.error('[Billing Metrics] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch billing metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
