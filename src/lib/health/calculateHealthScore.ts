import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Health Score Calculation System
 *
 * Overall Score = (
 *   Engagement Score * 0.35 +
 *   Product Usage Score * 0.30 +
 *   Support Score * 0.20 +
 *   Payment Score * 0.15
 * )
 */

// Score weights
const WEIGHTS = {
  ENGAGEMENT: 0.35, // 35%
  PRODUCT_USAGE: 0.3, // 30%
  SUPPORT: 0.2, // 20%
  PAYMENT: 0.15, // 15%
} as const

// Health status thresholds
const HEALTH_THRESHOLDS = {
  EXCELLENT: 80,
  HEALTHY: 60,
  AT_RISK: 40,
} as const

// Time windows for calculations
const TIME_WINDOWS = {
  ACTIVE_DAYS: 30,
  LOGIN_WINDOW: 7,
  STALL_THRESHOLD: 7,
} as const

export interface HealthScoreResult {
  overall_score: number
  engagement_score: number
  product_usage_score: number
  support_score: number
  payment_score: number
  health_status: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  risk_factors: RiskFactor[]
  recommendations: Recommendation[]
}

export interface RiskFactor {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high'
  action: string
  rationale: string
  expected_impact: string
}

/**
 * Calculate engagement score (0-100)
 * Based on: login frequency, active users percentage, last activity recency
 */
