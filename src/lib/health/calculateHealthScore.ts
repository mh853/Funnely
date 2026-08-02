import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { pickCurrentSubscription } from '@/lib/subscription-current'

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

  // profiles 테이블은 존재하지 않으며 실제 사용자 테이블은 users다. 로그인
  // 이력도 audit_logs가 아니라 users.last_login(on_auth_signin 트리거로 자동
  // 갱신됨)로 판단해야 한다 — audit_logs에는 company_id 컬럼 자체가 없어 매번
  // 조회가 실패했고, 그마저도 이 프로젝트에서 쓰는 admin 감사로그 용도라
  // 일반 사용자 로그인과는 무관하다.
  const { data: companyUsers, count: totalUsers } = await supabase
    .from('users')
    .select('id, last_login', { count: 'exact' })
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

  const lastLogins = (companyUsers || [])
    .map((u: any) => u.last_login)
    .filter(Boolean)
    .map((d: string) => new Date(d))

  // Active users (logged in last 30 days)
  const activeUsers = lastLogins.filter((d) => d >= thirtyDaysAgo).length

  // Recent logins (last 7 days) — 로그인 "횟수"가 아닌 "최근 7일 내 로그인한
  // 사용자 수"로 근사한다 (last_login은 사용자당 최근 1회만 저장됨)
  const recentLogins = lastLogins.filter((d) => d >= sevenDaysAgo).length

  const lastActivityDate = lastLogins.length > 0
    ? new Date(Math.max(...lastLogins.map((d) => d.getTime())))
    : null

  // Calculate metrics
  const activeUserPercentage = totalUsers > 0 ? activeUsers / totalUsers : 0
  const loginFrequency = recentLogins
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Scoring components (0-100)
  let score = 0

  // Active users (0-40 points)
  score += Math.min(40, activeUserPercentage * 100 * 0.4)

  // Login frequency (0-35 points) - 최근 7일 내 로그인한 사용자 비율.
  // last_login이 사용자당 최근 1회만 저장되어 "하루 몇 번 로그인했는지"는 셀 수
  // 없으므로, 원래 있던 "(loginFrequency / 7) * 35"(7일치 로그인 횟수를 가정한 계산)는
  // recentLogins가 사실 "최근 7일 내 로그인한 서로 다른 사용자 수"(회사 전체
  // 인원수를 절대 못 넘음)라는 실제 의미와 안 맞았다 - 인원이 7명 미만인 회사는
  // 전 직원이 매일 로그인해도 이 만점(35점)에 절대 도달할 수 없었다(라이브 DB
  // 확인 결과 현재 모든 회사가 7명 미만). 위 activeUserPercentage와 동일하게
  // 회사 인원 대비 비율로 정규화해 회사 규모와 무관하게 만점 도달이 가능하도록 함.
  const recentLoginRate = totalUsers > 0 ? recentLogins / totalUsers : 0
  score += Math.min(35, recentLoginRate * 35)

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

  // status='published'만으로는 타이머 만료로 자동 비활성화된(is_active=false)
  // 페이지까지 "활성"으로 오집계한다 - 실제 "라이브" 판정은 앱 전역(middleware.ts,
  // landing-pages/route.ts)에서 항상 두 컬럼을 함께 확인한다(54차 QA 라이브 확인)
  const { count: activeLandingPages } = await supabase
    .from('landing_pages')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'published')
    .eq('is_active', true)

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

  // Get feature usage (실제 테이블명은 feature_usage가 아니라 feature_usage_tracking)
  const { count: featuresUsed } = await supabase
    .from('feature_usage_tracking')
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

  // 이 함수가 "고객지원 시스템 미구현"이라며 무조건 100점을 반환하고 있었으나
  // support_tickets는 실제로 정식 운영 중인 테이블이다(54차 QA: 미해결 티켓
  // 223일 방치 사례에도 support_score=100 고정으로 산출되던 것을 라이브로 확인).
  const { data: openTickets } = await supabase
    .from('support_tickets')
    .select('id, priority, created_at')
    .eq('company_id', companyId)
    .in('status', ['open', 'in_progress'])

  let score = 100
  const openCount = openTickets?.length ?? 0

  if (openCount > 0) {
    score -= Math.min(40, openCount * 10)

    const now = Date.now()
    const oldestOpenDays = Math.max(
      ...(openTickets as any[]).map((t) =>
        Math.floor((now - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
      )
    )

    if (oldestOpenDays >= 14) {
      score -= 20
      riskFactors.push({
        type: 'support_ticket_stale',
        severity: 'high',
        description: `${oldestOpenDays}일간 미해결된 문의가 있음`,
        impact: '고객 불만 누적 및 이탈 위험',
      })
      recommendations.push({
        priority: 'high',
        action: '장기 미해결 문의 우선 처리',
        rationale: '오래 방치된 문의는 이탈 위험을 높임',
        expected_impact: '고객 만족도 회복',
      })
    }

    const urgentCount = (openTickets as any[]).filter((t) => t.priority === 'urgent').length
    if (urgentCount > 0) {
      score -= 15
      riskFactors.push({
        type: 'support_ticket_urgent',
        severity: 'critical',
        description: `긴급 문의 ${urgentCount}건 미해결`,
        impact: '즉각 대응 필요',
      })
    }

    if (openCount >= 3) {
      riskFactors.push({
        type: 'support_ticket_backlog',
        severity: 'medium',
        description: `미해결 문의 ${openCount}건`,
        impact: '고객 만족도 저하 위험',
      })
    }
  }

  score = Math.max(0, Math.min(100, score))

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
  // 이 앱의 실제 테이블은 'subscriptions'가 아니라 'company_subscriptions'다.
  // 존재하지 않는 테이블을 조회하면 매번 에러와 함께 빈 결과가 돌아와, 아래
  // "구독 없음" 분기가 실제 결제 상태와 무관하게 모든 회사에 대해 항상 실행됐다.
  //
  // company_subscriptions는 플랜변경/재구독마다 새 행이 쌓이는 이력 테이블이라,
  // created_at 기준 최신 행 1건만 가져오면(과거 방식) 실제 유효한 구독이 아니라
  // 그보다 나중에 생성된 만료/취소 행이 뽑혀 헬스스코어가 실제와 다르게 계산될 수
  // 있다(60차 QA 확인). pickCurrentSubscription과 동일한 우선순위로 골라야 한다.
  const { data: candidateSubs } = await supabase
    .from('company_subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  const subscription = pickCurrentSubscription((candidateSubs as any[]) ?? [])

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
  // company_subscriptions.status의 실제 값: active/trial/expired/cancelled/suspended/past_due
  // (Stripe식 'trialing'/'canceled'/'incomplete'가 아님 — 실제로는 절대 매치되지 않아
  // 모든 상태가 default: score = 50으로 빠지던 버그)
  switch ((subscription as any).status) {
    case 'active':
      score = 100
      break
    case 'trial':
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
    case 'cancelled':
      score = 0
      riskFactors.push({
        type: 'subscription_canceled',
        severity: 'critical',
        description: 'Subscription has been canceled',
        impact: 'Customer churned',
      })
      break
    case 'expired':
      score = 10
      riskFactors.push({
        type: 'subscription_expired',
        severity: 'critical',
        description: 'Subscription has expired',
        impact: 'Customer lost access',
      })
      break
    case 'suspended':
      score = 30
      riskFactors.push({
        type: 'subscription_suspended',
        severity: 'high',
        description: 'Subscription is suspended',
        impact: 'Onboarding not completed',
      })
      break
    default:
      score = 50
  }

  // Check if subscription is expiring soon
  // trial 상태는 current_period_end가 아니라 trial_end_date를 사용하므로 함께 확인한다.
  const periodEnd = (subscription as any).current_period_end ?? (subscription as any).trial_end_date
  if (periodEnd) {
    const daysUntilExpiry = Math.floor(
      (new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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

/**
 * DB에 실제로 존재하는 테이블은 'health_scores'가 아니라 'customer_health_scores'이며,
 * 컬럼 구조도 다르다 (overall_score 등 개별 점수 컬럼이 아니라 단일 score + risk_level +
 * metrics(JSONB)). 이 함수는 HealthScoreResult를 실제 테이블 행 형태로 변환한다.
 */
export function toCustomerHealthScoreRow(
  companyId: string,
  result: HealthScoreResult
): {
  company_id: string
  score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  metrics: Record<string, any>
  calculated_at: string
} {
  // admin/health/page.tsx의 RISK_LEVEL_TO_STATUS 역매핑(high: 'at_risk')이 이미
  // risk_level='high'가 at_risk를 나타낸다고 전제하고 있었는데, 정작 이 함수는
  // 'medium'을 내보내고 있어 실제로는 'high'가 절대 나오지 않고 있었다 - 고위험
  // 이탈 워치리스트(risk_level IN ('high','critical'))에서 at_risk 회사가 전부
  // 조용히 빠지는 결과로 이어짐.
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    result.health_status === 'critical'
      ? 'critical'
      : result.health_status === 'at_risk'
        ? 'high'
        : 'low'

  return {
    company_id: companyId,
    score: result.overall_score,
    risk_level: riskLevel,
    metrics: {
      engagement_score: result.engagement_score,
      product_usage_score: result.product_usage_score,
      support_score: result.support_score,
      payment_score: result.payment_score,
      health_status: result.health_status,
      risk_factors: result.risk_factors,
      recommendations: result.recommendations,
    },
    calculated_at: new Date().toISOString(),
  }
}
