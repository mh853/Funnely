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
    // subscription_plans!plan_id: company_subscriptions는 plan_id/pending_plan_id 두 개의
    // FK가 subscription_plans를 가리키므로, 모호성 해소를 위해 컬럼명을 명시해야 한다
    // (그냥 subscription_plans!inner로 쓰면 PGRST201/HTTP 300 에러가 발생한다).
    const { data: subscriptions, error: subsError } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_end_date,
        created_at,
        subscription_plans!plan_id (
          id,
          name,
          price_monthly,
          price_yearly
        )
      `)
      .order('created_at', { ascending: false })

    if (subsError) {
      console.error('[Billing Metrics] Error fetching subscriptions:', subsError)
      throw subsError
    }

    // company_subscriptions는 회사가 플랜을 바꾸거나 재구독할 때마다 새 행이 쌓이는
    // 이력 테이블이다. 회사당 가장 최근 구독 1건만 집계 대상으로 삼아야 한다.
    // 그렇지 않으면 예전에 쓰다가 그만둔 플랜의 오래된 구독 행이 계속 남아서
    // "플랜별 구독 분포"에 이미 쓰지 않는 플랜이 영구히 표시된다.
    const latestSubByCompany = new Map<string, (typeof subscriptions)[number]>()
    for (const sub of subscriptions || []) {
      if (!latestSubByCompany.has(sub.company_id)) {
        latestSubByCompany.set(sub.company_id, sub)
      }
    }
    const latestSubscriptions = Array.from(latestSubByCompany.values())

    // 5. 활성 구독 필터링 (active, trial, past_due)
    const activeStatuses = ['active', 'trial', 'past_due']
    const activeSubscriptions = latestSubscriptions.filter(sub =>
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
    // 'payment_history'는 존재하지 않는 테이블이며, 실제 결제 내역은 payment_transactions에
    // 저장된다. 날짜 컬럼도 'payment_date'가 아니라 'approved_at'이다.
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_transactions')
      .select('total_amount, approved_at, status')
      .eq('status', 'success')
      .gte(
        'approved_at',
        new Date(currentYear, currentMonth - 1, 1).toISOString()
      )
      .lt('approved_at', new Date(currentYear, currentMonth, 1).toISOString())

    if (paymentsError) {
      console.error('[Billing Metrics] Error fetching payments:', paymentsError)
    }

    const monthlyRevenue = (payments || []).reduce(
      (sum, payment) => sum + (payment.total_amount || 0),
      0
    )

    // 9. 상태별 분포 (회사당 최신 구독 1건 기준)
    const statusDistribution: Record<string, number> = {}
    latestSubscriptions.forEach(sub => {
      const status = sub.status || 'unknown'
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
    })

    // 10. 플랜별 분포 (회사당 최신 구독 1건 기준)
    const planDistribution: Record<string, number> = {}
    latestSubscriptions.forEach(sub => {
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
