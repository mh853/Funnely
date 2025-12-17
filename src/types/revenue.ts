// Revenue Metrics Types

export interface RevenueMetric {
  id: string
  company_id: string
  mrr: number
  arr: number
  mrr_growth_rate: number | null
  arr_growth_rate: number | null
  plan_type: string | null
  billing_cycle: string | null
  calculated_at: string
  created_at: string
}

export interface RevenueCalculation {
  mrr: number
  arr: number
}

export interface GrowthRate {
  mrr_growth: number
  arr_growth: number
}

export interface CurrentRevenue {
  mrr: number
  arr: number
  mrr_growth: number
  arr_growth: number
}

export interface PlanBreakdown {
  plan_name: string
  companies: number
  mrr: number
  percentage: number
}

export interface BillingCycleBreakdown {
  cycle: string
  companies: number
  mrr: number
  percentage: number
}

export interface RevenueTrend {
  month: string
  mrr: number
  arr: number
}

export interface RevenueBreakdown {
  by_plan: PlanBreakdown[]
  by_billing_cycle: BillingCycleBreakdown[]
}

export interface RevenueMetricsResponse {
  current: CurrentRevenue
  breakdown: RevenueBreakdown
  trends: {
    last_6_months: RevenueTrend[]
  }
}

export type BillingCycle = 'monthly' | 'yearly' | 'quarterly'

export interface Subscription {
  id: string
  company_id: string
  plan_type: string
  billing_cycle: BillingCycle
  amount: number
  status: string
  started_at: string
  ended_at: string | null
  created_at: string
  updated_at: string
}
