// 연결된 Meta 광고 계정의 캠페인별 성과(광고비·노출·클릭·전환)를 기간별로 조회하는 페이지
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isMetaConfigured } from '@/lib/ads/meta'
import { isTokenExpired } from '@/lib/ads/meta-sync'
import { toKSTDateStr } from '@/lib/utils/date'
import AdAccountActions from './AdAccountActions'

const PERIODS = [7, 30] as const

interface CampaignSummary {
  id: string
  name: string
  status: string
  accountName: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

function formatKSTDateTime(dateStr: string) {
  const kst = new Date(new Date(dateStr).getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')} ${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`
}

export default async function AdPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; error?: string; connected?: string }>
}) {
  const { days: daysParam, error, connected } = await searchParams
  const days = PERIODS.includes(Number(daysParam) as any) ? Number(daysParam) : 30

  const supabase = await createClient()
  const {
    data: { user },
  } = await getCachedUser()
  if (!user) redirect('/auth/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile?.company_id) redirect('/auth/login')

  const canManage = isAdminOrLegacyOwner(userProfile)
  const configured = isMetaConfigured()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: accounts } = await db
    .from('ad_accounts')
    .select('id, account_id, account_name, is_active, token_expires_at, metadata')
    .eq('company_id', userProfile.company_id)
    .eq('platform', 'meta')
    .order('created_at', { ascending: true })

  const until = toKSTDateStr(new Date())
  const since = toKSTDateStr(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000))

  // 캠페인 수 × 일수가 한 번에 받을 수 있는 행 수(1000)를 넘을 수 있어 나눠서 받는다
  const metrics: any[] = []
  if (accounts && accounts.length > 0) {
    for (let from = 0; ; from += 1000) {
      const { data } = await db
        .from('campaign_metrics')
        .select('impressions, clicks, spend, conversions, campaigns!inner(id, name, status, ad_accounts!inner(company_id, account_name))')
        .eq('campaigns.ad_accounts.company_id', userProfile.company_id)
        .gte('date', since)
        .lte('date', until)
        .range(from, from + 999)
      metrics.push(...(data || []))
      if (!data || data.length < 1000) break
    }
  }

  const byCampaign = new Map<string, CampaignSummary>()
  for (const m of metrics) {
    const c = m.campaigns
    const row = byCampaign.get(c.id) ?? {
      id: c.id,
      name: c.name,
      status: c.status,
      accountName: c.ad_accounts?.account_name ?? '',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    }
    row.spend += Number(m.spend) || 0
    row.impressions += Number(m.impressions) || 0
    row.clicks += Number(m.clicks) || 0
    row.conversions += Number(m.conversions) || 0
    byCampaign.set(c.id, row)
  }
  const campaigns = Array.from(byCampaign.values()).sort((a, b) => b.spend - a.spend)
  const total = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + c.spend,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  )

  const currency = accounts?.[0]?.metadata?.currency || 'KRW'
  const money = (v: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: currency === 'KRW' ? 0 : 2 }).format(v)
  const num = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v))
  const ratio = (a: number, b: number) => (b > 0 ? a / b : 0)

  const summaryCards = [
    { label: '광고비', value: money(total.spend) },
    { label: '노출', value: num(total.impressions) },
    { label: '클릭', value: num(total.clicks) },
    { label: '클릭률(CTR)', value: `${(ratio(total.clicks, total.impressions) * 100).toFixed(2)}%` },
    { label: '클릭당 비용(CPC)', value: money(ratio(total.spend, total.clicks)) },
    { label: '전환', value: num(total.conversions) },
    { label: '전환당 비용', value: total.conversions > 0 ? money(total.spend / total.conversions) : '-' },
  ]

  const statusLabel: Record<string, string> = { active: '게재 중', paused: '일시중지', ended: '종료', draft: '초안' }

  return (
    <div className="px-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">광고 성과</h1>
            <p className="text-xs text-gray-500 mt-0.5">연결한 Meta 광고 계정의 캠페인별 성과를 확인합니다</p>
          </div>
        </div>
        {configured && accounts && accounts.length > 0 && (
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/dashboard/ad-performance?days=${p}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  p === days ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                최근 {p}일
              </Link>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-4 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}
      {connected && (
        <div className="p-4 rounded-lg bg-green-50 text-sm text-green-800">
          Meta 광고 계정 {connected}개가 연결되었습니다. 최근 30일 성과를 불러왔습니다.
        </div>
      )}

      {!configured ? (
        <div className="p-6 rounded-xl bg-white border border-gray-200 text-sm text-gray-600">
          Meta 광고 성과 연동을 준비 중입니다. 준비가 끝나면 이 화면에서 광고 계정을 연결할 수 있습니다.
        </div>
      ) : (
        <AdAccountActions
          canManage={canManage}
          accounts={(accounts || []).map((a: any) => ({
            id: a.id,
            name: a.account_name,
            accountId: a.account_id,
            isActive: a.is_active,
            needsReconnect: !!a.metadata?.needs_reconnect || isTokenExpired(a),
            lastSyncedAt: a.metadata?.last_synced_at ? formatKSTDateTime(a.metadata.last_synced_at) : null,
            lastSyncError: a.metadata?.last_sync_error ?? null,
          }))}
        />
      )}

      {configured && accounts && accounts.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="mt-1 text-lg font-bold text-gray-900 truncate">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">캠페인</th>
                  <th className="px-4 py-3 text-left font-medium">상태</th>
                  <th className="px-4 py-3 text-right font-medium">광고비</th>
                  <th className="px-4 py-3 text-right font-medium">노출</th>
                  <th className="px-4 py-3 text-right font-medium">클릭</th>
                  <th className="px-4 py-3 text-right font-medium">CTR</th>
                  <th className="px-4 py-3 text-right font-medium">CPC</th>
                  <th className="px-4 py-3 text-right font-medium">전환</th>
                  <th className="px-4 py-3 text-right font-medium">전환당 비용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      최근 {days}일 동안 집계된 광고 성과가 없습니다
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {accounts.length > 1 && <p className="text-xs text-gray-500">{c.accountName}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{statusLabel[c.status] ?? c.status}</td>
                      <td className="px-4 py-3 text-right">{money(c.spend)}</td>
                      <td className="px-4 py-3 text-right">{num(c.impressions)}</td>
                      <td className="px-4 py-3 text-right">{num(c.clicks)}</td>
                      <td className="px-4 py-3 text-right">{(ratio(c.clicks, c.impressions) * 100).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right">{money(ratio(c.spend, c.clicks))}</td>
                      <td className="px-4 py-3 text-right">{num(c.conversions)}</td>
                      <td className="px-4 py-3 text-right">{c.conversions > 0 ? money(c.spend / c.conversions) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            성과는 매일 오전 8시에 최근 7일치를 다시 받아오며, Meta 광고 관리자와 전환 집계 기준에 따라 수치가 조금 다를 수 있습니다.
            전환은 Meta가 보고한 신청(리드)·가입 완료 이벤트 기준입니다.
          </p>
        </>
      )}
    </div>
  )
}
