// GTM/GA4 마케팅 이벤트 전송 헬퍼 - 노션 30번 개발요청서 기준
// 절대 개인정보(이름/전화번호/이메일/주소/문의 상세내용 등)를 담지 않는다.
'use client'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export function trackEvent(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}
