// 마케팅 사이트(PricingSection.tsx)의 영문 slug를 DB의 실제 플랜명(한글)으로 매핑
// NewSubscriptionClient.tsx의 동일한 매핑과 반드시 일치해야 한다 (신규가입 플로우와
// 로그인 후 플랜변경 플로우가 같은 slug를 공유하므로).
export const PLAN_SLUG_TO_NAME: Record<string, string> = {
  starter: '스타터',
  'starter-plus': '스타터 플러스',
  pro: '프로',
  premium: '프리미엄',
  custom: '커스터마이징',
}

export function isKnownPlanSlug(slug: string | null | undefined): slug is keyof typeof PLAN_SLUG_TO_NAME {
  return !!slug && slug in PLAN_SLUG_TO_NAME
}

// GTM/GA4 이벤트(plan_select/checkout_started/payment_success 등)에 항상 영문 slug로
// 플랜을 실어 보내기 위한 역방향 매핑 - DB에서 막 조회한 한글 플랜명을 다시 slug로 되돌릴 때 사용.
const NAME_TO_PLAN_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_SLUG_TO_NAME).map(([slug, name]) => [name, slug])
)

export function planNameToSlug(name: string | null | undefined): string | null {
  if (!name) return null
  return NAME_TO_PLAN_SLUG[name] ?? null
}
