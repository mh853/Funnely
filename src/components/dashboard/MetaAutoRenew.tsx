'use client'
// Meta 연결 자동 연장 - 관리자가 퍼널리를 열 때 이 브라우저에 페이스북이 로그인돼 있으면 화면 뒤에서 새 토큰을 받아 서버에 넘긴다(하루 한 번)

import { useEffect } from 'react'

const GRAPH_VERSION = 'v25.0'
const LAST_TRY_KEY = 'funnely_meta_auto_renew_tried_at'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

function loadSdk(appId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB)
    window.fbAsyncInit = () => {
      window.FB.init({ appId, version: GRAPH_VERSION, cookie: false, xfbml: false, status: false })
      resolve(window.FB)
    }
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/ko_KR/sdk.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onerror = () => reject(new Error('Facebook SDK를 불러오지 못했습니다'))
    document.body.appendChild(script)
  })
}

export default function MetaAutoRenew({ appId }: { appId: string }) {
  useEffect(() => {
    // 실패해도(사파리 쿠키 차단·페이스북 로그아웃 등) 화면에는 아무것도 띄우지 않는다. 만료 안내·메일이 대신한다.
    try {
      const last = Number(localStorage.getItem(LAST_TRY_KEY) || 0)
      if (Date.now() - last < ONE_DAY_MS) return
      localStorage.setItem(LAST_TRY_KEY, String(Date.now()))
    } catch {
      // 저장소를 못 쓰는 브라우저도 시도는 한다
    }

    let cancelled = false
    loadSdk(appId)
      .then(
        (FB) =>
          new Promise<string | null>((resolve) => {
            // true: 캐시 말고 페이스북에 직접 물어본다
            FB.getLoginStatus((res: any) => resolve(res?.status === 'connected' ? res.authResponse?.accessToken ?? null : null), true)
          })
      )
      .then(async (accessToken) => {
        if (!accessToken || cancelled) return
        await fetch('/api/ad-accounts/meta/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [appId])

  return null
}
