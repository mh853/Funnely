'use client'

// 마케팅 유입 경로(UTM/광고 클릭 ID)를 localStorage에 최초/마지막 터치로 기록
import { useEffect } from 'react'
import {
  ATTRIBUTION_FIRST_KEY,
  ATTRIBUTION_LAST_KEY,
  ATTRIBUTION_UTM_FIELDS,
  ATTRIBUTION_CLICK_ID_FIELDS,
} from '@/lib/analytics/attribution'

export default function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const values: Record<string, string> = {}
      let hasCampaign = false
      for (const key of [...ATTRIBUTION_UTM_FIELDS, ...ATTRIBUTION_CLICK_ID_FIELDS]) {
        const v = params.get(key)
        if (v) {
          values[key] = v
          hasCampaign = true
        }
      }

      // 최초 방문은 캠페인 파라미터 유무와 무관하게 1회만 기록 (오가닉 유입도
      // landing_page/referrer는 남겨야 하므로 hasCampaign으로 게이트하지 않는다)
      if (!localStorage.getItem(ATTRIBUTION_FIRST_KEY)) {
        localStorage.setItem(
          ATTRIBUTION_FIRST_KEY,
          JSON.stringify({
            ...values,
            landing_page: window.location.pathname,
            referrer: document.referrer || null,
            touched_at: new Date().toISOString(),
          })
        )
      }

      // 마지막 비직접 유입 - 캠페인/광고 파라미터가 있을 때만 갱신한다 (Direct 방문이
      // 마지막 유입 기록을 덮어쓰지 않도록)
      if (hasCampaign) {
        localStorage.setItem(
          ATTRIBUTION_LAST_KEY,
          JSON.stringify({
            ...values,
            touched_at: new Date().toISOString(),
          })
        )
      }
    } catch {
      // Safari 프라이빗 모드 등 localStorage 접근 불가 환경 - 페이지 렌더링에 영향 없어야 함
    }
  }, [])

  return null
}
