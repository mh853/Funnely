/**
 * Middleware - Subdomain Routing & Session Management
 * 1. Handles subdomain-based landing page routing
 * 2. Manages Supabase auth sessions
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getBaseDomain } from '@/lib/utils/landing-page-url'
import { pickCurrentSubscription } from '@/lib/subscription-current'

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

/**
 * 커스텀 도메인 루트(/) 접속 시 보여줄 대표 랜딩페이지 slug 조회
 * 가장 최근에 게시된 활성 랜딩페이지를 대표 페이지로 사용한다.
 */
async function lookupDefaultLandingSlug(companyShortId: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/landing_pages?select=slug,companies!inner(short_id)&companies.short_id=eq.${encodeURIComponent(companyShortId)}&is_active=eq.true&status=eq.published&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Accept: 'application/json',
        },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!data || data.length === 0) return null

    return data[0]?.slug || null
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

    // 커스텀 도메인 루트 접속 → 회사의 대표(최근 게시) 랜딩페이지로 리다이렉트
    // (slug 없이 '/landing'으로만 보내면 무조건 404가 나므로, 실제 게시된
    // 랜딩페이지를 찾아 구체적인 경로로 안내한다)
    if (url.pathname === '/' || url.pathname === '') {
      const companyShortId = await lookupCustomDomain(hostname.split(':')[0])
      const defaultSlug = companyShortId
        ? await lookupDefaultLandingSlug(companyShortId)
        : null

      if (defaultSlug) {
        url.pathname = `/landing/${defaultSlug}`
        return NextResponse.redirect(url)
      }

      // 게시된 랜딩페이지가 없는 회사 → 실제로 보여줄 페이지가 없으므로 404가 맞다
      return NextResponse.next()
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
  // 메인 도메인은 실제 설정된 도메인 문자열과 직접 비교한다 — funnely.co.kr처럼
  // TLD 자체가 여러 라벨(co.kr)인 도메인에서는 hostname.split('.').length로
  // "메인 도메인인지 서브도메인인지"를 판단할 수 없다 (co.kr이 메인 도메인으로 오인되고,
  // 실제 서브도메인은 라벨 4개라 아무 분기에도 걸리지 않는다).
  const mainDomain = getBaseDomain() // 예: funnely.co.kr
  const hostNoPort = hostname.split(':')[0]
  const isMainDomain = hostNoPort === mainDomain || hostNoPort === `www.${mainDomain}`
  const subdomainSuffix = `.${mainDomain}`
  const subdomainShortId = !isMainDomain && hostNoPort.endsWith(subdomainSuffix)
    ? hostNoPort.slice(0, -subdomainSuffix.length)
    : null

  // Legacy format migration: /landing/{slug}?ref={shortId} → {shortId}.funnely.co.kr/landing/{slug}
  if (url.pathname.startsWith('/landing/') && url.searchParams.has('ref')) {
    const shortId = url.searchParams.get('ref')!

    // Build new subdomain URL
    url.hostname = `${shortId}.${mainDomain}`
    url.searchParams.delete('ref')

    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  // Legacy format migration: /landing/completed/{slug}?ref={shortId} → {shortId}.funnely.co.kr/landing/{slug}/completed
  if (url.pathname.match(/^\/landing\/completed\/[^/]+$/) && url.searchParams.has('ref')) {
    const shortId = url.searchParams.get('ref')!
    const slug = url.pathname.split('/')[3] // Extract slug from /landing/completed/{slug}

    // Build new subdomain URL with new format
    url.hostname = `${shortId}.${mainDomain}`
    url.pathname = `/landing/${slug}/completed`
    url.searchParams.delete('ref')

    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  // Main domain (funnely.co.kr or www.funnely.co.kr) - skip subdomain processing
  if (isMainDomain) {
    // Continue to authentication check below
  }
  // Subdomain exists (q81d1c.funnely.co.kr)
  else if (subdomainShortId) {
    const companyShortId = subdomainShortId

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

  // 세션 갱신 + 로그인 여부 확인 (아래에서 재사용)
  const { data: { user } } = await supabase.auth.getUser()

  // 이미 로그인한 사용자가 로그인/가입 페이지에 재접속하면 대시보드로 보낸다.
  // /auth/reset-password 등 다른 /auth/* 경로는 비밀번호 복구용 임시 세션이
  // 필요할 수 있으므로 여기서 건드리지 않는다.
  // account_deactivated로 로그인 페이지에 온 경우는 여기서 되돌리면 안 된다 —
  // 비활성화된 계정이면서도 세션 토큰 자체는 아직 유효해서 user가 truthy이므로,
  // 그대로 두면 대시보드로 보냈다가 다시 여기로 튕겨나오는 무한 리다이렉트 루프가 된다.
  const currentPathname = request.nextUrl.pathname
  const isDeactivatedRedirect = request.nextUrl.searchParams.get('error') === 'account_deactivated'
  if (
    user &&
    !isDeactivatedRedirect &&
    (currentPathname === '/auth/login' || currentPathname === '/auth/signup')
  ) {
    // /auth/login?redirectTo=...로 왔다면(예: 다른 탭에서 로그인을 마친 뒤 같은 링크를
    // 다시 열었을 때) 원래 가려던 곳으로 보낸다.
    // 없으면: /auth/signup은 홈페이지 플랜 선택 CTA가 향하는 곳이므로 구독 관리 페이지로,
    // /auth/login은 기존대로 대시보드로 보낸다.
    const requestedRedirect = request.nextUrl.searchParams.get('redirectTo')
    const defaultRedirect = currentPathname === '/auth/signup' ? '/dashboard/subscription' : '/dashboard'
    const safeRedirect =
      requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
        ? requestedRedirect
        : defaultRedirect

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = safeRedirect
    redirectUrl.search = ''

    // getUser()가 만료된 액세스 토큰을 방금 갱신했을 수 있다 — 그 쿠키는 위 콜백들이
    // response에 실어뒀으므로, 새로 만드는 리다이렉트 응답에도 그대로 옮겨줘야
    // 브라우저가 갱신된 세션 쿠키를 잃지 않는다.
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // Admin routes - require super admin privileges
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')

  // Subscription pages - always allow access (users need to select plans)
  // Support pages - always allow access (users need support even when expired)
  const isSubscriptionPage =
    request.nextUrl.pathname.startsWith('/dashboard/subscription') ||
    request.nextUrl.pathname.startsWith('/dashboard/support')

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/admin']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // 계정/소속 회사가 비활성화된 사용자는 관리자·대시보드 모든 경로에서 차단한다.
    // (예전에는 관리자의 "비활성화" 버튼이 DB 플래그만 바꿀 뿐 실제로 아무 것도
    // 막지 않았다 — 이 검사가 그 유일한 실제 집행 지점이다.)
    const { data: userProfile } = await supabase
      .from('users')
      .select('is_active, is_super_admin, company_id, companies(is_active, withdrawn_at)')
      .eq('id', user.id)
      .single()

    const userCompany = userProfile?.companies as
      | { is_active: boolean | null; withdrawn_at: string | null }
      | null
      | undefined

    if (
      userProfile?.is_active === false ||
      userCompany?.is_active === false ||
      userCompany?.withdrawn_at
    ) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      redirectUrl.search = ''
      redirectUrl.searchParams.set('error', 'account_deactivated')
      return NextResponse.redirect(redirectUrl)
    }

    // Additional check for admin routes
    if (isAdminPath) {
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
      if (userProfile?.company_id) {
        const now = new Date().toISOString()

        // 회사의 구독 목록 조회 후 가장 유효한 구독 선택 (우선순위는 pickCurrentSubscription 참고)
        const { data: allSubs } = await supabase
          .from('company_subscriptions')
          .select('id, status, current_period_end, grace_period_end, trial_end_date, cancelled_at, plan_id')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false })
          .limit(10)

        const subscription = pickCurrentSubscription(allSubs ?? [])

        if (subscription) {
          const isTrialExpired =
            subscription.status === 'trial' &&
            subscription.trial_end_date &&
            subscription.trial_end_date < now

          // 체험 만료도 명시적 만료/취소/정지와 동일하게 차단한다.
          // (예전에는 "Free 플랜으로 다운그레이드" 후 계속 허용하려 했지만, 활성화된
          // Free 플랜이 DB에 없어 다운그레이드가 항상 조용히 실패했고, 그 결과
          // 체험이 끝난 계정이 영구적으로 무료 이용 가능한 상태로 남는 버그가 있었다.
          // 다른 만료 상태와 동일하게 /dashboard/subscription/expired로 보내
          // 사용자가 직접 플랜을 선택하게 한다.)
          // cancelled는 "다음 결제를 하지 않겠다"는 의미일 뿐, 이미 결제한 기간의 이용
          // 권리를 즉시 뺏는 게 아니다 — 취소 확인 모달에서도 기간까지 이용 가능하다고
          // 안내한다. period_end를 모르는 cancelled는 안전하게 차단 상태로 취급한다.
          const isCancelledAndExpired =
            subscription.status === 'cancelled' &&
            (subscription.current_period_end === null || subscription.current_period_end < now)

          const isActiveAndExpired =
            subscription.status === 'active' &&
            subscription.current_period_end !== null &&
            subscription.current_period_end < now &&
            (!subscription.grace_period_end || subscription.grace_period_end < now)

          const isBlocked =
            isTrialExpired ||
            ['expired', 'suspended'].includes(subscription.status) ||
            isCancelledAndExpired ||
            isActiveAndExpired

          if (isBlocked) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/dashboard/subscription/expired'
            return NextResponse.redirect(redirectUrl)
          }
        }
      }
    }
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
