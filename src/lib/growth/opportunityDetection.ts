// Phase 3.4: Growth Opportunity Detection Engine

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getKSTNow } from '@/lib/utils/date'
import {
  detectUsageLimitSignals,
  detectActivityGrowthSignals,
  detectLowUsageSignals,
  detectUnderUtilizationSignals,
  detectHealthScoreDeclineSignal,
  calculateConfidenceScore,
  determineOpportunityType,
  recommendNextPlan,
  estimateMRRImpact,
} from './signalDetection'
import type { Signal, GrowthOpportunity, UsageMetrics, PlanLimits } from '@/types/growth'

export interface DetectionResult {
  success: boolean
  detected: number
  updated: number
  dismissed: number
  errors: string[]
}

/**
 * Detect growth opportunities for all companies
 */
export async function detectGrowthOpportunities(
  supabase: SupabaseClient
): Promise<DetectionResult> {
  const result: DetectionResult = {
    success: false,
    detected: 0,
    updated: 0,
    dismissed: 0,
    errors: [],
  }

  try {
    // Get all active companies with subscriptions
    // 실제 구독 테이블명은 'subscriptions'가 아니라 'company_subscriptions'이고,
    // plan_name/amount 컬럼은 존재하지 않는다(plan_id로 subscription_plans를 조인해야
    // 요금제명/가격을 얻을 수 있다). plan_id FK가 2개(plan_id, pending_plan_id) 있어
    // PostgREST 임베딩 시 'subscription_plans!plan_id'로 명시해야 한다.
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(
        `
        id,
        name,
        company_subscriptions!inner (
          id,
          status,
          billing_cycle,
          plan_id,
          locked_plan_id,
          locked_price_monthly,
          locked_price_yearly,
          subscription_plans!plan_id (
            name,
            price_monthly,
            price_yearly,
            max_leads,
            max_users,
            max_landing_pages
          )
        )
      `
      )
      .eq('company_subscriptions.status', 'active')

    if (companiesError) {
      result.errors.push(`Failed to fetch companies: ${companiesError.message}`)
      return result
    }

    if (!companies || companies.length === 0) {
      result.success = true
      return result
    }

    // Process each company
    for (const company of companies) {
      try {
        const subscription = (company as any).company_subscriptions[0]
        if (!subscription) continue

        const plan = subscription.subscription_plans
        if (!plan) continue

        // 플랜별 실제 한도는 subscription_plans에 이미 컬럼으로 존재하므로,
        // types/growth.ts의 'basic'/'pro'/'enterprise' 하드코딩 테이블(실제 한글
        // 플랜명과 매칭되지 않아 항상 null을 반환하던 것)을 참조하지 않고 DB 값을 직접 사용한다
        const planLimits: PlanLimits = {
          leads: plan.max_leads ?? -1,
          users: plan.max_users ?? -1,
          landing_pages: plan.max_landing_pages ?? -1,
          features: [],
        }

        // Detect signals for this company
        const signals = await detectSignalsForCompany(
          supabase,
          company.id,
          planLimits
        )

        if (signals.length === 0) {
          // No signals = dismiss any existing active opportunities
          await dismissExistingOpportunities(supabase, company.id)
          result.dismissed++
          continue
        }

        // Calculate opportunity details
        const opportunityType = determineOpportunityType(signals)
        const confidenceScore = calculateConfidenceScore(signals)
        // 참고: recommendNextPlan/estimateMRRImpact는 'basic'/'pro'/'enterprise'
        // 영문 플랜 하이러키·달러 가격을 가정하고 있어 실제 한글 플랜명과 매칭되지
        // 않는다. 플랜 업그레이드 순서·가격을 재정의하는 것은 제품 판단이 필요한
        // 별개 사안이라, 여기서는 그대로 두어 recommended_plan은 null/mrr는 0으로
        // 남긴다(잘못된 추천을 지어내지 않고 신호 감지 자체는 정상 동작하도록 함)
        const recommendedPlan = recommendNextPlan(
          plan.name,
          opportunityType
        )

        // 그랜드파더링(가격 잠금) 중인 구독은 카탈로그 최신가가 아니라 locked_price_*로
        // 청구된다 - admin/revenue/metrics, admin/subscriptions/metrics, daily-tasks의
        // MRR 계산과 동일한 판정 기준을 여기도 적용한다(83차 QA, 4번째 누락 지점 확인).
        const priceLockValid =
          subscription.locked_plan_id === subscription.plan_id &&
          subscription.locked_price_monthly !== null &&
          subscription.locked_price_yearly !== null
        const monthlyPrice = priceLockValid ? subscription.locked_price_monthly : plan.price_monthly
        const yearlyPrice = priceLockValid ? subscription.locked_price_yearly : plan.price_yearly
        const currentMRR =
          subscription.billing_cycle === 'yearly'
            ? Number(yearlyPrice) / 12
            : Number(monthlyPrice)
        const mrrImpact = estimateMRRImpact(
          plan.name,
          recommendedPlan,
          currentMRR
        )

        // Create or update opportunity
        const upsertResult = await upsertOpportunity(supabase, {
          company_id: company.id,
          opportunity_type: opportunityType,
          current_plan: plan.name,
          recommended_plan: recommendedPlan,
          signals,
          confidence_score: confidenceScore,
          estimated_additional_mrr:
            opportunityType === 'upsell' ? mrrImpact : null,
          potential_lost_mrr:
            opportunityType === 'downsell_risk' ? Math.abs(mrrImpact) : null,
        })

        if (upsertResult.outcome === 'created') {
          result.detected++
        } else if (upsertResult.outcome === 'updated') {
          result.updated++
        } else {
          result.errors.push(
            `Failed to upsert opportunity for company ${company.id}: ${upsertResult.errorMessage}`
          )
        }
      } catch (error) {
        result.errors.push(
          `Error processing company ${company.id}: ${(error as Error).message}`
        )
      }
    }

    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.errors.push(`Detection failed: ${(error as Error).message}`)
    return result
  }
}

