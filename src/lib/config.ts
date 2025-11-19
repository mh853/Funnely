/**
 * Application configuration
 * Centralized configuration management for environment-specific settings
 */

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'MediSync',
    domain: process.env.NEXT_PUBLIC_URL || 'https://medisync.kr',
  },
  features: {
    analytics: Boolean(process.env.NEXT_PUBLIC_GA_ID),
  },
} as const

/**
 * Get full landing page URL
 */
export function getLandingPageUrl(slug: string): string {
  return `${config.app.domain}/landing/${slug}`
}

/**
 * Get landing page path (for internal routing)
 */
export function getLandingPagePath(slug: string): string {
  return `/landing/${slug}`
}
