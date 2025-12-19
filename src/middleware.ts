/**
 * Middleware - Session Management
 * Automatically refreshes Supabase auth sessions
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
