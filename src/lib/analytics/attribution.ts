// 마케팅 유입 경로(UTM/광고 클릭 ID) localStorage 키와 최초/마지막 터치 읽기 헬퍼
// - AttributionCapture(기록)와 signup 페이지(가입 시 전송) 양쪽이 같은 키를 공유해야 한다.
export const ATTRIBUTION_FIRST_KEY = 'funnely_first_attribution'
export const ATTRIBUTION_LAST_KEY = 'funnely_last_attribution'

export const ATTRIBUTION_UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export const ATTRIBUTION_CLICK_ID_FIELDS = ['gclid', 'fbclid', 'msclkid', 'gbraid', 'wbraid'] as const

export function readAttributionFromStorage(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Safari 프라이빗 모드 등 localStorage 접근 불가 환경 - 가입 자체는 계속 진행
    return null
  }
}
