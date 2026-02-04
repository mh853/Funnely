/**
 * Middleware - Subdomain Routing & Session Management
 * 1. Handles subdomain-based landing page routing
 * 2. Manages Supabase auth sessions
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

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
          .select('id, status, current_period_end, grace_period_end, trial_end')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Check if subscription is expired
        if (subscription) {
          const isExpired =
            ['expired', 'cancelled', 'suspended'].includes(
              subscription.status
            ) ||
            (subscription.status === 'trial' &&
              subscription.trial_end &&
              subscription.trial_end < now) ||
            (subscription.current_period_end < now &&
              (!subscription.grace_period_end ||
                subscription.grace_period_end < now))

          if (isExpired) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/dashboard/subscription/expired'
            return NextResponse.redirect(redirectUrl)
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
