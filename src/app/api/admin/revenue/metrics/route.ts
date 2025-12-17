import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import {
  calculateMRR,
  calculateARR,
  calculateGrowthRate,
} from '@/lib/revenue/calculations'
import type {
  RevenueMetricsResponse,
  CurrentRevenue,
  PlanBreakdown,
  BillingCycleBreakdown,
  RevenueTrend,
  Subscription,
} from '@/types/revenue'

export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크 (VIEW_COMPANIES 또는 새 VIEW_REVENUE 권한)
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. 현재 활성 구독 조회 (company_subscriptions + subscription_plans)
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

    // 5. 구독 데이터를 Subscription 타입으로 변환
    const subscriptions: Subscription[] = (activeSubscriptions || []).map(
      (sub: any) => {
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
      }
    )

    // 6. 현재 MRR/ARR 계산
    const currentMRR = subscriptions.reduce(
      (total, sub) => total + calculateMRR(sub),
      0
    )
    const currentARR = calculateARR(currentMRR)

    // 7. 이전 달 MRR/ARR 조회 (revenue_metrics 테이블에서)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString().split('T')[0]

    const { data: previousMetrics } = await supabase
      .from('revenue_metrics')
      .select('mrr, arr')
      .gte('calculated_at', lastMonthStr)
      .lt(
        'calculated_at',
        new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth() + 1,
          1
        ).toISOString()
      )
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    // 8. 성장률 계산
    const previousMRR = previousMetrics?.mrr || 0
    const previousARR = previousMetrics?.arr || 0

    const mrrGrowth = calculateGrowthRate(currentMRR, previousMRR)
    const arrGrowth = calculateGrowthRate(currentARR, previousARR)

    const current: CurrentRevenue = {
      mrr: currentMRR,
      arr: currentARR,
      mrr_growth: mrrGrowth,
      arr_growth: arrGrowth,
    }

    // 9. 플랜별 분포 계산
    const planMap = new Map<
      string,
      { companies: number; mrr: number }
    >()

    subscriptions.forEach((sub) => {
      const existing = planMap.get(sub.plan_type) || {
        companies: 0,
        mrr: 0,
      }
      planMap.set(sub.plan_type, {
        companies: existing.companies + 1,
        mrr: existing.mrr + calculateMRR(sub),
      })
    })

    const by_plan: PlanBreakdown[] = Array.from(planMap.entries()).map(
      ([plan_name, data]) => ({
        plan_name,
        companies: data.companies,
        mrr: data.mrr,
        percentage: (data.mrr / currentMRR) * 100,
      })
    )

    // 10. 결제 주기별 분포 계산
    const cycleMap = new Map<
      string,
      { companies: number; mrr: number }
    >()

    subscriptions.forEach((sub) => {
      const existing = cycleMap.get(sub.billing_cycle) || {
        companies: 0,
        mrr: 0,
      }
      cycleMap.set(sub.billing_cycle, {
        companies: existing.companies + 1,
        mrr: existing.mrr + calculateMRR(sub),
      })
    })

    const by_billing_cycle: BillingCycleBreakdown[] = Array.from(
      cycleMap.entries()
    ).map(([cycle, data]) => ({
      cycle,
      companies: data.companies,
      mrr: data.mrr,
      percentage: (data.mrr / currentMRR) * 100,
    }))

    // 11. 지난 6개월 추이 조회
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: trends } = await supabase
      .from('revenue_metrics')
      .select('calculated_at, mrr, arr')
      .gte('calculated_at', sixMonthsAgo.toISOString())
      .order('calculated_at', { ascending: true })

    const last_6_months: RevenueTrend[] = (trends || []).map(
      (trend: any) => ({
        month: trend.calculated_at.split('T')[0].substring(0, 7), // YYYY-MM
        mrr: trend.mrr,
        arr: trend.arr,
      })
    )

    // 12. 응답 구성
    const response: RevenueMetricsResponse = {
      current,
      breakdown: {
        by_plan,
        by_billing_cycle,
      },
      trends: {
        last_6_months,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Revenue metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
