// Google OAuth 동의 화면에서 돌아오는 콜백 - state 검증, refresh_token 교환, 광고 계정(관리자 하위 포함) 저장 후 첫 동기화
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/encryption/credentials'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import {
  GOOGLE_ADS_OAUTH_STATE_COOKIE,
  GoogleAdsApiError,
  exchangeCodeForToken,
  hasAdwordsScope,
  isGoogleAdsConfigured,
  isGoogleAdsEnabledForCompany,
  listConnectableAccounts,
} from '@/lib/ads/google'
import { syncGoogleAdAccount } from '@/lib/ads/google-sync'

// 첫 연결 직후 최근 30일 성과까지 받아오므로 기본 시간보다 넉넉하게 둔다
export const maxDuration = 300

function redirectWith(request: NextRequest, key: 'error' | 'connected', value: string) {
  const query = key === 'connected' ? `connected=${encodeURIComponent(value)}&platform=google` : `error=${encodeURIComponent(value)}`
  const response = NextResponse.redirect(new URL(`/dashboard/ad-performance?${query}`, request.url))
  response.cookies.delete(GOOGLE_ADS_OAUTH_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(GOOGLE_ADS_OAUTH_STATE_COOKIE)?.value

  if (searchParams.get('error')) {
    // 사용자가 동의를 취소한 경우 등 (error=access_denied)
    return redirectWith(request, 'error', '구글 광고 연결이 취소되었습니다.')
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWith(request, 'error', '연결 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.')
  }
  if (!isGoogleAdsConfigured()) {
    return redirectWith(request, 'error', '구글 광고 연동이 아직 준비되지 않았습니다.')
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
  if (!userProfile?.company_id || !isAdminOrLegacyOwner(userProfile)) {
    return redirectWith(request, 'error', '광고 계정 연결은 회사 관리자만 할 수 있습니다.')
  }
  if (!isGoogleAdsEnabledForCompany(userProfile.company_id)) {
    return redirectWith(request, 'error', '구글 광고 연동이 아직 준비되지 않았습니다.')
  }

  try {
    const token = await exchangeCodeForToken(code)
    if (!hasAdwordsScope(token)) {
      return redirectWith(request, 'error', '구글 광고 계정 접근 권한을 허용해야 연결할 수 있습니다.')
    }
    if (!token.refreshToken) {
      return redirectWith(request, 'error', '구글 연결 정보를 받지 못했습니다. 다시 시도해주세요.')
    }

    const accounts = await listConnectableAccounts(token.accessToken)
    if (accounts.length === 0) {
      // 운영 중지(해지)된 계정은 API로 조회되지 않아 목록에서 빠진다
      return redirectWith(
        request,
        'error',
        '이 구글 계정으로 연결할 수 있는 광고 계정이 없습니다. 운영 중지된 계정은 구글 광고에서 재활성화한 뒤 다시 연결해주세요.'
      )
    }

    // 쓰기는 앱 코드에서 관리자 확인을 마친 뒤 서비스 롤로 한다 (ad_accounts RLS는 옛 role 기준)
    const admin = createServiceClient() as any
    const { data: saved, error } = await admin
      .from('ad_accounts')
      .upsert(
        accounts.map((account) => ({
          company_id: userProfile.company_id,
          platform: 'google',
          account_id: account.customerId,
          account_name: account.name,
          // 액세스 토큰은 1시간이면 만료돼 동기화 때마다 refresh_token으로 새로 받는다 (컬럼이 NOT NULL이라 받은 값을 둔다)
          access_token: encryptToken(token.accessToken),
          refresh_token: encryptToken(token.refreshToken!),
          token_expires_at: null,
          is_active: true,
          created_by: user.id,
          metadata: {
            currency: account.currency,
            timezone: account.timeZone,
            test_account: account.testAccount,
            login_customer_id: account.loginCustomerId,
            needs_reconnect: false,
            last_sync_error: null,
          },
        })),
        { onConflict: 'company_id,platform,account_id' }
      )
      .select('id, company_id, account_id, access_token, refresh_token, token_expires_at, metadata, is_active')
    if (error) throw new Error(`광고 계정 저장 실패: ${error.message}`)

    // 연결 직후 화면이 비어 있지 않도록 최근 30일을 바로 가져온다 (실패해도 연결 자체는 유지)
    for (const account of saved || []) {
      await syncGoogleAdAccount(admin, account, 30)
    }

    return redirectWith(request, 'connected', String(accounts.length))
  } catch (error) {
    console.error('[Google Ads callback] error:', error)
    if (error instanceof GoogleAdsApiError && error.projectNotApproved) {
      return redirectWith(request, 'error', '구글 광고 연동 승인을 기다리는 중입니다. 잠시 후 다시 시도해주세요.')
    }
    return redirectWith(request, 'error', '구글 광고 계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
