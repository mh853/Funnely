// 연결된 Meta 광고 계정 1개의 캠페인·일자별 성과를 가져와 campaigns / campaign_metrics에 저장
import { decryptToken } from '@/lib/encryption/credentials'
import { toKSTDateStr } from '@/lib/utils/date'
import { MetaApiError, getCampaignDailyInsights, listCampaigns, type MetaCampaignInsight } from './meta'

// 전환으로 셀 action_type - 퍼널리 랜딩 픽셀은 CompleteRegistration, Meta 리드 양식은 lead로 잡힌다.
// 실제 키는 첫 실데이터 동기화(raw_data.actions)로 확인해 조정한다.
const CONVERSION_ACTION_TYPES = [
  'lead',
  'complete_registration',
  'offsite_conversion.fb_pixel_lead',
  'offsite_conversion.fb_pixel_complete_registration',
]

export interface AdAccountRow {
  id: string
  company_id: string
  account_id: string
  access_token: string
  token_expires_at: string | null
  metadata: Record<string, any> | null
}

function mapStatus(effectiveStatus?: string): 'active' | 'paused' | 'ended' {
  if (effectiveStatus === 'ACTIVE') return 'active'
  if (effectiveStatus === 'ARCHIVED' || effectiveStatus === 'DELETED') return 'ended'
  return 'paused'
}

function countConversions(actions: MetaCampaignInsight['actions']) {
  // lead와 offsite_conversion.fb_pixel_lead처럼 같은 전환이 집계용·세부 키로 중복 보고되므로,
  // 종류(lead / complete_registration)별로 가장 큰 값 하나만 취해 더한다.
  const values = new Map<string, number>()
  for (const action of actions || []) {
    if (!CONVERSION_ACTION_TYPES.includes(action.action_type)) continue
    const kind = action.action_type.includes('complete_registration') ? 'complete_registration' : 'lead'
    values.set(kind, Math.max(values.get(kind) || 0, Number(action.value) || 0))
  }
  return Array.from(values.values()).reduce((sum, v) => sum + v, 0)
}

export function isTokenExpired(account: Pick<AdAccountRow, 'token_expires_at'>) {
  return !!account.token_expires_at && new Date(account.token_expires_at).getTime() <= Date.now()
}

/**
 * 계정 1개 동기화. 결과는 ad_accounts.metadata에 last_synced_at / last_sync_error / needs_reconnect로
 * 남겨 화면에서 상태를 보여준다. 토큰 문제(만료·철회)는 needs_reconnect로 표시하고 예외를 던지지 않는다.
 */
export async function syncMetaAdAccount(supabase: any, account: AdAccountRow, days: number) {
  const metadata = { ...(account.metadata || {}) }
  const saveMetadata = async (patch: Record<string, any>) => {
    await supabase.from('ad_accounts').update({ metadata: { ...metadata, ...patch } }).eq('id', account.id)
  }

  if (isTokenExpired(account)) {
    await saveMetadata({ needs_reconnect: true, last_sync_error: '연결이 만료되었습니다. 다시 연결해주세요.' })
    return { accountId: account.account_id, status: 'needs_reconnect' as const }
  }

  const token = decryptToken(account.access_token) || ''
  const until = toKSTDateStr(new Date())
  const since = toKSTDateStr(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000))

  try {
    const [campaigns, insights] = await Promise.all([
      listCampaigns(token, account.account_id),
      getCampaignDailyInsights(token, account.account_id, since, until),
    ])

    // 인사이트엔 있지만 캠페인 목록엔 없는(삭제된) 캠페인도 성과는 보여야 하므로 함께 저장한다
    const campaignRows = new Map<string, { name: string; status: 'active' | 'paused' | 'ended'; objective: string | null }>()
    for (const c of campaigns) {
      campaignRows.set(c.id, { name: c.name, status: mapStatus(c.effective_status), objective: c.objective || null })
    }
    for (const i of insights) {
      if (!campaignRows.has(i.campaign_id)) {
        campaignRows.set(i.campaign_id, { name: i.campaign_name, status: 'ended', objective: null })
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

    const metricRows = insights
      .filter((i) => campaignIdMap.has(i.campaign_id))
      .map((i) => {
        const impressions = Number(i.impressions) || 0
        const clicks = Number(i.clicks) || 0
        const spend = Number(i.spend) || 0
        const conversions = countConversions(i.actions)
        return {
          campaign_id: campaignIdMap.get(i.campaign_id),
          date: i.date_start,
          impressions,
          clicks,
          spend,
          reach: Number(i.reach) || 0,
          frequency: Number(i.frequency) || 0,
          conversions,
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
          cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
          raw_data: { actions: i.actions || [] },
          synced_at: new Date().toISOString(),
        }
      })

    if (metricRows.length > 0) {
      const { error } = await supabase
        .from('campaign_metrics')
        .upsert(metricRows, { onConflict: 'campaign_id,date' })
      if (error) throw new Error(`성과 저장 실패: ${error.message}`)
    }

    await saveMetadata({ last_synced_at: new Date().toISOString(), last_sync_error: null, needs_reconnect: false })
    return { accountId: account.account_id, status: 'success' as const, campaigns: campaignRows.size, days: metricRows.length }
  } catch (error) {
    const needsReconnect = error instanceof MetaApiError && error.needsReconnect
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    await saveMetadata({
      needs_reconnect: needsReconnect,
      last_sync_error: needsReconnect ? '연결이 만료되었거나 권한이 철회되었습니다. 다시 연결해주세요.' : message,
    })
    return { accountId: account.account_id, status: needsReconnect ? ('needs_reconnect' as const) : ('error' as const), error: message }
  }
}