/**
 * Detect all signals for a specific company
 */
async function detectSignalsForCompany(
  supabase: SupabaseClient,
  companyId: string,
  planLimits: PlanLimits
): Promise<Signal[]> {
  const signals: Signal[] = []

  // Get current month's usage (KST 기준 - 서버는 UTC라 로컬 게터를 쓰면
  // KST 자정~오전9시 사이 "이번달"이 전달로 오판된다)
  const kstNow = getKSTNow()
  const currentYear = kstNow.getUTCFullYear()
  const currentMonthIndex = kstNow.getUTCMonth() // 0-indexed
  const monthStr = (year: number, monthIndex: number) => {
    const d = new Date(Date.UTC(year, monthIndex, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
  }
  const currentMonthStr = monthStr(currentYear, currentMonthIndex)

  const { data: currentUsage } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('metric_month', currentMonthStr)
    .single()

  if (!currentUsage) {
    return signals
  }

  // Get previous month's usage
  const previousMonthStr = monthStr(currentYear, currentMonthIndex - 1)

  const { data: previousUsage } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('metric_month', previousMonthStr)
    .single()

  // Detect usage limit signals
  const usageLimitSignals = detectUsageLimitSignals(
    {
      leads: currentUsage.total_leads,
      users: currentUsage.total_users,
      landing_pages: currentUsage.total_landing_pages,
    },
    planLimits
  )
  signals.push(...usageLimitSignals)

  // Detect activity growth signals (upsell opportunity)
  if (previousUsage) {
    const activityGrowthSignals = detectActivityGrowthSignals(
      currentUsage,
      previousUsage
    )
    signals.push(...activityGrowthSignals)

    // Detect low usage signals (downsell risk)
    const lowUsageSignals = detectLowUsageSignals(currentUsage, previousUsage)
    signals.push(...lowUsageSignals)
  }

  // Get recent 3 months usage for under-utilization check
  const threeMonthsAgoStr = monthStr(currentYear, currentMonthIndex - 3)

  const { data: recentMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .gte('metric_month', threeMonthsAgoStr)
    .order('metric_month', { ascending: false })
    .limit(3)

  if (recentMetrics && recentMetrics.length === 3) {
    const underUtilizationSignals = detectUnderUtilizationSignals(
      recentMetrics,
      planLimits
    )
    signals.push(...underUtilizationSignals)
  }

  // Get current and previous health scores
  // 실제 테이블명은 'health_scores'가 아니라 'customer_health_scores'이고,
  // 점수 컬럼명은 'overall_score'가 아니라 'score'이다.
  const { data: currentHealth } = await supabase
    .from('customer_health_scores')
    .select('score')
    .eq('company_id', companyId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  const { data: previousHealth } = await supabase
    .from('customer_health_scores')
    .select('score')
    .eq('company_id', companyId)
    .order('calculated_at', { ascending: false })
    .limit(2)

  if (currentHealth) {
    const prevScore =
      previousHealth && previousHealth.length > 1
        ? previousHealth[1].score
        : null

    const healthDeclineSignal = detectHealthScoreDeclineSignal(
      currentHealth.score,
      prevScore
    )

    if (healthDeclineSignal) {
      signals.push(healthDeclineSignal)
    }
  }

  return signals
}

/**
 * Create or update growth opportunity
 */
async function upsertOpportunity(
  supabase: SupabaseClient,
  opportunity: {
    company_id: string
    opportunity_type: string
    current_plan: string
    recommended_plan: string | null
    signals: Signal[]
    confidence_score: number
    estimated_additional_mrr: number | null
    potential_lost_mrr: number | null
  }
): Promise<{ outcome: 'created' | 'updated' | 'error'; errorMessage?: string }> {
  // Check if active opportunity exists
  const { data: existing } = await supabase
    .from('growth_opportunities')
    .select('id')
    .eq('company_id', opportunity.company_id)
    .eq('opportunity_type', opportunity.opportunity_type)
    .eq('status', 'active')
    .single()

  if (existing) {
    // Update existing opportunity
    const { error } = await supabase
      .from('growth_opportunities')
      .update({
        current_plan: opportunity.current_plan,
        recommended_plan: opportunity.recommended_plan,
        signals: opportunity.signals,
        confidence_score: opportunity.confidence_score,
        estimated_additional_mrr: opportunity.estimated_additional_mrr,
        potential_lost_mrr: opportunity.potential_lost_mrr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    return error ? { outcome: 'error', errorMessage: error.message } : { outcome: 'updated' }
  } else {
    // Create new opportunity
    const { error } = await supabase.from('growth_opportunities').insert({
      ...opportunity,
      status: 'active',
      detected_at: new Date().toISOString(),
    })

    return error ? { outcome: 'error', errorMessage: error.message } : { outcome: 'created' }
  }
}

/**
 * Dismiss existing active opportunities for a company
 */
async function dismissExistingOpportunities(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  await supabase
    .from('growth_opportunities')
    .update({
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
      notes: 'Auto-dismissed: signals no longer present',
    })
    .eq('company_id', companyId)
    .eq('status', 'active')
}
