/**
 * Middleware - Subdomain Routing & Session Management
 * 1. Handles subdomain-based landing page routing
 * 2. Manages Supabase auth sessions
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 커스텀 도메인으로 회사 정보 조회
 * 미들웨어 Edge Runtime에서 Supabase REST API를 직접 호출
 */
async function lookupCustomDomain(domain: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/company_custom_domains?domain=eq.${encodeURIComponent(domain)}&verification_status=eq.verified&select=company_id,companies(short_id)`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Accept: 'application/json',
        },
        // Edge Runtime 캐시: 60초 (성능 최적화)
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!data || data.length === 0) return null

    // companies가 조인된 경우
    const record = data[0]
    const shortId = record?.companies?.short_id
    return shortId || null
  } catch {
    return null
  }
}

/** 자사 도메인인지 확인 */
function isOwnDomain(hostname: string): boolean {
  const ownDomains = ['funnely.co.kr', 'localhost', '127.0.0.1']
  return (
    ownDomains.some(d => hostname === d || hostname.endsWith(`.${d}`)) ||
    hostname.includes('vercel.app')
  )
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // ============================================================
  // PHASE 0: Custom Domain Routing
  // funnely.co.kr 계열이 아닌 도메인 → 커스텀 도메인 처리
  // ============================================================
  if (!isOwnDomain(hostname) && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    // /landing/* 경로에만 커스텀 도메인 적용
    if (url.pathname.startsWith('/landing/')) {
      const companyShortId = await lookupCustomDomain(hostname.split(':')[0]) // 포트 제거

      if (companyShortId) {
        // /{companyShortId}/landing/{slug} 로 리라이팅
        url.pathname = `/${companyShortId}${url.pathname}`
        return NextResponse.rewrite(url)
      }
    }

    // 커스텀 도메인이지만 랜딩페이지 경로가 아닌 경우 → 루트 랜딩으로 리다이렉트
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/landing'
      return NextResponse.redirect(url)
    }
  }

  // ============================================================
  // PHASE 1: Subdomain Routing (Public Landing Pages)
  // ============================================================

  // Development: localhost handling with subdomain support
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')

    // Check for subdomain in localhost (e.g., q81d1c.localhost:3000)
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== '127') {
      const companyShortId = parts[0]

      // Rewrite /landing/{slug}/completed → /{companyShortId}/landing/{slug}/completed
      if (url.pathname.match(/^\/landing\/[^/]+\/completed$/)) {
        url.pathname = `/${companyShortId}${url.pathname}`
        return NextResponse.rewrite(url)
      }

      // Rewrite /landing/* → /{companyShortId}/landing/*
      if (url.pathname.startsWith('/landing/')) {
        url.pathname = `/${companyShortId}${url.pathname}`
        return NextResponse.rewrite(url)
      }
    }
  }

  // Production: subdomain handling
  const parts = hostname.split('.')

  // Legacy format migration: /landing/{slug}?ref={shortId} → {shortId}.funnely.co.kr/landing/{slug}
  if (url.pathname.startsWith('/landing/') && url.searchParams.has('ref')) {
    const shortId = url.searchParams.get('ref')!
    const domain = parts.slice(-2).join('.') // funnely.co.kr

    // Build new subdomain URL
    url.hostname = `${shortId}.${domain}`
    url.searchParams.delete('ref')

    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  // Legacy format migration: /landing/completed/{slug}?ref={shortId} → {shortId}.funnely.co.kr/landing/{slug}/completed
  if (url.pathname.match(/^\/landing\/completed\/[^/]+$/) && url.searchParams.has('ref')) {
    const shortId = url.searchParams.get('ref')!
    const domain = parts.slice(-2).join('.') // funnely.co.kr
    const slug = url.pathname.split('/')[3] // Extract slug from /landing/completed/{slug}

    // Build new subdomain URL with new format
    url.hostname = `${shortId}.${domain}`
    url.pathname = `/landing/${slug}/completed`
    url.searchParams.delete('ref')

    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  // Main domain (funnely.co.kr or www.funnely.co.kr) - skip subdomain processing
  if (parts.length === 2 || (parts.length === 3 && parts[0] === 'www')) {
    // Continue to authentication check below
  }
  // Subdomain exists (q81d1c.funnely.co.kr)
  else if (parts.length === 3 && parts[0] !== 'www') {
    const companyShortId = parts[0]

    // Rewrite /landing/{slug}/completed → /{companyShortId}/landing/{slug}/completed
    if (url.pathname.match(/^\/landing\/[^/]+\/completed$/)) {
      url.pathname = `/${companyShortId}${url.pathname}`
      return NextResponse.rewrite(url)
    }

    // Rewrite /landing/* → /{companyShortId}/landing/*
    if (url.pathname.startsWith('/landing/')) {
      url.pathname = `/${companyShortId}${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // ============================================================
  // PHASE 2: Authentication Check (Protected Routes Only)
  // ============================================================

  // Skip authentication for public landing pages and completion pages
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/landing/') ||
    pathname.match(/^\/[^/]+\/landing\//)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Admin routes - require super admin privileges
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')

  // Subscription pages - always allow access (users need to select plans)
  const isSubscriptionPage =
    request.nextUrl.pathname.startsWith('/dashboard/subscription')

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/admin']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    // Refresh session and check authentication in one call
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Additional check for admin routes
    if (isAdminPath) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()

      if (!userProfile?.is_super_admin) {
        // Redirect non-super-admins to dashboard
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Subscription access check for dashboard (except subscription pages)
    if (
      request.nextUrl.pathname.startsWith('/dashboard') &&
      !isSubscriptionPage
    ) {
      // Get user's company subscription status
      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (profile?.company_id) {
        const now = new Date().toISOString()

        const { data: subscription } = await supabase
          .from('company_subscriptions')
          .select('id, status, current_period_end, grace_period_end, trial_end_date, plan_id')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (subscription) {
          // 체험 만료 감지 → Free 플랜으로 다운그레이드
          const isTrialExpired =
            subscription.status === 'trial' &&
            subscription.trial_end_date &&
            subscription.trial_end_date < now

          if (isTrialExpired) {
            // Free 플랜 조회 후 다운그레이드
            const { data: freePlan } = await supabase
              .from('subscription_plans')
              .select('id')
              .eq('name', 'Free')
              .eq('is_active', true)
              .order('sort_order', { ascending: true })
              .limit(1)
              .single()

            if (freePlan) {
              await supabase
                .from('company_subscriptions')
                .update({
                  plan_id: freePlan.id,
                  status: 'active',
                  billing_cycle: 'monthly',
                  current_period_start: null,
                  current_period_end: null,
                  trial_start_date: null,
                  trial_end_date: null,
                  has_used_trial: true,
                })
                .eq('id', subscription.id)
              // 다운그레이드 후 접근 허용 (배너는 클라이언트에서 표시)
            }
          } else {
            // 명시적 만료/취소/정지 상태만 차단 (Free 플랜 active는 항상 허용)
            const isBlocked =
              ['expired', 'cancelled', 'suspended'].includes(subscription.status) ||
              (subscription.status === 'active' &&
                subscription.current_period_end !== null &&
                subscription.current_period_end < now &&
                (!subscription.grace_period_end ||
                  subscription.grace_period_end < now))

            if (isBlocked) {
              const redirectUrl = request.nextUrl.clone()
              redirectUrl.pathname = '/dashboard/subscription/expired'
              return NextResponse.redirect(redirectUrl)
            }
          }
        }
      }
    }
  } else {
    // For non-protected routes, just refresh session if expired
    await supabase.auth.getUser()
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
