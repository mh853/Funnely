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

    // 7/11번에서 쓰는 날짜 계산은 activeSubscriptions 결과와 무관하므로 먼저 계산해두고,
    // 세 쿼리를 병렬로 실행한다 (기존엔 순차 실행이었음)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString().split('T')[0]
    const lastMonthEndStr = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      1
    ).toISOString().split('T')[0]

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 4. 현재 활성 구독 조회 (company_subscriptions + subscription_plans)
    // 새로운 플랜 구조: 개인(Personal)/기업(Business) × Free/Basic/Pro
    // 기존 플랜과 호환성 유지: plan_type 컬럼도 조회
    const [
      { data: activeSubscriptions, error: subsError },
      { data: previousMetrics },
      { data: trends },
    ] = await Promise.all([
      supabase
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
          plan_type,
          tier,
          user_type,
          price_monthly,
          price_yearly
        )
      `
        )
        .eq('status', 'active'),
      // 7. 이전 달 MRR/ARR 조회 (revenue_metrics 테이블에서)
      // revenue_metrics의 실제 컬럼명은 calculated_at이 아니라 period_start다.
      supabase
        .from('revenue_metrics')
        .select('mrr, arr')
        .gte('period_start', lastMonthStr)
        .lt('period_start', lastMonthEndStr)
        .order('period_start', { ascending: false })
        .limit(1)
        .single(),
      // 11. 지난 6개월 추이 조회
      // revenue_metrics의 실제 컬럼명은 calculated_at이 아니라 period_start다.
      supabase
        .from('revenue_metrics')
        .select('period_start, mrr, arr')
        .gte('period_start', sixMonthsAgo.toISOString().split('T')[0])
        .order('period_start', { ascending: true }),
    ])

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

        // 플랜명 생성 로직
        let planDisplayName: string

        if (plan.tier && plan.user_type) {
          // 새로운 플랜 구조: "개인 Free", "기업 Pro" 등
          const userTypeLabel = plan.user_type === 'personal' ? '개인' : '기업'
          const tierLabel = plan.tier === 'free' ? 'Free' : plan.tier === 'basic' ? 'Basic' : 'Pro'
          planDisplayName = `${userTypeLabel} ${tierLabel}`
        } else {
          // 기존 플랜 구조: plan_type과 name 조합
          const planTypeLabel = plan.plan_type === 'business' ? '기업' : '개인'
          planDisplayName = `${planTypeLabel} ${plan.name}`
        }

        return {
          id: sub.id,
          company_id: sub.company_id,
          plan_type: planDisplayName,
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

    // 8. 성장률 계산 (previousMetrics는 위 Promise.all에서 함께 조회함)
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

    // 11. 지난 6개월 추이 (trends는 위 Promise.all에서 함께 조회함)
    const last_6_months: RevenueTrend[] = (trends || []).map(
      (trend: any) => ({
        month: trend.period_start.substring(0, 7), // YYYY-MM
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
