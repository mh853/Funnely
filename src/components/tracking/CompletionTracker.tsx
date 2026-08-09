'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { isValidPixelId } from '@/lib/utils/tracking-pixels'

interface CompletionTrackerProps {
  trackingPixels?: {
    facebook_pixel_id?: string
    google_analytics_id?: string
    google_ads_id?: string
    kakao_pixel_id?: string
    tiktok_pixel_id?: string
    naver_pixel_id?: string
    karrot_pixel_id?: string
    is_active?: boolean
  }
  completionToken?: string
}

export default function CompletionTracker({ trackingPixels, completionToken }: CompletionTrackerProps) {
  // 완료 페이지는 제출 성공 시 이동하는 화면이라 새로고침/뒤로가기-앞으로가기/재방문
  // 시마다 이 컴포넌트가 다시 마운트되고, 그때마다 전환 픽셀이 다시 발화되고 있었다
  // (54차 QA 라이브 확인). 제출 1건당 고유한 completionToken 단위로 localStorage에
  // 발화 여부를 남겨, 같은 제출 건에 대한 재방문/새로고침은 재발화하지 않는다.
  //
  // 토큰이 없으면(직접 URL 접근 등) 예전엔 "구버전 링크 호환"을 이유로 매번 발화시켰는데,
  // 실제 제출 성공 경로(PublicLandingPage.tsx)는 항상 ct 토큰을 붙여 이동하고 이
  // 완료 페이지를 직접 가리키는 광고/구버전 링크도 없어(자신의 랜딩페이지 URL만
  // 캠페인에 노출됨) - 결과적으로 slug만 알면 이 페이지를 새로고침하는 것만으로
  // 제출 없이도 매번 실제 전환 픽셀(CompleteRegistration 등)이 광고 플랫폼에
  // 발화되고 있었다(72차 QA). 토큰이 없으면 발화하지 않도록 기본값을 반대로 뒤집는다.
  const [shouldFire, setShouldFire] = useState(false)

  useEffect(() => {
    if (!completionToken) {
      return
    }
    try {
      const key = `funnely_completion_fired_${completionToken}`
      if (window.localStorage.getItem(key)) return
      window.localStorage.setItem(key, '1')
    } catch {
      // 시크릿 모드 등 localStorage 접근 불가 환경 - dedup 없이도 발화는 허용한다
      // (토큰 자체는 있으므로 실제 제출 성공 경로에서 온 것은 맞다).
    }
    setShouldFire(true)
  }, [completionToken])

  if (!shouldFire) return null

  // 회사 소유자가 설정 화면에서 자유 입력한 픽셀 ID를 아래에서 <script> 안에
  // 그대로 문자열 보간하므로, 검증되지 않은 값은 여기서 전부 걸러낸다
  // (저장형 XSS 방지 - DB에는 형식 제약이 없어 여기가 사실상 유일한 방어선이다).
  const facebookPixelId = isValidPixelId(trackingPixels?.facebook_pixel_id) ? trackingPixels.facebook_pixel_id : null
  const googleAnalyticsId = isValidPixelId(trackingPixels?.google_analytics_id) ? trackingPixels.google_analytics_id : null
  const googleAdsId = isValidPixelId(trackingPixels?.google_ads_id) ? trackingPixels.google_ads_id : null
  const naverPixelId = isValidPixelId(trackingPixels?.naver_pixel_id) ? trackingPixels.naver_pixel_id : null
  const kakaoPixelId = isValidPixelId(trackingPixels?.kakao_pixel_id) ? trackingPixels.kakao_pixel_id : null
  const tiktokPixelId = isValidPixelId(trackingPixels?.tiktok_pixel_id) ? trackingPixels.tiktok_pixel_id : null
  const karrotPixelId = isValidPixelId(trackingPixels?.karrot_pixel_id) ? trackingPixels.karrot_pixel_id : null

  return (
    <>
      {/* Facebook Pixel */}
      {trackingPixels?.is_active && facebookPixelId && (
        <>
          <Script
            id="facebook-pixel-completion"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${facebookPixelId}');
                fbq('track', 'PageView');
                fbq('track', 'CompleteRegistration');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 */}
      {trackingPixels?.is_active && googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-analytics-completion"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
                gtag('event', 'conversion', {
                  'send_to': '${googleAnalyticsId}',
                  'event_category': 'registration',
                  'event_label': 'complete'
                });
              `,
            }}
          />
        </>
      )}

      {/* Google Ads Conversion */}
      {trackingPixels?.is_active && googleAdsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-ads-completion"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
                gtag('event', 'conversion', { 'send_to': '${googleAdsId}' });
              `,
            }}
          />
        </>
      )}

      {/* Naver Pixel Conversion */}
      {trackingPixels?.is_active && naverPixelId && (
        <Script
          id="naver-pixel-completion"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(a,b,c,d,e,f,g){a.NaverPixel=e,a[e]||(a[e]=function(){(a[e].q=a[e].q||[]).push(arguments)}),
              a[e].l=+new Date,f=b.createElement(c),g=b.getElementsByTagName(c)[0],f.async=1,
              f.src=d,g.parentNode.insertBefore(f,g)}(window,document,"script",
              "https://wcs.naver.net/wcslog.js","naver_pixel");
              naver_pixel('init', '${naverPixelId}');
              naver_pixel('track', 'PageView');
              naver_pixel('track', 'CompleteRegistration');
            `,
          }}
        />
      )}

      {/* Kakao Pixel */}
      {trackingPixels?.is_active && kakaoPixelId && (
        <Script
          id="kakao-pixel-completion"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '//t1.daumcdn.net/kas/static/kp.js';
                script.onload = function() {
                  if (typeof kakaoPixel !== 'undefined') {
                    kakaoPixel('${kakaoPixelId}').pageView();
                    kakaoPixel('${kakaoPixelId}').completeRegistration();
                  }
                };
                document.head.appendChild(script);
              })();
            `,
          }}
        />
      )}

      {/* TikTok Pixel */}
      {trackingPixels?.is_active && tiktokPixelId && (
        <Script
          id="tiktok-pixel-completion"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                ttq.load('${tiktokPixelId}');
                ttq.page();
                ttq.track('CompleteRegistration');
              }(window, document, 'ttq');
            `,
          }}
        />
      )}

      {/* Karrot Market Pixel */}
      {trackingPixels?.is_active && karrotPixelId && (
        <Script
          id="karrot-pixel-completion"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var script = document.createElement('script');
                script.src = 'https://karrot-pixel.business.daangn.com/karrot-pixel.js';
                script.onload = function() {
                  if (window.karrotPixel && typeof window.karrotPixel.init === 'function') {
                    window.karrotPixel.init('${karrotPixelId}');
                    window.karrotPixel.track('ViewPage');
                    window.karrotPixel.track('CompleteRegistration');
                  }
                };
                document.head.appendChild(script);
              })();
            `,
          }}
        />
      )}
    </>
  )
}
