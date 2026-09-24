// Meta 로그인 다이얼로그에서 돌아오는 콜백 - state 검증, 장기 토큰 교환, 광고 계정 저장 후 첫 동기화
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/encryption/credentials'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { META_OAUTH_STATE_COOKIE, exchangeCodeForToken, isMetaConfigured, listAdAccounts } from '@/lib/ads/meta'
import { syncMetaAdAccount } from '@/lib/ads/meta-sync'

// 첫 연결 직후 최근 30일 성과까지 받아오므로 기본 시간보다 넉넉하게 둔다
export const maxDuration = 300

function redirectWith(request: NextRequest, key: 'error' | 'connected', value: string) {
  const response = NextResponse.redirect(
    new URL(`/dashboard/ad-performance?${key}=${encodeURIComponent(value)}`, request.url)
  )
  response.cookies.delete(META_OAUTH_STATE_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(META_OAUTH_STATE_COOKIE)?.value

  if (searchParams.get('error')) {
    // 사용자가 권한 동의를 취소한 경우 등
    return redirectWith(request, 'error', 'Meta 연결이 취소되었습니다.')
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWith(request, 'error', '연결 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.')
  }
  if (!isMetaConfigured()) {
    return redirectWith(request, 'error', 'Meta 연동이 아직 준비되지 않았습니다.')
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

  try {
    const token = await exchangeCodeForToken(code)
    const accounts = await listAdAccounts(token.accessToken)
    if (accounts.length === 0) {
      return redirectWith(request, 'error', '이 Meta 계정으로 접근할 수 있는 광고 계정이 없습니다.')
    }

    // 쓰기는 앱 코드에서 관리자 확인을 마친 뒤 서비스 롤로 한다 (ad_accounts RLS는 옛 role 기준)
    const admin = createServiceClient() as any
    const { data: saved, error } = await admin
      .from('ad_accounts')
      .upsert(
        accounts.map((account) => ({
          company_id: userProfile.company_id,
          platform: 'meta',
          account_id: account.id, // act_123 형태 (예전 연동과 같은 키로 덮어쓴다)
          account_name: account.name || account.id,
          access_token: encryptToken(token.accessToken),
          token_expires_at: token.expiresAt,
          is_active: account.account_status === 1,
          created_by: user.id,
          metadata: {
            currency: account.currency,
            timezone: account.timezone_name,
            account_status: account.account_status,
            needs_reconnect: false,
            last_sync_error: null,
          },
        })),
        { onConflict: 'company_id,platform,account_id' }
      )
      .select('id, company_id, account_id, access_token, token_expires_at, metadata, is_active')
    if (error) throw new Error(`광고 계정 저장 실패: ${error.message}`)

    // 연결 직후 화면이 비어 있지 않도록 최근 30일을 바로 가져온다 (실패해도 연결 자체는 유지)
    for (const account of saved || []) {
      if (account.is_active) await syncMetaAdAccount(admin, account, 30)
    }

    return redirectWith(request, 'connected', String(accounts.length))
  } catch (error) {
    console.error('[Meta callback] error:', error)
    return redirectWith(request, 'error', 'Meta 광고 계정 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
