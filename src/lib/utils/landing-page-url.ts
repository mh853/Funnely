/**
 * Landing Page URL Utilities
 *
 * URL 결정 우선순위:
 * 1순위: landingPageDomain (랜딩페이지별 커스텀 도메인)
 * 2순위: companyDefaultDomain (회사 기본 커스텀 도메인)
 * 3순위: {companyShortId}.funnely.co.kr (서비스 서브도메인)
 */

import type { LandingPageDomainContext } from '@/types/custom-domain.types'

/**
 * Get base domain from environment or default
 */
export function getBaseDomain(): string {
  // For development - use window.location if available (client-side)
  if (process.env.NODE_ENV === 'development') {
    // Client-side: detect port from current URL
    if (typeof window !== 'undefined') {
      const host = window.location.host
      const parts = host.split('.')

      // Check if it's a subdomain (e.g., q81d1c.localhost:3001)
      if (parts.length >= 2 && parts[0] !== 'localhost') {
        // Remove subdomain, keep the rest (localhost:3001)
        return parts.slice(1).join('.')
      }

      // No subdomain (localhost:3001)
      return host
    }
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_DEV_DOMAIN || 'localhost:3000'
  }

  // For production - extract from NEXT_PUBLIC_DOMAIN or default
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr'
  return domain.replace(/^https?:\/\//, '') // Remove protocol
}

/**
 * Generate landing page URL with custom domain support
 *
 * URL 결정 우선순위:
 * 1. options.landingPageDomain (랜딩페이지별 커스텀 도메인)
 * 2. options.companyDefaultDomain (회사 기본 커스텀 도메인)
 * 3. {companyShortId}.funnely.co.kr (서비스 서브도메인 폴백)
 *
 * @param companyShortId - Company short ID (e.g., 'q81d1c')
 * @param slug - Landing page slug (e.g., 'dental-promo')
 * @param options - 커스텀 도메인 옵션
 * @param protocol - 'http' or 'https'
 * @returns Full landing page URL
 *
 * @example
 * generateLandingPageURL('q81d1c', 'dental-promo')
 * // Returns: 'https://q81d1c.funnely.co.kr/landing/dental-promo'
 *
 * generateLandingPageURL('q81d1c', 'dental-promo', { companyDefaultDomain: 'my-clinic.com' })
 * // Returns: 'https://my-clinic.com/landing/dental-promo'
 */
export function generateLandingPageURL(
  companyShortId: string,
  slug: string,
  options?: {
    landingPageDomain?: string | null
    companyDefaultDomain?: string | null
  },
  protocol?: 'http' | 'https'
): string {
  const defaultProtocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const finalProtocol = protocol || defaultProtocol

  // 1순위: 랜딩페이지별 커스텀 도메인
  if (options?.landingPageDomain) {
    return `${finalProtocol}://${options.landingPageDomain}/landing/${slug}`
  }

  // 2순위: 회사 기본 커스텀 도메인
  if (options?.companyDefaultDomain) {
    return `${finalProtocol}://${options.companyDefaultDomain}/landing/${slug}`
  }

  // 3순위: 서비스 서브도메인 폴백
  const baseDomain = getBaseDomain()
  return `${finalProtocol}://${companyShortId}.${baseDomain}/landing/${slug}`
}

/**
 * LandingPageDomainContext로 URL 생성 (서버 컴포넌트 친화적)
 */
export function generateLandingPageURLFromContext(
  context: LandingPageDomainContext,
  slug: string,
  protocol?: 'http' | 'https'
): string {
  return generateLandingPageURL(
    context.companyShortId,
    slug,
    {
      landingPageDomain: context.landingPageDomain,
      companyDefaultDomain: context.companyDefaultDomain,
    },
    protocol
  )
}

/**
 * Generate completion page URL with custom domain support
 *
 * @param companyShortId - Company short ID (e.g., 'q81d1c')
 * @param slug - Landing page slug (e.g., 'dental-promo')
 * @param options - 커스텀 도메인 옵션
 * @param protocol - 'http' or 'https'
 * @returns Full completion page URL
 */
export function generateCompletionPageURL(
  companyShortId: string,
  slug: string,
  options?: {
    landingPageDomain?: string | null
    companyDefaultDomain?: string | null
  },
  protocol?: 'http' | 'https'
): string {
  const defaultProtocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const finalProtocol = protocol || defaultProtocol

  if (options?.landingPageDomain) {
    return `${finalProtocol}://${options.landingPageDomain}/landing/${slug}/completed`
  }

  if (options?.companyDefaultDomain) {
    return `${finalProtocol}://${options.companyDefaultDomain}/landing/${slug}/completed`
  }

  const baseDomain = getBaseDomain()
  return `${finalProtocol}://${companyShortId}.${baseDomain}/landing/${slug}/completed`
}

/**
 * Parse subdomain from hostname
 *
 * @param hostname - Full hostname (e.g., 'q81d1c.funnely.co.kr')
 * @returns Company short ID or null if not a subdomain
 *
 * @example
 * parseSubdomain('q81d1c.funnely.co.kr') // Returns: 'q81d1c'
 * parseSubdomain('funnely.co.kr')        // Returns: null
 * parseSubdomain('www.funnely.co.kr')    // Returns: null
 */
export function parseSubdomain(hostname: string): string | null {
  const parts = hostname.split('.')

  // Main domain (funnely.co.kr or www.funnely.co.kr or localhost)
  if (parts.length === 2 || (parts.length === 3 && parts[0] === 'www') || hostname.includes('localhost')) {
    return null
  }

  // Subdomain exists (q81d1c.funnely.co.kr)
  if (parts.length === 3 && parts[0] !== 'www') {
    return parts[0]
  }

  return null
}

/**
 * Generate shareable URL with UTM parameters
 *
 * @param companyShortId - Company short ID
 * @param slug - Landing page slug
 * @param utmParams - UTM tracking parameters
 * @returns URL with UTM parameters
 *
 * @example
 * generateShareableURL('q81d1c', 'dental', {
 *   utm_source: 'facebook',
 *   utm_campaign: 'summer2024'
 * })
 * // Returns: 'https://q81d1c.funnely.co.kr/landing/dental?utm_source=facebook&utm_campaign=summer2024'
 */
export function generateShareableURL(
  companyShortId: string,
  slug: string,
  utmParams?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }
): string {
  const baseURL = generateLandingPageURL(companyShortId, slug)

  if (!utmParams) return baseURL

  const params = new URLSearchParams()
  if (utmParams.utm_source) params.set('utm_source', utmParams.utm_source)
  if (utmParams.utm_medium) params.set('utm_medium', utmParams.utm_medium)
  if (utmParams.utm_campaign) params.set('utm_campaign', utmParams.utm_campaign)
  if (utmParams.utm_content) params.set('utm_content', utmParams.utm_content)
  if (utmParams.utm_term) params.set('utm_term', utmParams.utm_term)

  const queryString = params.toString()
  return queryString ? `${baseURL}?${queryString}` : baseURL
}