export async function calculateEngagementScore(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<{ score: number; riskFactors: RiskFactor[]; recommendations: Recommendation[] }> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - TIME_WINDOWS.ACTIVE_DAYS * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - TIME_WINDOWS.LOGIN_WINDOW * 24 * 60 * 60 * 1000)

  const riskFactors: RiskFactor[] = []
  const recommendations: Recommendation[] = []

  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (!totalUsers || totalUsers === 0) {
    riskFactors.push({
      type: 'no_users',
      severity: 'critical',
      description: 'No users in company',
      impact: 'Cannot assess engagement without users',
    })
    return { score: 0, riskFactors, recommendations }
  }

  // Get active users (logged in last 30 days)
  const { count: activeUsers } = await supabase
    .from('audit_logs')
    .select('user_id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('action', 'admin.login')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Get recent logins (last 7 days)
  const { count: recentLogins } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('action', 'admin.login')
    .gte('created_at', sevenDaysAgo.toISOString())

  // Get last activity
  const { data: lastActivity } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Calculate metrics
  const activeUserPercentage = totalUsers > 0 ? (activeUsers || 0) / totalUsers : 0
  const loginFrequency = recentLogins || 0
  const daysSinceLastActivity = lastActivity
    ? Math.floor((now.getTime() - new Date((lastActivity as any).created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Scoring components (0-100)
  let score = 0

  // Active users (0-40 points)
  score += Math.min(40, activeUserPercentage * 100 * 0.4)

  // Login frequency (0-35 points) - 1+ login per day = max
  score += Math.min(35, (loginFrequency / 7) * 35)

  // Recency (0-25 points)
  if (daysSinceLastActivity === 0) score += 25
  else if (daysSinceLastActivity <= 1) score += 20
  else if (daysSinceLastActivity <= 3) score += 15
  else if (daysSinceLastActivity <= 7) score += 10
  else if (daysSinceLastActivity <= 14) score += 5

  // Risk factors
  if (activeUserPercentage < 0.2) {
    riskFactors.push({
      type: 'low_active_users',
      severity: 'high',
      description: `Only ${Math.round(activeUserPercentage * 100)}% of users active in last 30 days`,
      impact: 'Low user adoption and engagement',
    })
    recommendations.push({
      priority: 'high',
      action: 'Conduct user onboarding review and re-engagement campaign',
      rationale: 'Low percentage of active users indicates poor adoption',
      expected_impact: 'Increase active user base by 15-20%',
    })
  }

  if (daysSinceLastActivity > 7) {
    riskFactors.push({
      type: 'inactive_company',
      severity: daysSinceLastActivity > 14 ? 'critical' : 'high',
      description: `No activity for ${daysSinceLastActivity} days`,
      impact: 'High churn risk',
    })
    recommendations.push({
      priority: 'high',
      action: 'Immediate outreach to company admin',
      rationale: 'Extended inactivity suggests abandonment',
      expected_impact: 'Prevent churn through re-engagement',
    })
  }

  if (loginFrequency < 3) {
    riskFactors.push({
      type: 'low_login_frequency',
      severity: 'medium',
      description: `Only ${loginFrequency} logins in last 7 days`,
      impact: 'Low engagement with platform',
    })
  }

  return {
    score: Math.round(score),
    riskFactors,
    recommendations,
  }
}

/**
 * Calculate product usage score (0-100)
 * Based on: feature adoption, landing pages created, leads generated
 */
export async function calculateProductUsageScore(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<{ score: number; riskFactors: RiskFactor[]; recommendations: Recommendation[] }> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - TIME_WINDOWS.ACTIVE_DAYS * 24 * 60 * 60 * 1000)

  const riskFactors: RiskFactor[] = []
  const recommendations: Recommendation[] = []

  // Get landing pages count
  const { count: totalLandingPages } = await supabase
    .from('landing_pages')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const { count: activeLandingPages } = await supabase
    .from('landing_pages')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'published')

  // Get leads count
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const { count: recentLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Get feature usage
  const { count: featuresUsed } = await supabase
    .from('feature_usage')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gt('usage_count', 0)

  // Calculate score
  let score = 0

  // Landing pages (0-30 points)
  if (totalLandingPages && totalLandingPages > 0) {
    score += Math.min(30, totalLandingPages * 5)
  }

  // Active landing pages bonus (0-10 points)
  if (activeLandingPages && activeLandingPages > 0) {
    score += Math.min(10, activeLandingPages * 2)
  }

  // Leads generated (0-40 points)
  if (totalLeads && totalLeads > 0) {
    score += Math.min(40, Math.log10(totalLeads + 1) * 20)
  }

  // Recent leads activity (0-10 points)
  if (recentLeads && recentLeads > 0) {
    score += Math.min(10, recentLeads * 0.5)
  }

  // Feature adoption (0-10 points)
  if (featuresUsed && featuresUsed > 0) {
    score += Math.min(10, featuresUsed * 2)
  }

  // Risk factors
  if (!totalLandingPages || totalLandingPages === 0) {
    riskFactors.push({
      type: 'no_landing_pages',
      severity: 'high',
      description: 'No landing pages created',
      impact: 'Not using core product functionality',
    })
    recommendations.push({
      priority: 'high',
      action: 'Schedule onboarding call to help create first landing page',
      rationale: 'Landing pages are core product value',
      expected_impact: 'Activate product usage and demonstrate value',
    })
  }

  if (!activeLandingPages || activeLandingPages === 0) {
    if (totalLandingPages && totalLandingPages > 0) {
      riskFactors.push({
        type: 'no_active_landing_pages',
        severity: 'medium',
        description: 'Landing pages created but none published',
        impact: 'Not realizing product value',
      })
      recommendations.push({
        priority: 'medium',
        action: 'Help publish first landing page',
        rationale: 'Created pages but not activated',
        expected_impact: 'Start generating leads',
      })
    }
  }

  if (!totalLeads || totalLeads === 0) {
    riskFactors.push({
      type: 'no_leads',
      severity: 'high',
      description: 'No leads generated yet',
      impact: 'No ROI demonstrated',
    })
    recommendations.push({
      priority: 'high',
      action: 'Review landing page performance and optimization',
      rationale: 'No leads = no value realization',
      expected_impact: 'Generate first leads and demonstrate ROI',
    })
  }

  if ((!recentLeads || recentLeads === 0) && totalLeads && totalLeads > 0) {
    riskFactors.push({
      type: 'declining_leads',
      severity: 'medium',
      description: 'No new leads in last 30 days',
      impact: 'Declining product value',
    })
  }

  return {
    score: Math.round(score),
    riskFactors,
    recommendations,
  }
}

/**
 * Calculate support score (0-100)
 * Based on: open tickets, response times, issue severity
 */
export async function calculateSupportScore(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<{ score: number; riskFactors: RiskFactor[]; recommendations: Recommendation[] }> {
  const riskFactors: RiskFactor[] = []
  const recommendations: Recommendation[] = []

  // Note: Support ticket system not implemented yet
  // For now, return perfect score with note
  const score = 100

  // When support system is implemented, check:
  // - Open ticket count
  // - Average resolution time
  // - Critical issue count
  // - Customer satisfaction scores

  return {
    score,
    riskFactors,
    recommendations,
  }
}

/**
 * Calculate payment score (0-100)
 * Based on: subscription status, payment history, overdue invoices
 */
export async function calculatePaymentScore(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<{ score: number; riskFactors: RiskFactor[]; recommendations: Recommendation[] }> {
  const riskFactors: RiskFactor[] = []
  const recommendations: Recommendation[] = []

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let score = 100

  if (!subscription) {
    // No subscription - neutral score
    score = 50
    riskFactors.push({
      type: 'no_subscription',
      severity: 'medium',
      description: 'No active subscription',
      impact: 'Limited product access',
    })
    return { score, riskFactors, recommendations }
  }

  // Score based on subscription status
  switch ((subscription as any).status) {
    case 'active':
      score = 100
      break
    case 'trialing':
      score = 90
      break
    case 'past_due':
      score = 40
      riskFactors.push({
        type: 'payment_past_due',
        severity: 'high',
        description: 'Payment is past due',
        impact: 'High churn risk',
      })
      recommendations.push({
        priority: 'high',
        action: 'Contact customer about payment issue',
        rationale: 'Past due payments indicate financial issues or dissatisfaction',
        expected_impact: 'Resolve payment and retain customer',
      })
      break
    case 'canceled':
      score = 0
      riskFactors.push({
        type: 'subscription_canceled',
        severity: 'critical',
        description: 'Subscription has been canceled',
        impact: 'Customer churned',
      })
      break
    case 'incomplete':
      score = 30
      riskFactors.push({
        type: 'incomplete_subscription',
        severity: 'high',
        description: 'Subscription setup incomplete',
        impact: 'Onboarding not completed',
      })
      break
    default:
      score = 50
  }

  // Check if subscription is expiring soon
  if ((subscription as any).current_period_end) {
    const daysUntilExpiry = Math.floor(
      (new Date((subscription as any).current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      riskFactors.push({
        type: 'subscription_expiring',
        severity: 'medium',
        description: `Subscription expires in ${daysUntilExpiry} days`,
        impact: 'Renewal risk',
      })
      recommendations.push({
        priority: 'medium',
        action: 'Proactive renewal outreach',
        rationale: 'Subscription expiring soon',
        expected_impact: 'Ensure smooth renewal',
      })
    }
  }

  return {
    score,
    riskFactors,
    recommendations,
  }
}

/**
 * Determine health status from overall score
 */
export function determineHealthStatus(
  overallScore: number
): 'critical' | 'at_risk' | 'healthy' | 'excellent' {
  if (overallScore >= HEALTH_THRESHOLDS.EXCELLENT) return 'excellent'
  if (overallScore >= HEALTH_THRESHOLDS.HEALTHY) return 'healthy'
  if (overallScore >= HEALTH_THRESHOLDS.AT_RISK) return 'at_risk'
  return 'critical'
}

/**
 * Main health score calculation function
 */
export async function calculateHealthScore(
  companyId: string,
  supabase: SupabaseClient<any>
): Promise<HealthScoreResult> {
  // Calculate all component scores
  const engagement = await calculateEngagementScore(companyId, supabase)
  const productUsage = await calculateProductUsageScore(companyId, supabase)
  const support = await calculateSupportScore(companyId, supabase)
  const payment = await calculatePaymentScore(companyId, supabase)

  // Calculate weighted overall score
  const overallScore = Math.round(
    engagement.score * WEIGHTS.ENGAGEMENT +
      productUsage.score * WEIGHTS.PRODUCT_USAGE +
      support.score * WEIGHTS.SUPPORT +
      payment.score * WEIGHTS.PAYMENT
  )

  // Determine health status
  const healthStatus = determineHealthStatus(overallScore)

  // Combine all risk factors and recommendations
  const riskFactors = [
    ...engagement.riskFactors,
    ...productUsage.riskFactors,
    ...support.riskFactors,
    ...payment.riskFactors,
  ]

  const recommendations = [
    ...engagement.recommendations,
    ...productUsage.recommendations,
    ...support.recommendations,
    ...payment.recommendations,
  ]

  return {
    overall_score: overallScore,
    engagement_score: engagement.score,
    product_usage_score: productUsage.score,
    support_score: support.score,
    payment_score: payment.score,
    health_status: healthStatus,
    risk_factors: riskFactors,
    recommendations: recommendations,
  }
}
