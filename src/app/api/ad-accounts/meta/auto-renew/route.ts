// Meta 연결 자동 연장 켜기·끄기 - 회사의 Meta 광고 계정 전부에 같은 설정(metadata.auto_renew)을 저장한다
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isMetaEnabledForCompany } from '@/lib/ads/meta'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile?.company_id || !isAdminOrLegacyOwner(userProfile)) {
    return NextResponse.json({ error: '회사 관리자만 바꿀 수 있습니다.' }, { status: 403 })
  }
  if (!isMetaEnabledForCompany(userProfile.company_id)) {
    return NextResponse.json({ error: 'Meta 연동이 아직 준비되지 않았습니다.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const admin = createServiceClient() as any
  const { data: accounts } = await admin
    .from('ad_accounts')
    .select('id, metadata')
    .eq('company_id', userProfile.company_id)
    .eq('platform', 'meta')
  for (const a of accounts || []) {
    const { error } = await admin
      .from('ad_accounts')
      .update({ metadata: { ...a.metadata, auto_renew: body.enabled } })
      .eq('id', a.id)
    if (error) return NextResponse.json({ error: '설정을 저장하지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
