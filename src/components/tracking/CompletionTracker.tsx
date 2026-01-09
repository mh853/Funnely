'use client'

import Script from 'next/script'

interface CompletionTrackerProps {
  trackingPixels?: {
    facebook_pixel_id?: string
    google_analytics_id?: string
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
                fbq('track', 'CompleteRegistration');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${trackingPixels.facebook_pixel_id}&ev=CompleteRegistration&noscript=1`}
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
    </>
  )
}
