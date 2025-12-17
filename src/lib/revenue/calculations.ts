import type {
  Subscription,
  RevenueCalculation,
  GrowthRate,
  BillingCycle,
} from '@/types/revenue'

/**
 * Calculate MRR from a subscription
 */
export function calculateMRR(subscription: Subscription): number {
  const { amount, billing_cycle, status } = subscription

  // Only count active subscriptions
  if (status !== 'active') {
    return 0
  }

  switch (billing_cycle) {
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
    case 'quarterly':
      return amount / 3
    default:
      return 0
  }
}

/**
 * Calculate ARR from MRR
 */
export function calculateARR(mrr: number): number {
  return mrr * 12
}

/**
 * Calculate MRR and ARR for a company
 */
export function calculateCompanyRevenue(
  subscriptions: Subscription[]
): RevenueCalculation {
  // Sum MRR from all active subscriptions
  const mrr = subscriptions.reduce((total, sub) => {
    return total + calculateMRR(sub)
  }, 0)

  const arr = calculateARR(mrr)

  return { mrr, arr }
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowthRate(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Calculate MRR and ARR growth rates
 */
export function calculateRevenueGrowthRates(
  currentRevenue: RevenueCalculation,
  previousRevenue: RevenueCalculation
): GrowthRate {
  const mrr_growth = calculateGrowthRate(
    currentRevenue.mrr,
    previousRevenue.mrr
  )
  const arr_growth = calculateGrowthRate(
    currentRevenue.arr,
    previousRevenue.arr
  )

  return { mrr_growth, arr_growth }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

/**
 * Calculate total MRR from all companies
 */
export function calculateTotalMRR(
  companyRevenues: RevenueCalculation[]
): number {
  return companyRevenues.reduce((total, revenue) => total + revenue.mrr, 0)
}

/**
 * Calculate total ARR from all companies
 */
export function calculateTotalARR(
  companyRevenues: RevenueCalculation[]
): number {
  return companyRevenues.reduce((total, revenue) => total + revenue.arr, 0)
}
