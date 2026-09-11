// 서버 전용 attribution 저장 헬퍼 - signup route와 update-last-touch route가 공유한다.
// 클라이언트 localStorage에서 온 값을 그대로 insert/update에 spread하면 company_id 등
// 임의 컬럼을 덮어쓸 위험이 있어, 알려진 필드만 화이트리스트로 골라 담는다.

const ATTRIBUTION_MAX_LEN = 500

export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'msclkid',
  'gbraid',
  'wbraid',
  'campaign_id',
  'adgroup_id',
  'ad_id',
]

const ATTRIBUTION_FIRST_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000
const ATTRIBUTION_LAST_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

function sanitizeAttributionValue(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null
  return v.slice(0, ATTRIBUTION_MAX_LEN)
}

function parseTouchedAt(src: Record<string, unknown>): number {
  return typeof src.touched_at === 'string' ? Date.parse(src.touched_at) : NaN
}

// TTL(신선도)이 지났거나 형식이 잘못된 값은 빈 객체를 반환한다 - 오래 방치된
// localStorage 값이 그대로 저장되지 않도록 막는다.
export function buildFirstAttributionFields(firstAttribution: unknown): Record<string, unknown> {
  if (!firstAttribution || typeof firstAttribution !== 'object') return {}
  const src = firstAttribution as Record<string, unknown>
  const touchedAt = parseTouchedAt(src)
  if (Number.isNaN(touchedAt) || Date.now() - touchedAt > ATTRIBUTION_FIRST_MAX_AGE_MS) return {}

  const row: Record<string, unknown> = {}
  for (const key of ATTRIBUTION_KEYS) {
    row[`first_${key}`] = sanitizeAttributionValue(src[key])
  }
  row.first_landing_page = sanitizeAttributionValue(src.landing_page)
  row.first_referrer = sanitizeAttributionValue(src.referrer)
  row.first_touch_at = new Date(touchedAt).toISOString()
  return row
}

export function buildLastAttributionFields(lastAttribution: unknown): Record<string, unknown> {
  if (!lastAttribution || typeof lastAttribution !== 'object') return {}
  const src = lastAttribution as Record<string, unknown>
  const touchedAt = parseTouchedAt(src)
  if (Number.isNaN(touchedAt) || Date.now() - touchedAt > ATTRIBUTION_LAST_MAX_AGE_MS) return {}

  const row: Record<string, unknown> = {}
  for (const key of ATTRIBUTION_KEYS) {
    row[`last_${key}`] = sanitizeAttributionValue(src[key])
  }
  row.last_touch_at = new Date(touchedAt).toISOString()
  return row
}

// 네이버 블로그 게시글 attribution (노션 44번) - first/last 각각 90일 TTL 재사용.
export function buildFirstBlogFields(firstBlog: unknown): Record<string, unknown> {
  if (!firstBlog || typeof firstBlog !== 'object') return {}
  const src = firstBlog as Record<string, unknown>
  const touchedAt = parseTouchedAt(src)
  if (Number.isNaN(touchedAt) || Date.now() - touchedAt > ATTRIBUTION_FIRST_MAX_AGE_MS) return {}
  const blogPostId = sanitizeAttributionValue(src.blog_post_id)
  if (!blogPostId) return {}
  return {
    first_blog_post_id: blogPostId,
    first_blog_referrer: sanitizeAttributionValue(src.blog_referrer),
  }
}

export function buildLastBlogFields(lastBlog: unknown): Record<string, unknown> {
  if (!lastBlog || typeof lastBlog !== 'object') return {}
  const src = lastBlog as Record<string, unknown>
  const touchedAt = parseTouchedAt(src)
  if (Number.isNaN(touchedAt) || Date.now() - touchedAt > ATTRIBUTION_LAST_MAX_AGE_MS) return {}
  const blogPostId = sanitizeAttributionValue(src.blog_post_id)
  if (!blogPostId) return {}
  return {
    last_blog_post_id: blogPostId,
    last_blog_referrer: sanitizeAttributionValue(src.blog_referrer),
  }
}
