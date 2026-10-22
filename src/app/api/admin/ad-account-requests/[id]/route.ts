// 네이버 광고계정 연결 요청 승인·거절 (슈퍼 관리자) - 승인하면 네이버 광고계정 이름을 받아 넣고 과거 1년 성과를 바로 동기화한다
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { listGrantedAdAccounts } from '@/lib/ads/naver'
import { syncNaverAdAccount } from '@/lib/ads/naver-sync'
import { HISTORY_DAYS } from '@/lib/ads/sync-window'

export const maxDuration = 300

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body?.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const admin = createServiceClient() as any
  const { data: account } = await admin
    .from('ad_accounts')
    .select('id, company_id, account_id, access_token, token_expires_at, metadata')
    .eq('id', id)
    .eq('platform', 'naver')
    .maybeSingle()
  if (!account) {
    return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 })
  }

  const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: adminUser.user.id }

  if (action === 'reject') {
    await admin
      .from('ad_accounts')
      .update({ is_active: false, metadata: { ...account.metadata, approval: 'rejected', ...reviewed } })
      .eq('id', id)
    return NextResponse.json({ success: true })
  }

  // 초대를 수락해 퍼널리 키로 실제로 보이는 계정만 승인할 수 있다
  const granted = (await listGrantedAdAccounts()).find((a) => a.customerId === account.account_id)
  if (!granted) {
    return NextResponse.json({ error: '퍼널리 네이버 계정에서 이 광고계정이 보이지 않습니다. 초대를 먼저 수락해주세요.' }, { status: 409 })
  }

  const metadata = { ...account.metadata, approval: 'approved', role: granted.roleName, ad_account_no: granted.adAccountNo, ...reviewed }
  const { error } = await admin
    .from('ad_accounts')
    .update({ is_active: true, account_name: granted.name || account.account_id, metadata })
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: '승인을 저장하지 못했습니다.' }, { status: 500 })
  }

  const result = await syncNaverAdAccount(admin, { ...account, metadata }, HISTORY_DAYS)
  return NextResponse.json({ success: true, sync: result })
}
