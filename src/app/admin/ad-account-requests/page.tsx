// 네이버 광고계정 연결 요청 목록 - 퍼널리 네이버 계정에서 초대가 보이는지·광고계정 이름을 회사와 대조해 승인·거절한다
import { createServiceClient } from '@/lib/supabase/server'
import { findGrantedAccount, isNaverAdsConfigured, listGrantedAdAccounts, type NaverAdAccount } from '@/lib/ads/naver'
import RequestActions from './RequestActions'

export const dynamic = 'force-dynamic'

const APPROVAL_LABEL: Record<string, string> = { pending: '승인 대기', approved: '승인됨', rejected: '거절됨' }
const ROLE_LABEL: Record<string, string> = { OWNER: '계정 책임자', MASTER: '운영 관리', READ_ONLY: '운영 조회' }

export default async function AdAccountRequestsPage() {
  const admin = createServiceClient() as any
  const { data: requests } = await admin
    .from('ad_accounts')
    .select('id, account_id, account_name, created_at, metadata, companies(name)')
    .eq('platform', 'naver')
    .order('created_at', { ascending: false })

  // 초대를 수락한 광고계정 전체 - 관리자 화면에서만 본다
  let granted: NaverAdAccount[] = []
  let grantedError: string | null = null
  if (isNaverAdsConfigured()) {
    try {
      granted = await listGrantedAdAccounts()
    } catch (error) {
      grantedError = error instanceof Error ? error.message : '네이버 계정 목록을 불러오지 못했습니다'
    }
  } else {
    grantedError = '네이버 검색광고 API 키가 설정되지 않았습니다'
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">네이버 광고계정 연결 요청</h1>
        <p className="text-sm text-gray-500 mt-1">
          네이버 광고주센터의 [초대 받은 광고 계정]에서 초대를 수락하면, 고객이 광고 성과 화면을 열거나 다음 자동 동기화 때 자동으로 연결됩니다. 바로 연결하고 1년치까지 받으려면 승인을 누르세요. 광고계정 이름이 요청한 회사와 다르면 거절하세요.
        </p>
      </div>
      {grantedError && <div className="p-3 rounded-lg bg-amber-50 text-sm text-amber-800">{grantedError}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">요청 회사</th>
              <th className="px-4 py-3 text-left font-medium">광고계정 ID</th>
              <th className="px-4 py-3 text-left font-medium">네이버 광고계정(퍼널리에서 보이는 이름·권한)</th>
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-left font-medium">요청일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(requests || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  연결 요청이 없습니다
                </td>
              </tr>
            ) : (
              (requests || []).map((r: any) => {
                const g = findGrantedAccount(granted, r.account_id)
                const approval = r.metadata?.approval || 'pending'
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-900">{r.companies?.name ?? '-'}</td>
                    <td className="px-4 py-3 font-mono">
                      {g?.adAccountNo ?? r.metadata?.ad_account_no ?? r.account_id}
                      {(g?.customerId ?? r.account_id) !== String(g?.adAccountNo ?? r.metadata?.ad_account_no ?? r.account_id) && (
                        <span className="block text-xs text-gray-400">API 고객 ID {g?.customerId ?? r.account_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {g ? (
                        <span>
                          {g.name} <span className="text-xs text-gray-500">({ROLE_LABEL[g.roleName] ?? g.roleName})</span>
                        </span>
                      ) : (
                        <span className="text-amber-700">아직 안 보임 — 초대 수락 필요</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{APPROVAL_LABEL[approval] ?? approval}</td>
                    <td className="px-4 py-3 text-gray-500">{String(r.created_at).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      {approval === 'pending' && <RequestActions id={r.id} canApprove={!!g} />}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
