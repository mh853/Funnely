// 마케팅 유입 경로(UTM/광고 클릭 ID) localStorage 키와 최초/마지막 터치 읽기 헬퍼
// - AttributionCapture(기록)와 signup 페이지(가입 시 전송) 양쪽이 같은 키를 공유해야 한다.
export const ATTRIBUTION_FIRST_KEY = 'funnely_first_attribution'
export const ATTRIBUTION_LAST_KEY = 'funnely_last_attribution'

export const ATTRIBUTION_UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export const ATTRIBUTION_CLICK_ID_FIELDS = ['gclid', 'fbclid', 'msclkid', 'gbraid', 'wbraid'] as const
// 광고 매체가 전달하는 캠페인/광고그룹/소재 식별 ID (노션 42번) - 카드에 파라미터명이
// 명시돼 있지 않아 저장 컬럼명과 동일하게 채택. adset_id는 별도 컬럼 없이 캡처 시점에
// adgroup_id로 별칭 처리한다(카드 §12가 통일 저장을 명시적으로 허용).
export const ATTRIBUTION_AD_ID_FIELDS = ['campaign_id', 'adgroup_id', 'ad_id'] as const
export const ATTRIBUTION_ADSET_ID_ALIAS_FIELD = 'adset_id'

// 네이버 블로그 유입(노션 44번) localStorage 키 - 기존 UTM first/last 오브젝트와 분리한다.
// UTM 없는 블로그 재방문이 last_utm_*을 덮어쓰면 안 되기 때문에 별도 트랙으로 관리.
export const BLOG_ATTRIBUTION_FIRST_KEY = 'funnely_first_blog'
export const BLOG_ATTRIBUTION_LAST_KEY = 'funnely_last_blog'
export const NAVER_BLOG_HOSTS = ['blog.naver.com', 'm.blog.naver.com'] as const

export function readAttributionFromStorage(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Safari 프라이빗 모드 등 localStorage 접근 불가 환경 - 가입 자체는 계속 진행
    return null
  }
}

// GA4 전환 이벤트(signup_success/trial_start/purchase)에 네이버 블로그
// 게시글 ID를 함께 실어 보내기 위한 헬퍼 (노션 44번 §9/§10 - 첫 페이지뷰만이 아니라
// 전환 이벤트에도 first/last blog_post_id를 붙여야 게시글별 성과 분석이 가능하다).
export function getBlogEventFields(): { first_blog_post_id: string | null; last_blog_post_id: string | null } {
  const first = readAttributionFromStorage(BLOG_ATTRIBUTION_FIRST_KEY)
  const last = readAttributionFromStorage(BLOG_ATTRIBUTION_LAST_KEY)
  return {
    first_blog_post_id: (first?.blog_post_id as string | undefined) ?? null,
    last_blog_post_id: (last?.blog_post_id as string | undefined) ?? null,
  }
}

// Referrer URL에서 네이버 블로그 게시글 ID(logNo)를 추출한다 (노션 44번).
// 우선순위: logNo 쿼리파라미터 > path 마지막 세그먼트의 8자리 이상 숫자 > null.
// 네이버/모바일 블로그 호스트가 아니거나 파싱 불가능하면 null.
export function getNaverBlogPostId(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()
    if (!NAVER_BLOG_HOSTS.includes(hostname as (typeof NAVER_BLOG_HOSTS)[number])) return null

    const logNo = url.searchParams.get('logNo')
    if (logNo) return logNo

    const match = url.pathname.match(/\/(\d{8,})\/?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
