// 연결된 Meta·구글 광고 계정의 캠페인별 성과(광고비·노출·클릭·전환)를 기간별로 조회하는 페이지
import { createClient, createServiceClient, getCachedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { isMetaEnabledForCompany } from '@/lib/ads/meta'
import { isGoogleAdsEnabledForCompany } from '@/lib/ads/google'
import { getNaverAdsInviteId, isNaverAdsEnabledForCompany } from '@/lib/ads/naver'
import { autoApprovePendingNaver } from '@/lib/ads/naver-approval'
import { isTokenExpired } from '@/lib/ads/meta-sync'
import { HISTORY_DAYS, syncDaysFor } from '@/lib/ads/sync-window'
import { toKSTDateStr } from '@/lib/utils/date'
import AdAccountActions from './AdAccountActions'
import { PRESETS, resolvePeriod } from './period'

const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta', google: '구글', naver: '네이버' }

interface CampaignSummary {
  id: string
  name: string
  status: string
  platform: string
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
  searchParams: Promise<{ days?: string; range?: string; from?: string; to?: string; error?: string; connected?: string; platform?: string }>
}) {
  const params = await searchParams
  const { error, connected, platform: connectedPlatform } = params
  const period = resolvePeriod(params)
  const { since, until } = period

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
  const enabledPlatforms = [
    ...(isMetaEnabledForCompany(userProfile.company_id) ? ['meta' as const] : []),
    ...(isGoogleAdsEnabledForCompany(userProfile.company_id) ? ['google' as const] : []),
    ...(isNaverAdsEnabledForCompany(userProfile.company_id) ? ['naver' as const] : []),
  ]
  const configured = enabledPlatforms.length > 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 퍼널리가 네이버 초대를 수락했으면 화면을 여는 시점에 연결해 둔다 (1년치는 '지금 동기화'나 다음 크론이 받는다)
  if (enabledPlatforms.includes('naver')) {
    await autoApprovePendingNaver(createServiceClient(), userProfile.company_id).catch(() => [])
  }

  const { data: accounts } = await db
    .from('ad_accounts')
    .select('id, platform, account_id, account_name, is_active, token_expires_at, metadata')
    .eq('company_id', userProfile.company_id)
    .in('platform', enabledPlatforms)
    .order('created_at', { ascending: true })

  const latestSyncedAt: string | null =
    (accounts || [])
      .map((a: any) => a.metadata?.last_synced_at as string | undefined)
      .filter(Boolean)
      .sort()
      .pop() ?? null

  // 받아 둔 과거 성과의 시작일 - 이보다 이른 기간을 고르면 안내한다
  const historySince: string | null =
    (accounts || [])
      .map((a: any) => a.metadata?.history_since as string | undefined)
      .filter(Boolean)
      .sort()[0] ?? null
  // 동기화 대상(활성·연결 유효) 계정 중 1년치를 아직 못 받은 계정 - 배포 전 연결했거나 1년치 동기화가 실패한 경우
  const historyPending = (accounts || []).some(
    (a: any) => a.is_active && !a.metadata?.needs_reconnect && !isTokenExpired(a) && syncDaysFor(a, 0) === HISTORY_DAYS
  )

  // 캠페인 수 × 일수가 한 번에 받을 수 있는 행 수(1000)를 넘을 수 있어 나눠서 받는다
  const metrics: any[] = []
  if (accounts && accounts.length > 0) {
    for (let from = 0; ; from += 1000) {
      const { data } = await db
        .from('campaign_metrics')
        .select('impressions, clicks, spend, conversions, campaigns!inner(id, name, status, ad_accounts!inner(company_id, platform, account_name))')
        .eq('campaigns.ad_accounts.company_id', userProfile.company_id)
        .in('campaigns.ad_accounts.platform', enabledPlatforms)
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
      platform: c.ad_accounts?.platform ?? '',
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
            <p className="text-xs text-gray-500 mt-0.5">연결한 광고 계정의 캠페인별 성과를 확인합니다</p>
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}
      {connected && (
        <div className="p-4 rounded-lg bg-green-50 text-sm text-green-800">
          {connectedPlatform === 'google' ? '구글' : 'Meta'} 광고 계정 {connected}개가 연결되었습니다. 최근 1년 성과를 불러왔습니다.
        </div>
      )}

      {!configured ? (
        <div className="p-6 rounded-xl bg-white border border-gray-200 text-sm text-gray-600">
          광고 성과 연동을 준비 중입니다. 준비가 끝나면 이 화면에서 광고 계정을 연결할 수 있습니다.
        </div>
      ) : (
        <AdAccountActions
          platforms={enabledPlatforms}
          canManage={canManage}
          // 플랫폼 순서(Meta → 구글)로 묶어 보여준다
          accounts={(accounts || [])
            .slice()
            .sort((a: any, b: any) => enabledPlatforms.indexOf(a.platform) - enabledPlatforms.indexOf(b.platform))
            .map((a: any) => ({
              id: a.id,
              platform: a.platform,
              name: a.account_name,
              // 네이버는 고객이 광고주센터에서 보는 광고계정 ID(계정 이름 옆 숫자)로 보여준다. account_id는 API용 CUSTOMER_ID라 고객에게 낯설다.
              accountId: a.platform === 'naver' ? String(a.metadata?.ad_account_no ?? a.account_id) : a.account_id,
              isActive: a.metadata?.account_status == null || a.metadata.account_status === 1,
              needsReconnect: !!a.metadata?.needs_reconnect || isTokenExpired(a),
              // 네이버는 퍼널리 관리자 승인 전까지 pending, 거절되면 rejected (Meta·구글은 값 없음)
              approval: a.metadata?.approval ?? null,
              lastSyncedAt: a.metadata?.last_synced_at ? formatKSTDateTime(a.metadata.last_synced_at) : null,
              lastSyncError: a.metadata?.last_sync_error ?? null,
            }))}
          latestSyncedAt={latestSyncedAt ? formatKSTDateTime(latestSyncedAt) : null}
          naverInviteId={getNaverAdsInviteId()}
        />
      )}

      {configured && accounts && accounts.length > 0 && (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Link
                  key={p.key}
                  href={`/dashboard/ad-performance${p.href}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    p.key === period.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
            {/* 서버 컴포넌트 그대로 GET으로 다시 그린다 */}
            <form action="/dashboard/ad-performance" className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                name="from"
                defaultValue={since}
                max={until}
                required
                aria-label="시작일"
                className={`px-2 py-1.5 rounded-lg border ${period.key === 'custom' ? 'border-indigo-600' : 'border-gray-300'}`}
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                name="to"
                defaultValue={until}
                max={toKSTDateStr(new Date())}
                required
                aria-label="종료일"
                className={`px-2 py-1.5 rounded-lg border ${period.key === 'custom' ? 'border-indigo-600' : 'border-gray-300'}`}
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                조회
              </button>
            </form>
          </div>

          {((historySince && since < historySince) || historyPending) && (
            <div className="p-3 rounded-lg bg-amber-50 text-sm text-amber-800 space-y-1">
              {historySince && since < historySince && (
                <p>{historySince} 이전 성과는 받아오지 않았습니다. 광고 계정을 연결할 때 최근 1년 성과를 받아옵니다.</p>
              )}
              {historyPending && (
                <p>
                  일부 계정은 과거 1년 성과를 아직 받지 않았습니다. 다음 날 오전 자동 동기화 때 받아옵니다
                  {canManage ? " ('지금 동기화'를 누르면 바로 받아옵니다)" : ''}.
                </p>
              )}
            </div>
          )}

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
                      선택한 기간({period.label})에 집계된 광고 성과가 없습니다
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {accounts.length > 1 && (
                          <p className="text-xs text-gray-500">
                            {PLATFORM_LABEL[c.platform] ?? c.platform} · {c.accountName}
                          </p>
                        )}
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
            광고 계정을 연결할 때 최근 1년 성과를 받아오고, 이후 매일 오전 8시에 최근 7일치를 다시 받아옵니다. 각 광고 관리자와 전환 집계 기준에 따라 수치가 조금 다를 수 있습니다.
            Meta 전환은 Meta가 보고한 신청(리드)·가입 완료 이벤트, 구글 전환은 구글 광고의 &apos;전환&apos; 열(소수점은 반올림) 기준입니다.
            {enabledPlatforms.includes('naver') && ' 네이버 광고비는 네이버 검색광고가 보고한 VAT 포함 금액입니다.'}
          </p>
        </>
      )}
    </div>
  )
}
