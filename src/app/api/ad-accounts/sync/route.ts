// 회사에 연결된 Meta 광고 계정 성과를 지금 바로 다시 가져오는 수동 동기화 (최근 30일)
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isMetaConfigured } from '@/lib/ads/meta'
import { syncMetaAdAccount } from '@/lib/ads/meta-sync'

export const maxDuration = 300

export async function POST() {
  if (!isMetaConfigured()) {
    return NextResponse.json({ error: 'Meta 연동이 아직 준비되지 않았습니다.' }, { status: 503 })
  }

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

  const admin = createServiceClient() as any
  const { data: accounts, error } = await admin
    .from('ad_accounts')
    .select('id, company_id, account_id, access_token, token_expires_at, metadata')
    .eq('company_id', userProfile.company_id)
    .eq('platform', 'meta')
    .eq('is_active', true)
  if (error) {
    return NextResponse.json({ error: '광고 계정을 불러오지 못했습니다.' }, { status: 500 })
  }

  const results = []
  for (const account of accounts || []) {
    results.push(await syncMetaAdAccount(admin, account, 30))
  }
  return NextResponse.json({ results })
}
