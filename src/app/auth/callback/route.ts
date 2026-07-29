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

  const next = requestUrl.searchParams.get('next')

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

    if (next === '/auth/reset-password') {
      // 로그인만 한 세션으로 /auth/reset-password에 직접 접근해도 현재 비밀번호 확인 없이
      // 비밀번호를 바꿀 수 있는 문제(세션 존재 여부만으로 "복구 링크를 거쳐왔다"고 오판)를
      // 막기 위해, 복구 코드 교환이 실제로 성공했다는 증거를 단명 httpOnly 쿠키로 남긴다.
      // reset-password 페이지는 이 쿠키가 있을 때만 폼을 보여준다.
      const redirectTo = `${origin}${next}`
      const response = NextResponse.redirect(redirectTo)
      response.cookies.set('pwreset_verified', '1', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 300,
        path: '/auth/reset-password',
      })
      return response
    }
  }

  const redirectTo = next && next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`
  return NextResponse.redirect(redirectTo)
}
