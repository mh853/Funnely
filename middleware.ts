import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware: Subdomain-based Landing Page Routing
 *
 * URL Structure:
 * - Subdomain format: {companyShortId}.funnely.co.kr/landing/{slug}
 * - Legacy format: funnely.co.kr/landing/{slug}?ref={companyShortId}
 *
 * Examples:
 * - q81d1c.funnely.co.kr/landing/dental → /{companyShortId}/landing/dental
 * - funnely.co.kr/landing/dental?ref=q81d1c → 301 redirect to subdomain
 */

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Development: localhost handling
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next()
  }

  // Extract subdomain from hostname
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

  // Legacy format migration: /completed/{slug}?ref={shortId}
  if (url.pathname.startsWith('/completed/') && url.searchParams.has('ref')) {
    const shortId = url.searchParams.get('ref')!
    const domain = parts.slice(-2).join('.') // funnely.co.kr

    // Build new subdomain URL with /landing/completed/ prefix
    url.hostname = `${shortId}.${domain}`
    url.pathname = url.pathname.replace('/completed/', '/landing/completed/')
    url.searchParams.delete('ref')

    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  // Main domain (funnely.co.kr or www.funnely.co.kr)
  if (parts.length === 2 || (parts.length === 3 && parts[0] === 'www')) {
    return NextResponse.next()
  }

  // Subdomain exists (q81d1c.funnely.co.kr)
  if (parts.length === 3 && parts[0] !== 'www') {
    const companyShortId = parts[0]

    // Rewrite /landing/* → /{companyShortId}/landing/*
    if (url.pathname.startsWith('/landing/')) {
      url.pathname = `/${companyShortId}${url.pathname}`
      return NextResponse.rewrite(url)
    }

    // Rewrite /completed/* → /{companyShortId}/landing/completed/*
    if (url.pathname.startsWith('/completed/')) {
      url.pathname = url.pathname.replace('/completed/', `/${companyShortId}/landing/completed/`)
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/landing/:path*',
    '/completed/:path*',
  ],
}
