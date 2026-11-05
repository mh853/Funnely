// 네이버 광고계정 연결 요청 승인 - 퍼널리 네이버 ID가 초대를 수락해 퍼널리 키로 계정이 보이면 자동으로 연결한다(반자동)
import { findGrantedAccount, isNaverAdsEnabledForCompany, listGrantedAdAccounts, type NaverAdAccount } from './naver'
import { sendNaverReviewNeededEmail } from '@/lib/email/send-naver-review-notification'

/**
 * 요청 1건을 승인 상태로 바꾼다(동기화는 하지 않는다). 고객이 광고계정 번호를 넣었어도 API 호출(X-Customer)에 쓰는
 * CUSTOMER_ID로 바꿔 저장하고, 같은 광고계정이 이미 다른 연결로 승인돼 있으면 막는다.
 */
export async function approveNaverAccount(admin: any, account: any, granted: NaverAdAccount, reviewedBy: string) {
  const { data: duplicate } = await admin
    .from('ad_accounts')
    .select('id')
    .eq('platform', 'naver')
    .eq('account_id', granted.customerId)
    .eq('is_active', true)
    .neq('id', account.id)
  if (duplicate?.length) {
    return { error: '이 광고계정은 이미 다른 연결로 승인돼 있습니다.', status: 409 }
  }

  const metadata = {
    ...account.metadata,
    approval: 'approved',
    role: granted.roleName,
    ad_account_no: granted.adAccountNo,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy,
  }
  const { error } = await admin
    .from('ad_accounts')
    .update({ account_id: granted.customerId, is_active: true, account_name: granted.name || granted.customerId, metadata })
    .eq('id', account.id)
  if (error) {
    return { error: '승인을 저장하지 못했습니다.', status: 500 }
  }
  return { account: { ...account, account_id: granted.customerId, metadata } }
}

/**
 * 승인 대기 요청 중 퍼널리 키로 보이는(초대를 수락한) 계정을 자동 승인하고(직접 확인으로 둔 요청은 빼고) 승인한 행 id를 돌려준다.
 * 1년치는 바로 받지 않고, 다음 동기화(지금 동기화·매일 크론)가 history_since가 없는 계정으로 보고 받아온다.
 */
export async function autoApprovePendingNaver(admin: any, companyId?: string): Promise<string[]> {
  let query = admin.from('ad_accounts').select('id, company_id, account_id, metadata, companies(name)').eq('platform', 'naver').eq('metadata->>approval', 'pending')
  if (companyId) query = query.eq('company_id', companyId)
  const { data: pending } = await query
  // manual_review: 요청 전에 이미 보이던 계정 — 가로채기를 막으려고 퍼널리 관리자가 직접 승인한다
  const candidates = (pending || []).filter(
    (a: any) => isNaverAdsEnabledForCompany(a.company_id) && a.metadata?.manual_review !== true
  )
  if (candidates.length === 0) return []

  const granted = await listGrantedAdAccounts()
  const approved: string[] = []
  for (const account of candidates) {
    const g = findGrantedAccount(granted, account.account_id)
    if (!g) continue
    const result = await approveNaverAccount(admin, account, g, 'auto')
    if (result.error) continue
    approved.push(account.id)
    // 초대 수락보다 다른 회사의 번호 입력이 먼저였으면 그 회사로 연결될 수 있어, 자동 연결마다 운영자가 이름을 대조하게 알린다
    await sendNaverReviewNeededEmail({
      kind: 'auto_approved',
      companyName: account.companies?.name || account.company_id,
      customerId: account.account_id,
      accountName: g.name,
    }).catch((e) => console.error('[naver auto-approve] notify error:', e))
  }
  return approved
}
