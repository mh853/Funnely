/**
 * Common types for MediSync application
 */

export * from './database.types'

// Ad Platform specific types
export interface MetaCampaignObjective {
  OUTCOME_AWARENESS: 'OUTCOME_AWARENESS'
  OUTCOME_ENGAGEMENT: 'OUTCOME_ENGAGEMENT'
  OUTCOME_LEADS: 'OUTCOME_LEADS'
  OUTCOME_SALES: 'OUTCOME_SALES'
  OUTCOME_TRAFFIC: 'OUTCOME_TRAFFIC'
}

export interface GoogleCampaignType {
  SEARCH: 'SEARCH'
  DISPLAY: 'DISPLAY'
  SHOPPING: 'SHOPPING'
  VIDEO: 'VIDEO'
  PERFORMANCE_MAX: 'PERFORMANCE_MAX'
}

export interface KakaoCampaignObjective {
  VISIT: 'VISIT'
  CONVERSION: 'CONVERSION'
  APP_INSTALL: 'APP_INSTALL'
  MESSAGE: 'MESSAGE'
}

// Dashboard types
export interface DashboardMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  reach?: number
  frequency?: number
}

export interface PlatformMetrics extends DashboardMetrics {
  platform: 'meta' | 'kakao' | 'google'
  campaignCount: number
}

export interface DateRangeFilter {
  startDate: string
  endDate: string
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'
}

// Export types
export interface ExportConfig {
  format: 'excel' | 'pdf' | 'csv'
  metrics: string[]
  dateRange: DateRangeFilter
  campaigns?: string[]
  platforms?: Array<'meta' | 'kakao' | 'google'>
}

// Chart types
export interface TimeSeriesData {
  date: string
  [key: string]: string | number
}

export interface PieChartData {
  name: string
  value: number
  color?: string
}
