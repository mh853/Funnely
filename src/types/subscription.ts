export interface SubscriptionPlanFeatures {
  dashboard?: boolean
  db_status?: boolean
  db_schedule?: boolean
  reservation_schedule?: boolean
  advanced_schedule?: boolean
  analytics?: boolean
  reports?: boolean
  priority_support?: boolean
  customization?: boolean
  custom_integration?: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: SubscriptionPlanFeatures
  max_users: number | null
  max_landing_pages: number | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ComparisonCategory {
  name: string
  features: ComparisonFeature[]
}

export interface ComparisonFeature {
  name: string
  key: string
  values: Record<string, boolean | string>
}
