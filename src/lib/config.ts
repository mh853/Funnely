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
