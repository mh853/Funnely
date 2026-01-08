'use client'

import { LandingPage } from '@/types/landing-page.types'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo, memo, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'

// 전화번호 자동 포맷팅 함수 (숫자만 입력해도 xxx-xxxx-xxxx 형태로 변환)
const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '')

  // 최대 11자리로 제한
  const limited = numbers.slice(0, 11)

  // 포맷팅 적용
  if (limited.length <= 3) {
    return limited
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`
  }
}

interface PublicLandingPageProps {
  landingPage: any  // Includes landing page + companies.tracking_pixels
  initialRef?: string  // For new URL format: ?ref=shortId/slug
}

// Wrapper component that handles Suspense for useSearchParams
export default function PublicLandingPage({ landingPage, initialRef }: PublicLandingPageProps) {
  return (
    <Suspense fallback={<PublicLandingPageSkeleton />}>
      <PublicLandingPageContent landingPage={landingPage} initialRef={initialRef} />
    </Suspense>
  )
}

// Simple loading skeleton
function PublicLandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-gray-400">로딩 중...</div>
    </div>
  )
}

// Main content component that uses useSearchParams
function PublicLandingPageContent({ landingPage, initialRef }: PublicLandingPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Support both new format (?ref=shortId/slug via initialRef) and legacy format (?ref=shortId)
  const refParam = initialRef || searchParams.get('ref')
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [currentRealtimeIndex, setCurrentRealtimeIndex] = useState(0)
  const [showExternalFormModal, setShowExternalFormModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)

  // 폼 데이터 상태 관리
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // collect_fields에서 커스텀 필드 추출 (short_answer, multiple_choice 타입만)
  const customFields = useMemo(() => {
    if (!landingPage.collect_fields || !Array.isArray(landingPage.collect_fields)) {
      return []
    }
    return landingPage.collect_fields
      .filter((field: any) => field.type === 'short_answer' || field.type === 'multiple_choice')
      .map((field: any, index: number) => ({
        id: field.id || `field_${index}`,
        type: field.type,
        question: field.question || '',
        options: field.options || [],
        required: field.required ?? false, // 필수 여부
      }))
  }, [landingPage.collect_fields])

  // Realtime leads state
  const [realtimeLeads, setRealtimeLeads] = useState<Array<{ name: string; device: string }>>([])
  const supabase = useMemo(() => createClient(), [])

  // Track page view on mount (bypasses ISR caching issue)
  // Session-based deduplication to prevent multiple counts from component remounts
  useEffect(() => {
    const trackPageView = async () => {
      const viewKey = `viewed_${landingPage.id}`
      const lastViewed = sessionStorage.getItem(viewKey)

      // Skip if already viewed in this session (within last 30 minutes)
      if (lastViewed) {
        const timeSinceView = Date.now() - parseInt(lastViewed, 10)
        if (timeSinceView < 30 * 60 * 1000) { // 30분
          return
        }
      }

      try {
        await fetch('/api/landing-pages/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: landingPage.id }),
        })

        // Mark as viewed in this session
        sessionStorage.setItem(viewKey, Date.now().toString())
      } catch (error) {
        // Silently fail - page view tracking is non-critical
        console.error('Failed to track page view:', error)
      }
    }
    trackPageView()
  }, [landingPage.id])

  // Timer countdown calculation
  useEffect(() => {
    if (!landingPage.timer_enabled || !landingPage.timer_deadline) return

    const calculateTimeLeft = () => {
      const deadline = new Date(landingPage.timer_deadline!)
      const difference = deadline.getTime() - Date.now()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [landingPage.timer_enabled, landingPage.timer_deadline])

  // Fetch actual leads from Supabase with Realtime subscription
  useEffect(() => {
    if (!landingPage.realtime_enabled || !landingPage.collect_data || !landingPage.id) return

    // Initial fetch of recent leads
    const fetchRecentLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('name, device_type, created_at')
        .eq('landing_page_id', landingPage.id)
        .order('created_at', { ascending: false })
        .limit(landingPage.realtime_count || 10)

      if (data && data.length > 0) {
        setRealtimeLeads(data.map(lead => ({
          name: lead.name || '익명',
          device: lead.device_type === 'pc' ? 'PC' : lead.device_type === 'mobile' ? '모바일' : lead.device_type === 'tablet' ? '태블릿' : '알 수 없음'
        })))
      }
    }

    fetchRecentLeads()

    // Set up Realtime subscription for new leads
    const channel = supabase
      .channel(`landing_page_leads_${landingPage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `landing_page_id=eq.${landingPage.id}`
        },
        (payload) => {
          const newLead = payload.new as any
          const device = newLead.device_type === 'pc' ? 'PC' : newLead.device_type === 'mobile' ? '모바일' : newLead.device_type === 'tablet' ? '태블릿' : '알 수 없음'
          setRealtimeLeads(prev => [
            { name: newLead.name || '익명', device },
            ...prev.slice(0, (landingPage.realtime_count || 10) - 1)
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [landingPage.realtime_enabled, landingPage.collect_data, landingPage.id, landingPage.realtime_count, supabase])

  // Realtime status rolling animation
  useEffect(() => {
    if (!landingPage.realtime_enabled || !landingPage.collect_data || realtimeLeads.length === 0) return

    const interval = setInterval(() => {
      setCurrentRealtimeIndex((prev) => (prev + 1) % realtimeLeads.length)
    }, (landingPage.realtime_speed || 3) * 1000)

    return () => clearInterval(interval)
  }, [landingPage.realtime_enabled, landingPage.collect_data, landingPage.realtime_speed, realtimeLeads.length])

  // 완료 페이지 프리페칭 (사용자가 폼과 상호작용하기 시작하면 prefetch)
  useEffect(() => {
    // nameInput 또는 phoneInput이 입력되면 완료 페이지 미리 로딩
    if (nameInput.length > 0 || phoneInput.length > 0) {
      const refQuery = refParam ? `?ref=${refParam}` : ''
      router.prefetch(`/landing/completed/${landingPage.slug}${refQuery}`)
    }
  }, [nameInput, phoneInput, landingPage.slug, refParam, router])

  // 폼 제출 핸들러
  const handleFormSubmit = async () => {
    setSubmitError(null)

    // 필수 필드 검증
    if (landingPage.collect_name !== false && !nameInput.trim()) {
      setSubmitError('이름을 입력해주세요')
      return
    }
    if (landingPage.collect_phone !== false && !phoneInput.trim()) {
      setSubmitError('전화번호를 입력해주세요')
      return
    }
    // 커스텀 필드 필수 검증
    for (const field of customFields) {
      if (field.required) {
        const fieldKey = field.id || field.question
        const value = customFieldValues[fieldKey]
        if (!value || !value.trim()) {
          setSubmitError(`${field.question}을(를) 입력해주세요`)
          return
        }
      }
    }
    if (landingPage.require_privacy_consent && !privacyConsent) {
      setSubmitError('개인정보 수집 및 이용에 동의해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      // UTM 파라미터 및 ref 파라미터 수집
      const urlParams = new URLSearchParams(window.location.search)
      const utmParams = {
        utm_source: urlParams.get('utm_source') || undefined,
        utm_medium: urlParams.get('utm_medium') || undefined,
        utm_campaign: urlParams.get('utm_campaign') || undefined,
        utm_content: urlParams.get('utm_content') || undefined,
        utm_term: urlParams.get('utm_term') || undefined,
      }
      // ref 파라미터: 유입 경로 추적 (회사 ID)
      const refCompanyId = refParam || urlParams.get('ref') || undefined

      // 폼 데이터 구성
      const formData: Record<string, any> = {
        name: nameInput,
        phone: phoneInput,
      }

      // 커스텀 필드 추가
      customFields.forEach((field: { id: string; type: string; question: string; options?: string[]; required?: boolean }) => {
        const fieldKey = field.id || field.question
        if (customFieldValues[fieldKey]) {
          formData[field.question || fieldKey] = customFieldValues[fieldKey]
        }
      })

      // 동의 정보 추가
      formData.privacy_consent = privacyConsent
      formData.marketing_consent = marketingConsent

      const response = await fetch('/api/landing-pages/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landing_page_id: landingPage.id,
          form_data: formData,
          utm_params: utmParams,
          referrer_user_id: refCompanyId, // ref 파라미터로 전달된 유입 회사 ID (API에서 company short_id로 조회)
          metadata: {
            referrer: document.referrer,
            user_agent: navigator.userAgent,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || '제출에 실패했습니다')
      }

      // 신청 성공 시 완료 페이지로 리다이렉트 (replace로 뒤로가기 방지)
      const refQuery = refParam ? `?ref=${refParam}` : ''
      router.replace(`/landing/completed/${landingPage.slug}${refQuery}`)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Memoize timer countdown string to prevent unnecessary recalculations
  const timerCountdown = useMemo(
    () => `D-${timeLeft.days}일 ${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`,
    [timeLeft]
  )

  // Helper to check if section is enabled (memoized)
  const isSectionEnabled = useMemo(() => {
    const enabledSections = new Set(
      landingPage.sections
        .filter((s: { enabled?: boolean; type: string }) => s.enabled !== false)
        .map((s: { type: string }) => s.type)
    )
    return (sectionType: string) => enabledSections.has(sectionType as any)
  }, [landingPage.sections])

  // Render sticky buttons (matching preview logic)
  const renderStickyButtons = (position: 'top' | 'bottom') => {
    const buttons = []

    // Timer (available for both modes)
    if (landingPage.timer_enabled && landingPage.timer_sticky_position === position && landingPage.timer_deadline) {
      buttons.push(
        <div
          key="timer"
          className="w-full py-4 rounded-xl shadow-xl text-center"
          style={{
            backgroundColor: landingPage.timer_color || '#EF4444',
            color: 'white'
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {landingPage.timer_text && (
              <div className="text-sm font-medium">
                {landingPage.timer_text}
              </div>
            )}
            <div className="text-lg font-bold">
              {timerCountdown}
            </div>
          </div>
        </div>
      )
    }

    // CTA Button (both modes)
    if (landingPage.cta_enabled && landingPage.collect_data && landingPage.cta_sticky_position === position) {
      buttons.push(
        <button
          key="cta"
          onClick={() => {
            if (landingPage.collection_mode === 'external') {
              setShowExternalFormModal(true)
            } else if (landingPage.collection_mode === 'inline') {
              handleFormSubmit()
            }
          }}
          disabled={isSubmitting}
          className="w-full py-4 text-lg rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
        >
          {isSubmitting && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          )}
          {isSubmitting ? '제출 중...' : (landingPage.cta_text || '상담 신청하기')}
        </button>
      )
    }

    // Call Button (both modes - matching preview)
    if (landingPage.call_button_enabled && landingPage.call_button_sticky_position === position) {
      buttons.push(
        <a
          key="call"
          href={`tel:${landingPage.call_button_phone}`}
          className="w-full py-4 text-lg text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-3"
          style={{ backgroundColor: landingPage.call_button_color || '#10B981' }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          전화: {landingPage.call_button_phone}
        </a>
      )
    }

    if (buttons.length === 0) return null

    return (
      <div
        className={`${position === 'top' ? 'sticky top-0 border-b' : 'sticky bottom-0 border-t'} z-50 bg-white border-gray-200 shadow-md`}
      >
        <div className="max-w-[800px] mx-auto p-4 space-y-3">
          {buttons}
        </div>
      </div>
    )
  }

  // Get tracking pixels
  // Handle both object and array formats from Supabase
  const trackingPixelsRaw = landingPage.companies?.tracking_pixels
  const trackingPixels = Array.isArray(trackingPixelsRaw)
    ? trackingPixelsRaw[0]
    : trackingPixelsRaw

  return (
    <>
      {/* Facebook Pixel */}
      {trackingPixels?.is_active && trackingPixels?.facebook_pixel_id && (
        <>
          <Script
            id="facebook-pixel"
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
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${trackingPixels.google_analytics_id}');
              `,
            }}
          />
        </>
      )}

      {/* Google Ads */}
      {trackingPixels?.is_active && trackingPixels?.google_ads_id && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${trackingPixels.google_ads_id}`}
          strategy="afterInteractive"
        />
      )}

      {/* Kakao Pixel */}
      {trackingPixels?.is_active && trackingPixels?.kakao_pixel_id && (
        <Script
          id="kakao-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,n,t,a,o,i){e[a]=e[a]||function(){(e[a].q=e[a].q||[]).push(arguments)},
              e[a].l=1*new Date,o=n.createElement(t),i=n.getElementsByTagName(t)[0],
              o.async=1,o.src="https://track.adtouch.kakao.com/kakao_track.js?pixel_id=${trackingPixels.kakao_pixel_id}",
              i.parentNode.insertBefore(o,i)}(window,document,"script","kakaoPixel");
              kakaoPixel('${trackingPixels.kakao_pixel_id}').pageView();
            `,
          }}
        />
      )}

      {/* Naver Pixel */}
      {trackingPixels?.is_active && trackingPixels?.naver_pixel_id && (
        <Script
          id="naver-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(a,b,c,d,e,f,g){a.NaverPixel=e,a[e]||(a[e]=function(){(a[e].q=a[e].q||[]).push(arguments)}),
              a[e].l=+new Date,f=b.createElement(c),g=b.getElementsByTagName(c)[0],f.async=1,
              f.src=d,g.parentNode.insertBefore(f,g)}(window,document,"script",
              "https://wcs.naver.net/wcslog.js","naver_pixel");
              naver_pixel('init', '${trackingPixels.naver_pixel_id}');
              naver_pixel('track', 'PageView');
            `,
          }}
        />
      )}

      {/* TikTok Pixel */}
      {trackingPixels?.is_active && trackingPixels?.tiktok_pixel_id && (
        <>
          <Script
            id="tiktok-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                  ttq.load('${trackingPixels.tiktok_pixel_id}');
                  ttq.page();
                }(window, document, 'ttq');
              `,
            }}
          />
        </>
      )}

      {/* Karrot Market Pixel */}
      {trackingPixels?.is_active && trackingPixels?.karrot_pixel_id && (
        <Script
          id="karrot-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(k,a,r,r,o,t){
                k.KarrotPixel=o;k[o]=k[o]||function(){
                (k[o].q=k[o].q||[]).push(arguments)};
                t=a.createElement(r);t.async=1;
                t.src='https://pixel.daangn.com/pixel.js?id='+r;
                a.getElementsByTagName('head')[0].appendChild(t);
              })(window,document,'script','${trackingPixels.karrot_pixel_id}','kpx');
              kpx('track', 'PageView');
            `,
          }}
        />
      )}

      <div className="min-h-screen bg-white relative">
        {/* Sticky Top Buttons */}
        {renderStickyButtons('top')}

      {/* Scrollable Content */}
      <div className="max-w-[800px] mx-auto px-6 py-8 space-y-8">
        {/* Hero Images */}
        {isSectionEnabled('hero_image') && landingPage.images && landingPage.images.length > 0 && (
          <div className="space-y-0">
            {landingPage.images.map((image: string, idx: number) => (
              <div key={idx} className="overflow-hidden">
                <img
                  src={image}
                  alt={`Hero ${idx + 1}`}
                  className="w-full object-contain"
                  style={{ maxHeight: '600px' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {isSectionEnabled('description') && landingPage.description_enabled && landingPage.description && (
          <div className="text-center">
            <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
              {landingPage.description}
            </p>
          </div>
        )}

        {/* Realtime Status */}
        {isSectionEnabled('realtime_status') && landingPage.realtime_enabled && landingPage.collect_data && realtimeLeads.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 overflow-hidden">
            <div className="text-base font-semibold text-blue-900 mb-3">실시간 현황</div>
            <div className="flex items-center gap-3 text-base text-blue-700">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
              <div key={currentRealtimeIndex} className="animate-in fade-in duration-500">
                {(landingPage.realtime_template || '{name}님이 {device}에서 상담을 신청했습니다.')
                  .replace('{name}', realtimeLeads[currentRealtimeIndex].name)
                  .replace('{device}', realtimeLeads[currentRealtimeIndex].device)
                  .replace('{location}', realtimeLeads[currentRealtimeIndex].device)}
              </div>
            </div>
          </div>
        )}

        {/* Timer (only if not sticky) */}
        {isSectionEnabled('timer') && landingPage.timer_enabled && landingPage.timer_sticky_position === 'none' && (
          <div
            className="rounded-lg p-3 border-2"
            style={{
              borderColor: landingPage.timer_color || '#EF4444',
              backgroundColor: `${landingPage.timer_color || '#EF4444'}10`
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {landingPage.timer_text && (
                <div className="text-xs font-medium" style={{ color: landingPage.timer_color || '#EF4444' }}>
                  {landingPage.timer_text}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold" style={{ color: landingPage.timer_color || '#EF4444' }}>
                  {timerCountdown}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Section (Inline Mode) - Functional Form */}
        {isSectionEnabled('form') && landingPage.collect_data && landingPage.collection_mode === 'inline' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <p className="text-sm text-indigo-900">
                💡 상담을 위해 아래 정보를 입력해주세요
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Name Field */}
              {landingPage.collect_name !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="홍길동"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              {/* Phone Field */}
              {landingPage.collect_phone !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="01012345678"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              {/* Custom Fields */}
              {customFields.map((field: { id: string; type: string; question: string; options?: string[]; required?: boolean }, index: number) => {
                const fieldKey = field.id || field.question || `field_${index}`
                return (
                  <div key={fieldKey}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.question || `${index + 3}. 항목추가`}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'short_answer' ? (
                      <input
                        type="text"
                        value={customFieldValues[fieldKey] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        placeholder="답변을 입력해주세요"
                        disabled={isSubmitting}
                      />
                    ) : (
                      <select
                        value={customFieldValues[fieldKey] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        disabled={isSubmitting}
                      >
                        <option value="">선택해주세요</option>
                        {field.options?.map((option: string, idx: number) => (
                          <option key={idx} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Privacy Consent Section (Inline Mode) */}
        {isSectionEnabled('privacy_consent') && landingPage.collect_data && landingPage.collection_mode === 'inline' && (
          <div className="space-y-3 bg-white rounded-xl p-4 border border-gray-200">
            {landingPage.require_privacy_consent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-600">
                  개인정보 수집 및 이용 동의 (필수)
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPrivacyModal(true)
                    }}
                    className="ml-1 text-indigo-600 underline"
                  >
                    보기
                  </button>
                </span>
              </label>
            )}
            {landingPage.require_marketing_consent && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-600">
                  마케팅 활용 동의 (선택)
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMarketingModal(true)
                    }}
                    className="ml-1 text-indigo-600 underline"
                  >
                    보기
                  </button>
                </span>
              </label>
            )}
          </div>
        )}

        {/* 에러 메시지 - CTA 버튼 바로 위 */}
        {submitError && landingPage.collect_data && landingPage.collection_mode === 'inline' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {submitError}
          </div>
        )}

        {/* CTA Button (only if not sticky) */}
        {isSectionEnabled('cta_button') && landingPage.cta_enabled && landingPage.collect_data && landingPage.cta_sticky_position === 'none' && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (landingPage.collection_mode === 'external') {
                  setShowExternalFormModal(true)
                } else if (landingPage.collection_mode === 'inline') {
                  handleFormSubmit()
                }
              }}
              disabled={isSubmitting}
              className="w-full max-w-xs py-4 rounded-xl text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              )}
              {isSubmitting ? '제출 중...' : (landingPage.cta_text || '상담 신청하기')}
            </button>
          </div>
        )}

        {/* Call Button (only if not sticky) */}
        {isSectionEnabled('call_button') && landingPage.call_button_enabled && landingPage.call_button_sticky_position === 'none' && (
          <div className="flex justify-center">
            <a
              href={`tel:${landingPage.call_button_phone}`}
              className="w-full max-w-xs py-4 text-white rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center gap-3"
              style={{ backgroundColor: landingPage.call_button_color || '#10B981' }}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              전화: {landingPage.call_button_phone}
            </a>
          </div>
        )}
      </div>

      {/* Sticky Bottom Buttons */}
      {renderStickyButtons('bottom')}

      {/* External Form Modal */}
      {showExternalFormModal && landingPage.collection_mode === 'external' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">상세 정보 입력</h3>
              <button
                onClick={() => setShowExternalFormModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <p className="text-sm text-indigo-900">
                💡 상담을 위해 아래 정보를 입력해주세요
              </p>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-4">
              {/* Basic Fields */}
              {landingPage.collect_name !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="홍길동"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {landingPage.collect_phone !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    placeholder="01012345678"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Custom Fields */}
              {customFields.map((field: { id: string; type: string; question: string; options?: string[]; required?: boolean }, index: number) => {
                const fieldKey = field.id || field.question || `field_${index}`
                return (
                  <div key={fieldKey}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.question || `${index + 3}. 항목추가`}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'short_answer' ? (
                      <input
                        type="text"
                        value={customFieldValues[fieldKey] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        placeholder="답변을 입력해주세요"
                        disabled={isSubmitting}
                      />
                    ) : (
                      <select
                        value={customFieldValues[fieldKey] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        disabled={isSubmitting}
                      >
                        <option value="">선택해주세요</option>
                        {field.options?.map((option: string, idx: number) => (
                          <option key={idx} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}

              {/* Privacy Consent */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {landingPage.require_privacy_consent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-600">
                      개인정보 수집 및 이용 동의 (필수)
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowPrivacyModal(true)
                        }}
                        className="ml-2 text-indigo-600 underline font-medium"
                      >
                        [보기]
                      </button>
                    </span>
                  </label>
                )}
                {landingPage.require_marketing_consent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-600">
                      마케팅 활용 동의 (선택)
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMarketingModal(true)
                        }}
                        className="ml-2 text-indigo-600 underline font-medium"
                      >
                        [보기]
                      </button>
                    </span>
                  </label>
                )}
              </div>

              {/* 에러 메시지 - Submit 버튼 바로 위 */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: landingPage.cta_color || '#3B82F6' }}
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                )}
                {isSubmitting ? '제출 중...' : (landingPage.cta_text || '상담 신청하기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">개인정보 수집 및 이용 동의</h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                {landingPage.privacy_policy || '개인정보 수집 및 이용 동의 내용이 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Consent Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">마케팅 활용 동의</h3>
              <button
                onClick={() => setShowMarketingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                {landingPage.marketing_consent || '마케팅 활용 동의 내용이 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
