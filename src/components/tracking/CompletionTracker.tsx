'use client'

import Script from 'next/script'

interface CompletionTrackerProps {
  trackingPixels?: {
    facebook_pixel_id?: string
    google_analytics_id?: string
    kakao_pixel_id?: string
    tiktok_pixel_id?: string
    karrot_pixel_id?: string
    is_active?: boolean
  }
}

export default function CompletionTracker({ trackingPixels }: CompletionTrackerProps) {
  return (
    <>
      {/* Facebook Pixel */}
      {trackingPixels?.is_active && trackingPixels?.facebook_pixel_id && (
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
                fbq('init', '${trackingPixels.facebook_pixel_id}');
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
              src={`https://www.facebook.com/tr?id=${trackingPixels.facebook_pixel_id}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 */}
      {trackingPixels?.is_active && trackingPixels?.google_analytics_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${trackingPixels.google_analytics_id}`}
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
                gtag('config', '${trackingPixels.google_analytics_id}');
                gtag('event', 'conversion', {
                  'send_to': '${trackingPixels.google_analytics_id}',
                  'event_category': 'registration',
                  'event_label': 'complete'
                });
              `,
            }}
          />
        </>
      )}

      {/* Kakao Pixel */}
      {trackingPixels?.is_active && trackingPixels?.kakao_pixel_id && (
        <>
          <Script
            type="text/javascript"
            src="//t1.daumcdn.net/kas/static/kp.js"
            strategy="afterInteractive"
          />
          <Script
            id="kakao-pixel-completion"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                kakaoPixel('${trackingPixels.kakao_pixel_id}').pageView();
                kakaoPixel('${trackingPixels.kakao_pixel_id}').completeRegistration();
              `,
            }}
          />
        </>
      )}

      {/* TikTok Pixel */}
      {trackingPixels?.is_active && trackingPixels?.tiktok_pixel_id && (
        <Script
          id="tiktok-pixel-completion"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                ttq.load('${trackingPixels.tiktok_pixel_id}');
                ttq.page();
                ttq.track('CompleteRegistration');
              }(window, document, 'ttq');
            `,
          }}
        />
      )}

      {/* Karrot Market Pixel */}
      {trackingPixels?.is_active && trackingPixels?.karrot_pixel_id && (
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
                    window.karrotPixel.init('${trackingPixels.karrot_pixel_id}');
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
