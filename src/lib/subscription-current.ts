// 여러 company_subscriptions 후보 중 "현재 구독"을 일관되게 골라내는 순수 함수
//
// 회사당 active/trial 구독은 1건만 있어야 하지만(DB 제약으로 보장), 과거 버그로 인해
// 중복 행이 남아있는 경우에도 화면/미들웨어/API가 모두 같은 기준으로 "진짜 현재 구독"을
// 고르도록 하기 위한 공용 로직이다. 의존성이 없어 middleware.ts(Edge/Node 런타임)에서도
// 안전하게 import할 수 있다 — @/lib/supabase/server 등 next/headers에 의존하는 모듈과
// 절대 엮이면 안 된다.
export interface SubscriptionCandidate {
  status: string
  current_period_end: string | null
  trial_end_date: string | null
  cancelled_at: string | null
}

/**
 * created_at 내림차순으로 정렬된 후보 목록에서 "현재 구독"을 고른다.
 * 우선순위: 기간이 유효한 active > 기간이 유효한 trial > past_due
 *          > 가장 최근에 취소된 것 > 나머지 중 최신(생성일 기준).
 *
 * 단순히 "가장 최근에 생성된 행"을 고르면, 실제로 유효한 유료 구독이 있어도 그보다
 * 나중에 생성된 만료된/미전환 체험 구독이 있으면 그쪽이 선택되어 버린다. 마찬가지로
 * 취소된 구독이 여러 건 남아있는 경우에도 created_at(생성 시점)이 아니라
 * cancelled_at(가장 최근 취소 시점) 기준으로 골라야, 방금 취소한 구독이 아니라
 * 예전에 만들어졌다가 먼저 취소된 다른 구독이 잘못 뽑히는 것을 막을 수 있다.
 */
export function pickCurrentSubscription<T extends SubscriptionCandidate>(
  subsByCreatedAtDesc: T[]
): T | null {
  if (subsByCreatedAtDesc.length === 0) return null
  const now = new Date().toISOString()

  const validActive = subsByCreatedAtDesc.find(
    (s) => s.status === 'active' && (s.current_period_end === null || s.current_period_end > now)
  )
  if (validActive) return validActive

  const validTrial = subsByCreatedAtDesc.find(
    (s) => s.status === 'trial' && (s.trial_end_date === null || s.trial_end_date > now)
  )
  if (validTrial) return validTrial

  const pastDue = subsByCreatedAtDesc.find((s) => s.status === 'past_due')
  if (pastDue) return pastDue

  const mostRecentlyCancelled = subsByCreatedAtDesc
    .filter((s) => s.status === 'cancelled' && s.cancelled_at !== null)
    .sort((a, b) => (b.cancelled_at! > a.cancelled_at! ? 1 : -1))[0]
  if (mostRecentlyCancelled) return mostRecentlyCancelled

  return subsByCreatedAtDesc[0]
}

/**
 * 이 구독이 지금 플랜 기능/한도에 대한 접근 권한을 부여하는지 판단한다.
 *
 * active/trial/past_due는 그대로 인정하고, cancelled는 결제 기간이 아직 남아있는 동안만
 * 인정한다 — 구독 취소는 "다음 결제를 하지 않겠다"는 의미일 뿐, 이미 결제한 기간의
 * 이용 권리를 즉시 박탈하는 것이 아니기 때문이다 (취소 확인 모달에서도 그렇게 안내한다).
 */
export function hasValidPlanAccess(
  sub: SubscriptionCandidate | null | undefined,
  now: string = new Date().toISOString()
): boolean {
  if (!sub) return false
  if (sub.status === 'active' || sub.status === 'trial' || sub.status === 'past_due') return true
  if (sub.status === 'cancelled') {
    return sub.current_period_end !== null && sub.current_period_end > now
  }
  return false
}
