// Phase 3.4: Signal Detection Logic for Growth Opportunities

import type {
  Signal,
  UsageLimitSignal,
  FeatureAttemptSignal,
  ActivityGrowthSignal,
  LowUsageSignal,
  UnderUtilizationSignal,
  HealthScoreDeclineSignal,
  UsageMetrics,
  PlanLimits,
} from '@/types/growth'
import { getPlanLimits } from '@/types/growth'

// ============================================================================
// Upsell Signal Detection
// ============================================================================

/**
 * Detect usage limit signals (90% or more of plan limit)
 */
export function detectUsageLimitSignals(
  currentUsage: {
    leads: number
    users: number
    landing_pages: number
  },
  planLimits: PlanLimits
): UsageLimitSignal[] {
  const signals: UsageLimitSignal[] = []
  const threshold = 0.9 // 90%

  // Check leads
  if (planLimits.leads > 0) {
    const percentage = (currentUsage.leads / planLimits.leads) * 100
    if (percentage >= threshold * 100) {
      signals.push({
        type: 'usage_limit',
        resource: 'leads',
        current: currentUsage.leads,
        limit: planLimits.leads,
        percentage: Math.round(percentage),
        message: `리드 수 ${Math.round(percentage)}% 사용 중 (${currentUsage.leads}/${planLimits.leads})`,
      })
    }
  }

  // Check users
  if (planLimits.users > 0) {
    const percentage = (currentUsage.users / planLimits.users) * 100
    if (percentage >= threshold * 100) {
      signals.push({
        type: 'usage_limit',
        resource: 'users',
        current: currentUsage.users,
        limit: planLimits.users,
        percentage: Math.round(percentage),
        message: `사용자 수 ${Math.round(percentage)}% 사용 중 (${currentUsage.users}/${planLimits.users})`,
      })
    }
  }

  // Check landing pages
  if (planLimits.landing_pages > 0) {
    const percentage =
      (currentUsage.landing_pages / planLimits.landing_pages) * 100
    if (percentage >= threshold * 100) {
      signals.push({
        type: 'usage_limit',
        resource: 'landing_pages',
        current: currentUsage.landing_pages,
        limit: planLimits.landing_pages,
        percentage: Math.round(percentage),
        message: `랜딩페이지 ${Math.round(percentage)}% 사용 중 (${currentUsage.landing_pages}/${planLimits.landing_pages})`,
      })
    }
  }

  return signals
}

/**
 * Detect activity growth signals (30% or more increase)
 */
export function detectActivityGrowthSignals(
  currentMetrics: UsageMetrics,
  previousMetrics: UsageMetrics | null
): ActivityGrowthSignal[] {
  if (!previousMetrics) return []

  const signals: ActivityGrowthSignal[] = []
  const threshold = 0.3 // 30% increase

  // Check leads growth
  if (previousMetrics.total_leads > 0) {
    const growthRate =
      (currentMetrics.total_leads - previousMetrics.total_leads) /
      previousMetrics.total_leads
    if (growthRate >= threshold) {
      signals.push({
        type: 'activity_growth',
        metric: 'leads',
        growth_rate: Math.round(growthRate * 100),
        previous_value: previousMetrics.total_leads,
        current_value: currentMetrics.total_leads,
        message: `리드 생성 ${Math.round(growthRate * 100)}% 증가 (지난달 ${previousMetrics.total_leads} → 이번달 ${currentMetrics.total_leads})`,
      })
    }
  }

  return signals
}

// ============================================================================
// Downsell Risk Signal Detection
// ============================================================================

/**
 * Detect low usage signals (50% or more decrease)
 */
export function detectLowUsageSignals(
  currentMetrics: UsageMetrics,
  previousMetrics: UsageMetrics | null
): LowUsageSignal[] {
  if (!previousMetrics) return []

  const signals: LowUsageSignal[] = []
  const threshold = -0.5 // 50% decrease

  // Check leads decline
  if (previousMetrics.total_leads > 0) {
    const declineRate =
      (currentMetrics.total_leads - previousMetrics.total_leads) /
      previousMetrics.total_leads
    if (declineRate <= threshold) {
      signals.push({
        type: 'low_usage',
        metric: 'leads',
        decline_rate: Math.round(declineRate * 100),
        previous_value: previousMetrics.total_leads,
        current_value: currentMetrics.total_leads,
        message: `리드 생성 ${Math.abs(Math.round(declineRate * 100))}% 감소 (지난달 ${previousMetrics.total_leads} → 이번달 ${currentMetrics.total_leads})`,
      })
    }
  }

  return signals
}

/**
 * Detect under-utilization signals (using less than 30% for 3+ months)
 */
