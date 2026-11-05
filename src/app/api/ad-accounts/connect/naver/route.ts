// 네이버 검색광고 계정 연결 요청 - 고객이 입력한 번호를 '승인 대기'로 저장하고, 퍼널리 네이버 ID가 초대를 수락해 계정이 보이면 자동 연결한다
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { findGrantedAccount, isNaverAdsEnabledForCompany, listGrantedAdAccounts } from '@/lib/ads/naver'
import { sendNaverReviewNeededEmail } from '@/lib/email/send-naver-review-notification'

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

  // 요청 전에 이미 퍼널리 키로 보이는 계정이면(초대 수락이 먼저 끝난 계정) 번호만 아는 다른 회사가 가로챌 수 있어
  // 자동 연결하지 않고 퍼널리 관리자가 광고계정 이름과 회사를 대조한 뒤 승인한다. 네이버 조회가 실패해도 같은 이유로 직접 확인으로 둔다.
  const alreadyVisible = await listGrantedAdAccounts()
    .then((granted) => !!findGrantedAccount(granted, customerId))
    .catch(() => true)

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
    metadata: {
      approval: 'pending',
      requested_at: new Date().toISOString(),
      requested_by: user.id,
      ...(alreadyVisible ? { manual_review: true } : {}),
    },
  }
  const { error } = mine
    ? await admin.from('ad_accounts').update(row).eq('id', mine.id)
    : await admin.from('ad_accounts').insert(row)
  if (error) {
    return NextResponse.json({ error: '연결 요청을 저장하지 못했습니다.' }, { status: 500 })
  }

  if (alreadyVisible) {
    const { data: company } = await admin.from('companies').select('name').eq('id', userProfile.company_id).maybeSingle()
    // 알림이 실패해도 요청은 저장됐고 관리자 화면에 남는다
    await sendNaverReviewNeededEmail({ companyName: company?.name || userProfile.company_id, customerId }).catch((e) =>
      console.error('[naver connect] review email error:', e)
    )
  }
  // 아직 안 보이는 계정은 퍼널리가 초대를 수락하면 다음 화면 열기·매일 크론에서 자동 연결된다
  return NextResponse.json({ success: true, review: alreadyVisible })
}
