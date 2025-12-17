// Churn Analysis Types

export interface ChurnRecord {
  id: string
  company_id: string
  churned_at: string
  tenure_days: number
  last_mrr: number
  reason: string | null
  reason_category: string | null
  feedback: string | null
  was_preventable: boolean
  created_at: string
}

export interface ChurnMetrics {
  // 기본 메트릭
  period: 'monthly' | 'quarterly' | 'yearly'
  churn_rate: number // %
  churned_count: number
  total_companies_at_start: number

  // 재무 영향
  lost_mrr: number
  lost_arr: number

  // 이탈 분석
  average_tenure_days: number
  median_tenure_days: number

  // 카테고리별 분포
  reasons: ChurnReasonBreakdown[]

  // 예방 가능성
  preventable_analysis: {
    preventable_count: number
    preventable_percentage: number
    potential_saved_mrr: number
  }
}

export interface ChurnReasonBreakdown {
  category: string
  count: number
  percentage: number
  lost_mrr: number
}

export interface ChurnTrend {
  period: string // '2025-07' for monthly, '2025-Q3' for quarterly
  churn_rate: number
  churned_count: number
  lost_mrr: number
}

export interface ChurnAnalysisResponse {
  current: ChurnMetrics
  trends: {
    last_12_months: ChurnTrend[]
  }
  at_risk_companies: AtRiskCompany[]
}

export interface AtRiskCompany {
  company_id: string
  company_name: string
  risk_score: number
  risk_factors: string[]
  current_mrr: number
  tenure_days: number
  last_login: string | null
}
