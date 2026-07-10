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
      // 비밀번호 재설정 링크를 요청한 브라우저와 다른 브라우저/기기에서 열면
      // PKCE code_verifier가 없어 이 에러가 난다. "로그인 실패"라는 안내는
      // 애초에 로그인한 적 없는 사용자에게 오해를 주므로 별도 메시지로 구분한다.
      const errorCode = (error as { code?: string }).code === 'pkce_code_verifier_not_found'
        ? 'link_wrong_device'
        : 'auth_failed'
      return NextResponse.redirect(`${origin}/auth/login?error=${errorCode}`)
    }
  }

  const next = requestUrl.searchParams.get('next')
  const redirectTo = next && next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
  return NextResponse.redirect(redirectTo)
}
