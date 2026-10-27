// 카카오 비즈니스 인증 동의 화면에서 돌아오는 콜백 - state 검증, 비즈니스 토큰 교환(1회), 동의한 카카오모먼트 광고계정 저장 후 첫 동기화
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/encryption/credentials'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import {
  KAKAO_ADS_OAUTH_STATE_COOKIE,
  exchangeCodeForToken,
  getGrantedMomentAccountIds,
  hasMomentScope,
  isKakaoAdsConfigured,
  isKakaoAdsEnabledForCompany,
  listAdAccounts,
} from '@/lib/ads/kakao'
import { syncKakaoAdAccount } from '@/lib/ads/kakao-sync'
import { HISTORY_DAYS } from '@/lib/ads/sync-window'

// 1년치는 계정당 보고서 12번 × 5초라 1분 남짓 걸린다
export const maxDuration = 300

/** 콜백 시간 안에 1년치를 받을 수 있는 계정 수. 넘으면 30일만 받고 나머지는 다음 동기화(1년 미수신 계정)가 받는다 */
const HISTORY_ACCOUNT_LIMIT = 3

function redirectWith(request: NextRequest, key: 'error' | 'connected', value: string) {
  const query = key === 'connected' ? `connected=${encodeURIComponent(value)}&platform=kakao` : `error=${encodeURIComponent(value)}`
  const response = NextResponse.redirect(new URL(`/dashboard/ad-performance?${query}`, request.url))
  response.cookies.delete(KAKAO_ADS_OAUTH_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(KAKAO_ADS_OAUTH_STATE_COOKIE)?.value

  if (searchParams.get('error')) {
    // 동의 취소(access_denied), 카카오비즈니스 미가입(KOE025)·광고계정 없음(KOE027) 등
    console.warn('[Kakao Ads callback] authorize error:', searchParams.get('error'), searchParams.get('error_description'))
    return redirectWith(
      request,
      'error',
      searchParams.get('error') === 'access_denied'
        ? '카카오 광고 연결이 취소되었습니다.'
        : '카카오 광고 연결에 실패했습니다. 카카오모먼트 광고계정이 있는 카카오계정인지 확인해주세요.'
    )
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWith(request, 'error', '연결 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.')
  }
  if (!isKakaoAdsConfigured()) {
    return redirectWith(request, 'error', '카카오 광고 연동이 아직 준비되지 않았습니다.')
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
  if (!isKakaoAdsEnabledForCompany(userProfile.company_id)) {
    return redirectWith(request, 'error', '카카오 광고 연동이 아직 준비되지 않았습니다.')
  }

  try {
    const token = await exchangeCodeForToken(code)
    if (!hasMomentScope(token)) {
      return redirectWith(request, 'error', '카카오모먼트 광고계정 접근 권한을 허용해야 연결할 수 있습니다.')
    }

    // 동의한 광고계정만 연결한다. ["*"]면 고객이 가진 모든 광고계정
    const granted = await getGrantedMomentAccountIds(token.accessToken)
    const all = await listAdAccounts(token.accessToken)
    const accounts = granted.includes('*') ? all : all.filter((a) => granted.includes(a.id))
    if (accounts.length === 0) {
      return redirectWith(request, 'error', '연결할 카카오모먼트 광고계정이 없습니다. 동의 화면에서 광고계정을 선택해주세요.')
    }

    // 쓰기는 앱 코드에서 관리자 확인을 마친 뒤 서비스 롤로 한다 (ad_accounts RLS는 옛 role 기준)
    const admin = createServiceClient() as any
    const { data: saved, error } = await admin
      .from('ad_accounts')
      .upsert(
        accounts.map((account) => ({
          company_id: userProfile.company_id,
          platform: 'kakao',
          account_id: account.id,
          account_name: account.name,
          // 비즈니스 토큰은 갱신 토큰·만료 시각이 없다 (장기 미사용 시 만료 → 동기화 때 -401로 알게 된다)
          access_token: encryptToken(token.accessToken),
          refresh_token: null,
          token_expires_at: null,
          is_active: true,
          created_by: user.id,
          metadata: {
            member_type: account.memberType,
            account_config: account.config,
            needs_reconnect: false,
            last_sync_error: null,
          },
        })),
        { onConflict: 'company_id,platform,account_id' }
      )
      .select('id, company_id, account_id, access_token, token_expires_at, metadata, is_active')
    if (error) throw new Error(`광고 계정 저장 실패: ${error.message}`)

    // 연결 직후 기간을 바꿔 봐도 비어 있지 않도록 최근 1년을 바로 가져온다 (실패해도 연결 자체는 유지)
    const days = (saved || []).length <= HISTORY_ACCOUNT_LIMIT ? HISTORY_DAYS : 30
    for (const account of saved || []) {
      await syncKakaoAdAccount(admin, account, days)
    }

    return redirectWith(request, 'connected', String(accounts.length))
  } catch (error) {
    console.error('[Kakao Ads callback] error:', error)
    return redirectWith(request, 'error', '카카오 광고 계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
