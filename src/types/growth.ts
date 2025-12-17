// Phase 3.4: Growth Opportunities Types

export type OpportunityType = 'upsell' | 'downsell_risk' | 'expansion'
export type OpportunityStatus = 'active' | 'contacted' | 'converted' | 'dismissed'

// Signal Types
export type SignalType =
  | 'usage_limit'
  | 'feature_attempt'
  | 'activity_growth'
  | 'team_expansion'
  | 'low_usage'
  | 'under_utilization'
  | 'health_score_decline'

export interface UsageLimitSignal {
  type: 'usage_limit'
  resource: 'leads' | 'users' | 'landing_pages'
  current: number
  limit: number
  percentage: number
  message: string
}

export interface FeatureAttemptSignal {
  type: 'feature_attempt'
  feature: string
  required_plan: string
  attempt_count: number
  last_attempt?: string
  message: string
}

export interface ActivityGrowthSignal {
  type: 'activity_growth'
  metric: 'leads' | 'logins' | 'features'
  growth_rate: number
  previous_value: number
  current_value: number
  message: string
}

export interface TeamExpansionSignal {
  type: 'team_expansion'
  new_users_count: number
  period_days: number
  message: string
}

export interface LowUsageSignal {
  type: 'low_usage'
  metric: 'leads' | 'logins' | 'features'
  decline_rate: number
  previous_value: number
  current_value: number
  message: string
}

export interface UnderUtilizationSignal {
  type: 'under_utilization'
  resource: 'leads' | 'users' | 'landing_pages'
  usage_percentage: number
  consecutive_months: number
  message: string
}

export interface HealthScoreDeclineSignal {
  type: 'health_score_decline'
  current_score: number
  previous_score: number
  decline: number
  message: string
}

export type Signal =
  | UsageLimitSignal
  | FeatureAttemptSignal
  | ActivityGrowthSignal
  | TeamExpansionSignal
  | LowUsageSignal
  | UnderUtilizationSignal
  | HealthScoreDeclineSignal

// Database Models
export interface GrowthOpportunity {
  id: string
  company_id: string
  opportunity_type: OpportunityType
  current_plan: string
  recommended_plan: string | null
  signals: Signal[]
  confidence_score: number
  estimated_additional_mrr: number | null
  potential_lost_mrr: number | null
  status: OpportunityStatus
  contacted_at: string | null
  resolved_at: string | null
  notes: string | null
  detected_at: string
  created_at: string
  updated_at: string
}

export interface UsageMetrics {
  id: string
  company_id: string
  total_leads: number
  total_users: number
  total_landing_pages: number
  api_calls_count: number
  active_days_count: number
  last_activity_at: string | null
  metric_month: string
  created_at: string
}

// API Response Types
export interface OpportunityWithCompany extends GrowthOpportunity {
  company: {
    id: string
    name: string
    current_plan: string
    current_mrr: number
  }
}

export interface OpportunitiesSummary {
  total_opportunities: number
  upsell_count: number
  downsell_risk_count: number
  expansion_count: number
  total_potential_mrr: number
  total_at_risk_mrr: number
  avg_confidence_score: number
}

export interface GrowthOpportunitiesResponse {
  opportunities: OpportunityWithCompany[]
  summary: OpportunitiesSummary
}

// API Request Types
export interface UpdateOpportunityStatusRequest {
  status: OpportunityStatus
  notes?: string
}

export interface DetectOpportunitiesResponse {
  success: boolean
  detected: number
  updated: number
  dismissed: number
}

// Plan Limits
export interface PlanLimits {
  leads: number
  users: number
  landing_pages: number
  features: string[]
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  basic: {
    leads: 1000,
    users: 3,
    landing_pages: 5,
    features: ['basic_analytics', 'form_builder'],
  },
  pro: {
    leads: 5000,
    users: 10,
    landing_pages: 20,
    features: [
      'basic_analytics',
      'form_builder',
      'api_integration',
      'advanced_analytics',
      'custom_domain',
    ],
  },
  enterprise: {
    leads: -1, // unlimited
    users: -1,
    landing_pages: -1,
    features: [
      'basic_analytics',
      'form_builder',
      'api_integration',
      'advanced_analytics',
      'custom_domain',
      'priority_support',
      'custom_integrations',
      'white_label',
    ],
  },
}

// Helper Functions
export function getPlanLimits(planName: string): PlanLimits | null {
  const normalizedPlan = planName.toLowerCase()
  return PLAN_LIMITS[normalizedPlan] || null
}

export function isUnlimitedPlan(planName: string): boolean {
  const limits = getPlanLimits(planName)
  return limits ? limits.leads === -1 : false
}

export function hasFeature(planName: string, featureName: string): boolean {
  const limits = getPlanLimits(planName)
  return limits ? limits.features.includes(featureName) : false
}
