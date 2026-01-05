/**
 * Landing Page URL Utilities
 *
 * Generates subdomain-based URLs for landing pages:
 * {companyShortId}.funnely.co.kr/landing/{slug}
 */

/**
 * Get base domain from environment or default
 */
export function getBaseDomain(): string {
  // For development
  if (process.env.NODE_ENV === 'development') {
    return 'localhost:3000'
  }

  // For production - extract from NEXT_PUBLIC_DOMAIN or default
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr'
  return domain.replace(/^https?:\/\//, '') // Remove protocol
}

/**
 * Generate subdomain-based landing page URL
 *
 * @param companyShortId - Company short ID (e.g., 'q81d1c')
 * @param slug - Landing page slug (e.g., 'dental-promo')
 * @param protocol - 'http' or 'https' (default: 'https' in production, 'http' in dev)
 * @returns Full landing page URL
 *
 * @example
 * generateLandingPageURL('q81d1c', 'dental-promo')
 * // Returns: 'https://q81d1c.funnely.co.kr/landing/dental-promo'
 */
export function generateLandingPageURL(
  companyShortId: string,
  slug: string,
  protocol?: 'http' | 'https'
): string {
  const baseDomain = getBaseDomain()
  const defaultProtocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const finalProtocol = protocol || defaultProtocol

  return `${finalProtocol}://${companyShortId}.${baseDomain}/landing/${slug}`
}

/**
 * Generate subdomain-based completion page URL
 *
 * @param companyShortId - Company short ID (e.g., 'q81d1c')
 * @param slug - Landing page slug (e.g., 'dental-promo')
 * @param protocol - 'http' or 'https'
 * @returns Full completion page URL
 *
 * @example
 * generateCompletionPageURL('q81d1c', 'dental-promo')
 * // Returns: 'https://q81d1c.funnely.co.kr/landing/completed/dental-promo'
 */
export function generateCompletionPageURL(
  companyShortId: string,
  slug: string,
  protocol?: 'http' | 'https'
): string {
  const baseDomain = getBaseDomain()
  const defaultProtocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const finalProtocol = protocol || defaultProtocol

  return `${finalProtocol}://${companyShortId}.${baseDomain}/landing/completed/${slug}`
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
