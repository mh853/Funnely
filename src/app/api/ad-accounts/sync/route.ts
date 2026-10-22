// 회사에 연결된 Meta·구글·네이버 광고 계정 성과를 지금 바로 다시 가져오는 수동 동기화 (최근 30일, 과거 1년을 아직 안 받은 계정은 1년, 플랫폼별)
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isMetaEnabledForCompany } from '@/lib/ads/meta'
import { syncMetaAdAccount } from '@/lib/ads/meta-sync'
import { isGoogleAdsEnabledForCompany } from '@/lib/ads/google'
import { syncGoogleAdAccount } from '@/lib/ads/google-sync'
import { isNaverAdsEnabledForCompany } from '@/lib/ads/naver'
import { syncNaverAdAccount } from '@/lib/ads/naver-sync'
import { syncDaysFor } from '@/lib/ads/sync-window'

export const maxDuration = 300

const PLATFORMS = {
  meta: { label: 'Meta', enabledFor: isMetaEnabledForCompany, sync: syncMetaAdAccount },
  google: { label: '구글 광고', enabledFor: isGoogleAdsEnabledForCompany, sync: syncGoogleAdAccount },
  naver: { label: '네이버 광고', enabledFor: isNaverAdsEnabledForCompany, sync: syncNaverAdAccount },
}

export async function POST(request: NextRequest) {
  // 본문이 없던 예전 화면 요청은 Meta로 본다
  const body = await request.json().catch(() => ({}))
  const platform: keyof typeof PLATFORMS = Object.prototype.hasOwnProperty.call(PLATFORMS, body?.platform) ? body.platform : 'meta'
  const { label, enabledFor, sync } = PLATFORMS[platform]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile?.company_id || !isAdminOrLegacyOwner(userProfile)) {
    return NextResponse.json({ error: '회사 관리자만 동기화할 수 있습니다.' }, { status: 403 })
  }
  const enabled = enabledFor(userProfile.company_id)
  if (!enabled) {
    return NextResponse.json({ error: `${label} 연동이 아직 준비되지 않았습니다.` }, { status: 503 })
  }

  const admin = createServiceClient() as any
  const { data: accounts, error } = await admin
    .from('ad_accounts')
    .select('id, company_id, account_id, access_token, refresh_token, token_expires_at, metadata')
    .eq('company_id', userProfile.company_id)
    .eq('platform', platform)
    .eq('is_active', true)
  if (error) {
    return NextResponse.json({ error: '광고 계정을 불러오지 못했습니다.' }, { status: 500 })
  }

  const results = []
  for (const account of accounts || []) {
    const days = syncDaysFor(account, 30)
    results.push(await sync(admin, account, days))
  }
  return NextResponse.json({ results })
}
