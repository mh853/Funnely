// 광고 계정 연결 시작 - 퍼널리 Meta 앱 로그인 다이얼로그, Google OAuth 동의 화면, 카카오 비즈니스 인증 동의 화면으로 보낸다
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { META_OAUTH_STATE_COOKIE, buildMetaAuthUrl, isMetaConfigured, isMetaEnabledForCompany } from '@/lib/ads/meta'
import {
  GOOGLE_ADS_OAUTH_STATE_COOKIE,
  buildGoogleAdsAuthUrl,
  isGoogleAdsConfigured,
  isGoogleAdsEnabledForCompany,
} from '@/lib/ads/google'
import {
  KAKAO_ADS_OAUTH_STATE_COOKIE,
  buildKakaoAdsAuthUrl,
  isKakaoAdsConfigured,
  isKakaoAdsEnabledForCompany,
} from '@/lib/ads/kakao'

function backToPerformance(request: NextRequest, error: string) {
  return NextResponse.redirect(
    new URL(`/dashboard/ad-performance?error=${encodeURIComponent(error)}`, request.url)
  )
}

const PLATFORMS = {
  meta: {
    label: 'Meta',
    configured: isMetaConfigured,
    enabledFor: isMetaEnabledForCompany,
    authUrl: buildMetaAuthUrl,
    stateCookie: META_OAUTH_STATE_COOKIE,
  },
  google: {
    label: '구글 광고',
    configured: isGoogleAdsConfigured,
    enabledFor: isGoogleAdsEnabledForCompany,
    authUrl: buildGoogleAdsAuthUrl,
    stateCookie: GOOGLE_ADS_OAUTH_STATE_COOKIE,
  },
  kakao: {
    label: '카카오 광고',
    configured: isKakaoAdsConfigured,
    enabledFor: isKakaoAdsEnabledForCompany,
    authUrl: buildKakaoAdsAuthUrl,
    stateCookie: KAKAO_ADS_OAUTH_STATE_COOKIE,
  },
}

// 버튼이 이 주소로 바로 이동(GET)하면 state 쿠키를 심고 Meta/Google/카카오로 302 한다. (네이버는 OAuth가 없어 connect/naver)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  if (!Object.prototype.hasOwnProperty.call(PLATFORMS, platform)) {
    return backToPerformance(request, '연결할 수 없는 광고 플랫폼입니다.')
  }
  const config = PLATFORMS[platform as keyof typeof PLATFORMS]
  if (!config.configured()) {
    return backToPerformance(request, `${config.label} 연동이 아직 준비되지 않았습니다.`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile || !isAdminOrLegacyOwner(userProfile)) {
    return backToPerformance(request, '광고 계정 연결은 회사 관리자만 할 수 있습니다.')
  }
  if (!config.enabledFor(userProfile.company_id)) {
    return backToPerformance(request, `${config.label} 연동이 아직 준비되지 않았습니다.`)
  }

  // CSRF 방지 - 콜백에서 쿼리의 state와 이 쿠키 값이 같은지 확인한다.
  // Meta·Google·카카오에서 돌아오는 요청은 다른 사이트에서 온 최상위 GET이라 sameSite는 lax여야 쿠키가 실린다.
  const state = crypto.randomBytes(24).toString('hex')
  const response = NextResponse.redirect(config.authUrl(state))
  response.cookies.set(config.stateCookie, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })
  return response
}
