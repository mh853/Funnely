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