export function detectUnderUtilizationSignals(
  recentMetrics: UsageMetrics[],
  planLimits: PlanLimits
): UnderUtilizationSignal[] {
  const signals: UnderUtilizationSignal[] = []
  const threshold = 0.3 // 30%
  const minConsecutiveMonths = 3

  if (recentMetrics.length < minConsecutiveMonths) return signals

  // Check leads utilization
  if (planLimits.leads > 0) {
    const consecutiveMonths = recentMetrics.filter(
      (m) => m.total_leads / planLimits.leads < threshold
    ).length

    if (consecutiveMonths >= minConsecutiveMonths) {
      const avgUsage =
        recentMetrics.reduce((sum, m) => sum + m.total_leads, 0) /
        recentMetrics.length
      const usagePercentage = (avgUsage / planLimits.leads) * 100

      signals.push({
        type: 'under_utilization',
        resource: 'leads',
        usage_percentage: Math.round(usagePercentage),
        consecutive_months: consecutiveMonths,
        message: `${consecutiveMonths}개월 연속 리드 수 ${Math.round(usagePercentage)}% 미만 사용 (평균 ${Math.round(avgUsage)}/${planLimits.leads})`,
      })
    }
  }

  return signals
}

/**
 * Detect health score decline signals
 */
export function detectHealthScoreDeclineSignal(
  currentScore: number,
  previousScore: number | null
): HealthScoreDeclineSignal | null {
  const threshold = 60 // Score below 60 is risky

  if (currentScore < threshold) {
    const decline = previousScore ? previousScore - currentScore : 0

    return {
      type: 'health_score_decline',
      current_score: currentScore,
      previous_score: previousScore || 0,
      decline,
      message: previousScore
        ? `고객 건강도 ${currentScore}점으로 하락 (이전 ${previousScore}점)`
        : `고객 건강도 ${currentScore}점 - 주의 필요`,
    }
  }

  return null
}

// ============================================================================
// Confidence Score Calculation
// ============================================================================

const SIGNAL_WEIGHTS: Record<Signal['type'], number> = {
  usage_limit: 30,
  feature_attempt: 25,
  activity_growth: 20,
  team_expansion: 15,
  low_usage: 30,
  under_utilization: 25,
  health_score_decline: 20,
}

/**
 * Calculate confidence score based on detected signals
 */
export function calculateConfidenceScore(signals: Signal[]): number {
  let totalScore = 0

  signals.forEach((signal) => {
    const weight = SIGNAL_WEIGHTS[signal.type] || 0
    totalScore += weight
  })

  return Math.min(totalScore, 100)
}

// ============================================================================
// Opportunity Type Determination
// ============================================================================

/**
 * Determine opportunity type based on signals
 */
export function determineOpportunityType(
  signals: Signal[]
): 'upsell' | 'downsell_risk' {
  const upsellSignals = signals.filter((s) =>
    ['usage_limit', 'feature_attempt', 'activity_growth', 'team_expansion'].includes(
      s.type
    )
  )

  const downsellSignals = signals.filter((s) =>
    ['low_usage', 'under_utilization', 'health_score_decline'].includes(s.type)
  )

  // If we have more upsell signals, it's an upsell opportunity
  // Otherwise, it's a downsell risk
  return upsellSignals.length > downsellSignals.length
    ? 'upsell'
    : 'downsell_risk'
}

/**
 * Recommend next plan based on current plan and signals
 */
export function recommendNextPlan(
  currentPlan: string,
  opportunityType: 'upsell' | 'downsell_risk'
): string | null {
  const planHierarchy = ['basic', 'pro', 'enterprise']
  const normalizedCurrent = currentPlan.toLowerCase()
  const currentIndex = planHierarchy.indexOf(normalizedCurrent)

  if (currentIndex === -1) return null

  if (opportunityType === 'upsell') {
    // Recommend next higher plan
    const nextIndex = currentIndex + 1
    return nextIndex < planHierarchy.length
      ? planHierarchy[nextIndex].charAt(0).toUpperCase() +
          planHierarchy[nextIndex].slice(1)
      : null
  } else {
    // Recommend next lower plan
    const prevIndex = currentIndex - 1
    return prevIndex >= 0
      ? planHierarchy[prevIndex].charAt(0).toUpperCase() +
          planHierarchy[prevIndex].slice(1)
      : null
  }
}

/**
 * Estimate MRR impact based on plan change
 */
export function estimateMRRImpact(
  currentPlan: string,
  recommendedPlan: string | null,
  currentMRR: number
): number {
  if (!recommendedPlan) return 0

  // Simplified pricing assumptions
  const planPricing: Record<string, number> = {
    basic: 50,
    pro: 250,
    enterprise: 1000,
  }

  const currentPrice =
    planPricing[currentPlan.toLowerCase()] || currentMRR
  const recommendedPrice =
    planPricing[recommendedPlan.toLowerCase()] || currentMRR

  return recommendedPrice - currentPrice
}
