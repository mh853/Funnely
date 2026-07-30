/**
 * Application configuration
 * Centralized configuration management for environment-specific settings
 */

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Funnely',
    domain: process.env.NEXT_PUBLIC_URL || 'https://funnely.kr',
  },
  features: {
    analytics: Boolean(process.env.NEXT_PUBLIC_GA_ID),
  },
  // 전자상거래법 제10조 표시의무 + 결제대행사(PG) 가맹점 심사 요건 충족용 사업자 정보.
  // 사업자등록증 기준(2024-03-14 발급) - 변경 시 실제 등록증과 반드시 대조할 것.
  business: {
    name: '트리플채널(3CH)',
    ceo: '최문호',
    registrationNumber: '809-24-00626',
    address: '경기도 화성시 남양읍 고향의봄길 36',
    phone: '02-3436-1020',
    // 실제 수신 가능한 고객지원 이메일 시스템 구축 후 값 채울 예정
    email: null as string | null,
    // 통신판매업 신고번호는 사업장 주소 변경(화성시 이전) 신고가 완료되면 추가 예정
    mailOrderSalesNumber: null as string | null,
  },
} as const

/**
 * @deprecated Use generateLandingPageURL from '@/lib/utils/landing-page-url' instead
 * Get full landing page URL (legacy format without subdomain)
 */
export function getLandingPageUrl(slug: string): string {
  return `${config.app.domain}/landing/${slug}`
}

/**
 * @deprecated Use generateLandingPageURL from '@/lib/utils/landing-page-url' instead
 * Get landing page base URL (without slug)
 * Used for constructing URLs with ref parameter before slug
 */
export function getLandingPageBaseUrl(): string {
  return `${config.app.domain}/landing`
}

/**
 * Get landing page path (for internal routing)
 */
export function getLandingPagePath(slug: string): string {
  return `/landing/${slug}`
}
