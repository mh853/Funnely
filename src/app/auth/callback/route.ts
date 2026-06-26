/**
 * Auth Callback Route
 * Handles OAuth callbacks and email confirmations
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error:', error.message)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }
  }

  const next = requestUrl.searchParams.get('next')
  const redirectTo = next && next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
  return NextResponse.redirect(redirectTo)
}
