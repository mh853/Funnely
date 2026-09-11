'use client'

// 마케팅 유입 경로(UTM/광고 클릭 ID/네이버 블로그 게시글)를 localStorage에 최초/마지막 터치로 기록
import { useEffect } from 'react'
import {
  ATTRIBUTION_FIRST_KEY,
  ATTRIBUTION_LAST_KEY,
  ATTRIBUTION_UTM_FIELDS,
  ATTRIBUTION_CLICK_ID_FIELDS,
  ATTRIBUTION_AD_ID_FIELDS,
  ATTRIBUTION_ADSET_ID_ALIAS_FIELD,
  BLOG_ATTRIBUTION_FIRST_KEY,
  BLOG_ATTRIBUTION_LAST_KEY,
  getNaverBlogPostId,
} from '@/lib/analytics/attribution'
import { trackEvent } from '@/lib/analytics/track'

export default function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const values: Record<string, string> = {}
      let hasCampaign = false
      for (const key of [...ATTRIBUTION_UTM_FIELDS, ...ATTRIBUTION_CLICK_ID_FIELDS, ...ATTRIBUTION_AD_ID_FIELDS]) {
        const v = params.get(key)
        if (v) {
          values[key] = v
          hasCampaign = true
        }
      }
      // Meta의 adset_id는 별도 컬럼 없이 adgroup_id로 통일 저장 (adgroup_id가 이미
      // 있으면 그대로 두고, 없을 때만 별칭 처리)
      if (!values.adgroup_id) {
        const adsetId = params.get(ATTRIBUTION_ADSET_ID_ALIAS_FIELD)
        if (adsetId) {
          values.adgroup_id = adsetId
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
        const lastPayload = {
          ...values,
          touched_at: new Date().toISOString(),
        }
        localStorage.setItem(ATTRIBUTION_LAST_KEY, JSON.stringify(lastPayload))

        // 이미 회원가입을 마친 로그인 사용자가 새 캠페인으로 재방문한 경우(노션 42번
        // CASE 4) - 로그인 여부를 미리 확인하지 않고 그냥 보내고, 서버가 비로그인이면
        // 조용히 401로 무시한다.
        fetch('/api/attribution/update-last-touch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lastPayload),
          keepalive: true,
        }).catch(() => {})
      }

      // 네이버 블로그 유입 (노션 44번) - 기존 UTM first/last와 별도 트랙으로 관리
      const blogPostId = getNaverBlogPostId(document.referrer)
      if (blogPostId) {
        if (!localStorage.getItem(BLOG_ATTRIBUTION_FIRST_KEY)) {
          localStorage.setItem(
            BLOG_ATTRIBUTION_FIRST_KEY,
            JSON.stringify({ blog_post_id: blogPostId, blog_referrer: document.referrer, touched_at: new Date().toISOString() })
          )
        }
        localStorage.setItem(
          BLOG_ATTRIBUTION_LAST_KEY,
          JSON.stringify({ blog_post_id: blogPostId, blog_referrer: document.referrer, touched_at: new Date().toISOString() })
        )
        // GTM Data Layer Variable로 GA4 Custom Dimension에 연결할 수 있도록 push
        trackEvent({ event: 'naver_blog_visit', blog_post_id: blogPostId, blog_referrer: document.referrer })
      }
    } catch {
      // Safari 프라이빗 모드 등 localStorage 접근 불가 환경 - 페이지 렌더링에 영향 없어야 함
    }
  }, [])

  return null
}
