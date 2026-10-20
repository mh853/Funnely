// 연결된 구글 광고 계정 1개의 캠페인·일자별 성과를 가져와 campaigns / campaign_metrics에 저장
import { decryptToken } from '@/lib/encryption/credentials'
import { toKSTDateStr } from '@/lib/utils/date'
import { GoogleAdsApiError, getCampaignDailyMetrics, listCampaigns, refreshAccessToken } from './google'
import type { AdAccountRow } from './meta-sync'

type CampaignStatus = 'active' | 'paused' | 'ended'

function mapStatus(status?: string, servingStatus?: string): CampaignStatus {
  // 종료일이 지난 캠페인은 status가 ENABLED로 남아도 serving_status가 ENDED가 된다
  if (status === 'REMOVED' || servingStatus === 'ENDED') return 'ended'
  // 시작 전(PENDING)·검토 중이어도 사용 설정된 캠페인은 Meta의 ACTIVE처럼 '게재 중'으로 본다
  if (status === 'ENABLED') return 'active'
  return 'paused'
}

/**
 * 계정 1개 동기화. 결과는 ad_accounts.metadata에 last_synced_at / last_sync_error / needs_reconnect로 남긴다.
 * refresh_token 폐기·철회는 needs_reconnect, Cloud 프로젝트 미승인처럼 퍼널리 쪽 문제는 재연결을 요구하지 않는다.
 */
export async function syncGoogleAdAccount(supabase: any, account: AdAccountRow & { refresh_token: string | null }, days: number) {
  const metadata = { ...(account.metadata || {}) }
  const saveMetadata = async (patch: Record<string, any>) => {
    await supabase.from('ad_accounts').update({ metadata: { ...metadata, ...patch } }).eq('id', account.id)
  }

  const refreshToken = decryptToken(account.refresh_token)
  if (!refreshToken) {
    await saveMetadata({ needs_reconnect: true, last_sync_error: '연결 정보가 없습니다. 다시 연결해주세요.' })
    return { accountId: account.account_id, status: 'needs_reconnect' as const }
  }

  const loginCustomerId: string | null = metadata.login_customer_id || null
  const until = toKSTDateStr(new Date())
  const since = toKSTDateStr(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000))

  try {
    const token = await refreshAccessToken(refreshToken)
    const [campaigns, dailyRows] = await Promise.all([
      listCampaigns(token, account.account_id, loginCustomerId),
      getCampaignDailyMetrics(token, account.account_id, loginCustomerId, since, until),
    ])

    // 성과 행에도 캠페인 속성이 있어 삭제(REMOVED)된 캠페인의 지난 성과도 저장된다
    const campaignRows = new Map<string, { name: string; status: CampaignStatus; objective: string | null }>()
    for (const { campaign: c } of campaigns) {
      campaignRows.set(c.id, { name: c.name, status: mapStatus(c.status, c.servingStatus), objective: c.advertisingChannelType || null })
    }
    for (const { campaign: c } of dailyRows) {
      if (!campaignRows.has(c.id)) {
        campaignRows.set(c.id, { name: c.name, status: mapStatus(c.status, c.servingStatus), objective: null })
      }
    }

    const campaignIdMap = new Map<string, string>()
    if (campaignRows.size > 0) {
      const { data: saved, error } = await supabase
        .from('campaigns')
        .upsert(
          Array.from(campaignRows.entries()).map(([platformId, row]) => ({
            ad_account_id: account.id,
            platform_campaign_id: platformId,
            name: row.name,
            status: row.status,
            objective: row.objective,
          })),
          { onConflict: 'ad_account_id,platform_campaign_id' }
        )
        .select('id, platform_campaign_id')
      if (error) throw new Error(`캠페인 저장 실패: ${error.message}`)
      for (const row of saved || []) campaignIdMap.set(row.platform_campaign_id, row.id)
    }

    const metricRows = dailyRows
      .filter((d) => campaignIdMap.has(d.campaign.id))
      .map(({ campaign, segments, metrics: m }) => {
        const impressions = Number(m.impressions) || 0
        const clicks = Number(m.clicks) || 0
        const spend = Number(((Number(m.costMicros) || 0) / 1_000_000).toFixed(2))
        // 데이터 기반 기여 모델은 전환을 소수로 나눠 주는데 컬럼이 정수라 반올림하고, 원래 값은 raw_data에 남긴다
        const conversions = Math.round(Number(m.conversions) || 0)
        return {
          campaign_id: campaignIdMap.get(campaign.id),
          date: segments.date,
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
          cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
          raw_data: {
            conversions: m.conversions ?? 0,
            all_conversions: m.allConversions ?? 0,
            conversions_value: m.conversionsValue ?? 0,
          },
          synced_at: new Date().toISOString(),
        }
      })

    if (metricRows.length > 0) {
      const { error } = await supabase.from('campaign_metrics').upsert(metricRows, { onConflict: 'campaign_id,date' })
      if (error) throw new Error(`성과 저장 실패: ${error.message}`)
    }

    await saveMetadata({ last_synced_at: new Date().toISOString(), last_sync_error: null, needs_reconnect: false })
    return { accountId: account.account_id, status: 'success' as const, campaigns: campaignRows.size, days: metricRows.length }
  } catch (error) {
    const apiError = error instanceof GoogleAdsApiError ? error : null
    const needsReconnect = !!apiError?.needsReconnect
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    await saveMetadata({
      needs_reconnect: needsReconnect,
      last_sync_error: needsReconnect
        ? '연결이 만료되었거나 권한이 철회되었습니다. 다시 연결해주세요.'
        : apiError?.projectNotApproved
          ? '구글 광고 연동 승인을 기다리는 중입니다. 잠시 후 다시 시도해주세요.'
          : message,
    })
    return { accountId: account.account_id, status: needsReconnect ? ('needs_reconnect' as const) : ('error' as const), error: message }
  }
}
