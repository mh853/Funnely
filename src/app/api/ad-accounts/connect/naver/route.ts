// 네이버 검색광고 계정 연결 요청 - 고객이 입력한 CUSTOMER_ID를 '승인 대기'로 저장하고, 퍼널리 관리자가 초대 수락·회사 대조 후 승인한다
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isNaverAdsEnabledForCompany } from '@/lib/ads/naver'

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: '광고 계정 연결은 회사 관리자만 할 수 있습니다.' }, { status: 403 })
  }
  if (!isNaverAdsEnabledForCompany(userProfile.company_id)) {
    return NextResponse.json({ error: '네이버 광고 연동이 아직 준비되지 않았습니다.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const customerId = String(body?.customerId ?? '').replace(/[\s-]/g, '')
  if (!/^\d{4,12}$/.test(customerId)) {
    return NextResponse.json({ error: '광고계정 ID(숫자)를 정확히 입력해주세요.' }, { status: 400 })
  }

  const admin = createServiceClient() as any
  const { data: existing, error: lookupError } = await admin
    .from('ad_accounts')
    .select('id, company_id, metadata')
    .eq('platform', 'naver')
    .eq('account_id', customerId)
  if (lookupError) {
    return NextResponse.json({ error: '연결 요청을 확인하지 못했습니다.' }, { status: 500 })
  }

  // 한 광고계정은 한 회사에만 연결한다. 고객에게 다른 회사 정보는 알려주지 않는다.
  const takenByOther = (existing || []).some(
    (a: any) => a.company_id !== userProfile.company_id && a.metadata?.approval !== 'rejected'
  )
  if (takenByOther) {
    return NextResponse.json({ error: '이 광고계정은 연결할 수 없습니다. 퍼널리 고객센터로 문의해주세요.' }, { status: 409 })
  }
  const mine = (existing || []).find((a: any) => a.company_id === userProfile.company_id)
  if (mine && mine.metadata?.approval !== 'rejected') {
    return NextResponse.json({ error: '이미 연결했거나 승인을 기다리는 광고계정입니다.' }, { status: 409 })
  }

  const row = {
    company_id: userProfile.company_id,
    platform: 'naver',
    account_id: customerId,
    // 승인할 때 네이버에서 받은 광고계정 이름으로 바꾼다
    account_name: `네이버 검색광고 ${customerId}`,
    // 퍼널리 공용 키로 호출해 계정별 토큰이 없다 (컬럼이 NOT NULL)
    access_token: '',
    is_active: false,
    created_by: user.id,
    metadata: { approval: 'pending', requested_at: new Date().toISOString(), requested_by: user.id },
  }
  const { error } = mine
    ? await admin.from('ad_accounts').update(row).eq('id', mine.id)
    : await admin.from('ad_accounts').insert(row)
  if (error) {
    return NextResponse.json({ error: '연결 요청을 저장하지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
