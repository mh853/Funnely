// Phase 3.4: Growth Opportunity Detection Engine

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
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
import type { Signal, GrowthOpportunity, UsageMetrics } from '@/types/growth'
import { getPlanLimits } from '@/types/growth'

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
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select(
        `
        id,
        name,
        subscriptions!inner (
          id,
          plan_name,
          status,
          amount
        )
      `
      )
      .eq('subscriptions.status', 'active')

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
        const subscription = (company as any).subscriptions[0]
        if (!subscription) continue

        // Detect signals for this company
        const signals = await detectSignalsForCompany(
          supabase,
          company.id,
          subscription.plan_name
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
        const recommendedPlan = recommendNextPlan(
          subscription.plan_name,
          opportunityType
        )

        const currentMRR = subscription.amount
        const mrrImpact = estimateMRRImpact(
          subscription.plan_name,
          recommendedPlan,
          currentMRR
        )

        // Create or update opportunity
        const created = await upsertOpportunity(supabase, {
          company_id: company.id,
          opportunity_type: opportunityType,
          current_plan: subscription.plan_name,
          recommended_plan: recommendedPlan,
          signals,
          confidence_score: confidenceScore,
          estimated_additional_mrr:
            opportunityType === 'upsell' ? mrrImpact : null,
          potential_lost_mrr:
            opportunityType === 'downsell_risk' ? Math.abs(mrrImpact) : null,
        })

        if (created) {
          result.detected++
        } else {
          result.updated++
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
  planName: string
): Promise<Signal[]> {
  const signals: Signal[] = []

  // Get current month's usage
  const currentMonth = new Date()
  currentMonth.setDate(1) // First day of current month

  const { data: currentUsage } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('metric_month', currentMonth.toISOString().split('T')[0])
    .single()

  if (!currentUsage) {
    return signals
  }

  // Get previous month's usage
  const previousMonth = new Date(currentMonth)
  previousMonth.setMonth(previousMonth.getMonth() - 1)

  const { data: previousUsage } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .eq('metric_month', previousMonth.toISOString().split('T')[0])
    .single()

  // Get plan limits
  const planLimits = getPlanLimits(planName)
  if (!planLimits) {
    return signals
  }

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
  const threeMonthsAgo = new Date(currentMonth)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: recentMetrics } = await supabase
    .from('usage_metrics')
    .select('*')
    .eq('company_id', companyId)
    .gte('metric_month', threeMonthsAgo.toISOString().split('T')[0])
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
  const { data: currentHealth } = await supabase
    .from('health_scores')
    .select('overall_score')
    .eq('company_id', companyId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  const { data: previousHealth } = await supabase
    .from('health_scores')
    .select('overall_score')
    .eq('company_id', companyId)
    .order('calculated_at', { ascending: false })
    .limit(2)

  if (currentHealth) {
    const prevScore =
      previousHealth && previousHealth.length > 1
        ? previousHealth[1].overall_score
        : null

    const healthDeclineSignal = detectHealthScoreDeclineSignal(
      currentHealth.overall_score,
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
): Promise<boolean> {
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

    return error === null ? false : true
  } else {
    // Create new opportunity
    const { error } = await supabase.from('growth_opportunities').insert({
      ...opportunity,
      status: 'active',
      detected_at: new Date().toISOString(),
    })

    return error === null
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
