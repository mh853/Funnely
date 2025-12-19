import { createClient } from '@/lib/supabase/server'

export interface SubscriptionAccessResult {
  hasAccess: boolean
  subscription: any | null
  reason?: 'expired' | 'no_subscription' | 'grace_period' | 'active'
  redirectTo?: string
  gracePeriodEnd?: Date
}

/**
 * 구독 기반 대시보드 접근 권한 체크
 *
 * @param userId - 현재 로그인한 사용자 ID
 * @returns 접근 권한 정보 및 리다이렉트 경로
 *
 * 접근 허용 조건:
 * - status: 'active', 'trial', 'past_due' (grace period)
 * - current_period_end가 미래 시점이거나, grace_period_end가 미래 시점
 *
 * 접근 차단 조건:
 * - status: 'expired', 'cancelled', 'suspended'
 * - current_period_end < now AND (grace_period_end < now OR grace_period_end IS NULL)
 */
export async function checkSubscriptionAccess(
  userId: string
): Promise<SubscriptionAccessResult> {
  try {
    const supabase = await createClient()
    const now = new Date()

    // 1. 사용자 프로필 조회 (company_id 필요)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.company_id) {
      console.error('[Access] 사용자 프로필 조회 실패:', profileError)
      return {
        hasAccess: false,
        subscription: null,
        reason: 'no_subscription',
        redirectTo: '/dashboard/subscription',
      }
    }

    // 2. 회사 구독 정보 조회
    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_end,
        grace_period_end,
        subscription_plans (
          id,
          name,
          plan_type,
          price_monthly,
          price_yearly,
          max_users,
          max_leads,
          max_campaigns
        )
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription) {
      console.error('[Access] 구독 조회 실패:', subError)
      return {
        hasAccess: false,
        subscription: null,
        reason: 'no_subscription',
        redirectTo: '/dashboard/subscription',
      }
    }

    // 3. 상태별 접근 권한 판단
    const periodEnd = new Date(subscription.current_period_end)
    const graceEnd = subscription.grace_period_end
      ? new Date(subscription.grace_period_end)
      : null

    // 3-1. 명시적으로 차단된 상태
    if (['expired', 'cancelled', 'suspended'].includes(subscription.status)) {
      return {
        hasAccess: false,
        subscription,
        reason: 'expired',
        redirectTo: '/dashboard/subscription/expired',
      }
    }

    // 3-2. Trial 상태 체크
    if (subscription.status === 'trial') {
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null
      if (trialEnd && trialEnd < now) {
        // Trial 만료됨
        return {
          hasAccess: false,
          subscription,
          reason: 'expired',
          redirectTo: '/dashboard/subscription/expired',
        }
      }
      // Trial 진행 중
      return {
        hasAccess: true,
        subscription,
        reason: 'active',
      }
    }

    // 3-3. Active/Past_Due 상태 체크
    if (subscription.status === 'active' || subscription.status === 'past_due') {
      // 구독 기간이 유효한 경우
      if (periodEnd >= now) {
        return {
          hasAccess: true,
          subscription,
          reason: 'active',
        }
      }

      // 구독 기간 만료, Grace Period 확인
      if (graceEnd && graceEnd >= now) {
        return {
          hasAccess: true,
          subscription,
          reason: 'grace_period',
          gracePeriodEnd: graceEnd,
        }
      }

      // 구독 기간 만료 & Grace Period 없음/만료됨
      return {
        hasAccess: false,
        subscription,
        reason: 'expired',
        redirectTo: '/dashboard/subscription/expired',
      }
    }

    // 3-4. 기타 알 수 없는 상태 (안전장치)
    console.warn(`[Access] 알 수 없는 구독 상태: ${subscription.status}`)
    return {
      hasAccess: false,
      subscription,
      reason: 'expired',
      redirectTo: '/dashboard/subscription',
    }
  } catch (error) {
    console.error('[Access] 구독 접근 체크 실패:', error)
    return {
      hasAccess: false,
      subscription: null,
      reason: 'no_subscription',
      redirectTo: '/dashboard/subscription',
    }
  }
}

/**
 * 구독 상태 라벨 가져오기 (한국어)
 */
export function getSubscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '활성',
    trial: '체험',
    expired: '만료',
    cancelled: '취소',
    suspended: '정지',
    past_due: '결제 지연',
  }
  return labels[status] || status
}

/**
 * 구독 상태 색상 클래스 가져오기 (Tailwind)
 */
export function getSubscriptionStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    expired: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    past_due: 'bg-orange-100 text-orange-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
