// 네이버 광고계정 연결 요청 목록 - 퍼널리 네이버 계정에서 초대가 보이는지·광고계정 이름을 회사와 대조해 승인·거절한다
import { createServiceClient } from '@/lib/supabase/server'
import { fetchAdAccountsRaw, isNaverAdsConfigured, listGrantedAdAccounts, type NaverAdAccount } from '@/lib/ads/naver'
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
  const grantedById = new Map(granted.map((a) => [a.customerId, a]))

  // 진단용(임시): 초대를 수락했는데 '안 보임'으로 나와 네이버 원본 응답을 그대로 본다 - 응답 모양 확인 후 지운다
  let raw: unknown = null
  if (isNaverAdsConfigured()) {
    raw = await fetchAdAccountsRaw().catch((error) => ({ error: error instanceof Error ? error.message : String(error) }))
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">네이버 광고계정 연결 요청</h1>
        <p className="text-sm text-gray-500 mt-1">
          네이버 광고주센터의 [초대 받은 광고 계정]에서 초대를 수락한 뒤, 광고계정 이름이 요청한 회사와 맞는지 확인하고 승인하세요.
        </p>
      </div>
      {grantedError && <div className="p-3 rounded-lg bg-amber-50 text-sm text-amber-800">{grantedError}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">요청 회사</th>
              <th className="px-4 py-3 text-left font-medium">고객 ID</th>
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
                const g = grantedById.get(r.account_id)
                const approval = r.metadata?.approval || 'pending'
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-900">{r.companies?.name ?? '-'}</td>
                    <td className="px-4 py-3 font-mono">{r.account_id}</td>
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

      <details className="bg-white rounded-xl border border-gray-200 p-4 text-xs">
        <summary className="cursor-pointer text-gray-600">
          네이버 응답 원본(진단용) · 파싱된 계정 {granted.length}개: {granted.map((a) => `${a.name}(${a.customerId || '?'}/${a.adAccountNo ?? '?'} ${a.roleName})`).join(', ') || '없음'}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-all text-gray-700">{JSON.stringify(raw, null, 2).slice(0, 8000)}</pre>
      </details>
    </div>
  )
}
