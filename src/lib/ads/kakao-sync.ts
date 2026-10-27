// 연결된 카카오모먼트 광고계정 1개의 캠페인·일자별 성과를 가져와 campaigns / campaign_metrics에 저장
import { decryptToken } from '@/lib/encryption/credentials'
import { KakaoMomentApiError, getCampaignDailyReport, listCampaigns, type KakaoCampaignDay } from './kakao'
import { upsertMetricRows, type AdAccountRow } from './meta-sync'
import { mergeHistorySince, splitRange, syncRange } from './sync-window'

type CampaignStatus = 'active' | 'paused' | 'ended'

function mapStatus(config?: string, systemConfig?: string): CampaignStatus {
  if (config === 'DEL') return 'ended'
  // 관리자·외부 서비스 정지(systemConfig)도 게재가 멈춘 상태라 일시정지로 본다
  if (config === 'OFF' || (systemConfig && systemConfig !== 'ON')) return 'paused'
  return 'active'
}

const DAY_MS = 24 * 60 * 60 * 1000
// 보고서는 광고계정마다 5초에 1번 - 조금 여유를 둔다
const REPORT_INTERVAL_MS = 5200

let sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/** 테스트에서 5초 대기를 건너뛰려고 바꿔 끼운다 */
export function setKakaoSleepForTest(fn: (ms: number) => Promise<unknown>) {
  sleep = fn
}

/** 오늘 데이터는 보고서에 없고 어제까지만 받을 수 있어, 평소 기간에서 하루씩 당긴다 (KST) */
function reportRange(days: number) {
  const { since, until } = syncRange(days)
  const shift = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
  return { since: shift(since), until: shift(until) }
}

const num = (v: unknown) => Number(v) || 0

/**
 * 계정 1개 동기화. 보고서는 31일씩·5초 간격으로 받아 1년치면 12번 호출(1분 남짓)이다.
 * 결과는 ad_accounts.metadata에 last_synced_at / last_sync_error / needs_reconnect / history_since로 남긴다.
 */
export async function syncKakaoAdAccount(supabase: any, account: AdAccountRow, days: number) {
  const metadata = { ...(account.metadata || {}) }
  const saveMetadata = async (patch: Record<string, any>) => {
    await supabase.from('ad_accounts').update({ metadata: { ...metadata, ...patch } }).eq('id', account.id)
  }

  const accessToken = decryptToken(account.access_token)
  if (!accessToken) {
    await saveMetadata({ needs_reconnect: true, last_sync_error: '연결 정보가 없습니다. 다시 연결해주세요.' })
    return { accountId: account.account_id, status: 'needs_reconnect' as const }
  }

  const adAccountId = account.account_id
  const { since, until } = reportRange(days)

  try {
    const campaigns = await listCampaigns(accessToken, adAccountId)
    const campaignRows = new Map<string, { name: string; status: CampaignStatus }>()
    for (const c of campaigns) campaignRows.set(c.id, { name: c.name, status: mapStatus(c.config, c.systemConfig) })

    const dailyRows: KakaoCampaignDay[] = []
    const chunks = splitRange(since, until, 31)
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await sleep(REPORT_INTERVAL_MS)
      // 같은 계정을 다른 곳(크론·수동 동기화)이 막 불렀으면 한도에 걸릴 수 있어 두 번까지 쉬었다 다시 부른다
      for (let attempt = 0; ; attempt++) {
        try {
          dailyRows.push(...(await getCampaignDailyReport(accessToken, adAccountId, chunks[i].since, chunks[i].until)))
          break
        } catch (error) {
          if (!(error instanceof KakaoMomentApiError) || !error.rateLimited || attempt >= 2) throw error
          await sleep(REPORT_INTERVAL_MS)
        }
      }
    }

    // 보고서에만 있고 목록에 없는 캠페인(목록 조회 범위 밖)도 지난 성과는 남긴다
    for (const d of dailyRows) {
      if (!campaignRows.has(d.campaignId)) campaignRows.set(d.campaignId, { name: `캠페인 ${d.campaignId}`, status: 'ended' })
    }

    // 클릭이 있는데 노출이 0이면 응답이 깨진 것이라 저장하지 않는다 (Meta 10-21 '0 응답' 사고와 같은 가드)
    const broken = dailyRows.find((d) => num(d.metrics.click) > 0 && num(d.metrics.imp) === 0)
    if (broken) {
      throw new Error(`카카오가 노출 없이 클릭을 보냈습니다 (${JSON.stringify({ date: broken.date, ...broken.metrics })})`)
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
            objective: null,
          })),
          { onConflict: 'ad_account_id,platform_campaign_id' }
        )
        .select('id, platform_campaign_id')
      if (error) throw new Error(`캠페인 저장 실패: ${error.message}`)
      for (const row of saved || []) campaignIdMap.set(row.platform_campaign_id, row.id)
    }

    const metricRows = dailyRows
      .filter((d) => campaignIdMap.has(d.campaignId) && (num(d.metrics.imp) > 0 || num(d.metrics.cost) > 0))
      .map((d) => {
        const m = d.metrics
        const impressions = num(m.imp)
        const clicks = num(m.click)
        const spend = num(m.cost)
        // 상담 DB 수집용 전환: 잠재고객(참여) + 서비스 신청, 7일 기여 (실계정 확인 후 조정 가능)
        const conversions = Math.round(num(m.conv_participation_7d) + num(m.conv_signup_7d))
        const conv = Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith('conv_')))
        return {
          campaign_id: campaignIdMap.get(d.campaignId),
          date: d.date,
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
          cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
          raw_data: conv,
          synced_at: new Date().toISOString(),
        }
      })

    await upsertMetricRows(supabase, metricRows)

    await saveMetadata({
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      needs_reconnect: false,
      history_since: mergeHistorySince(metadata.history_since, since),
    })
    return { accountId: adAccountId, status: 'success' as const, campaigns: campaignRows.size, days: metricRows.length }
  } catch (error) {
    const apiError = error instanceof KakaoMomentApiError ? error : null
    const needsReconnect = !!apiError?.needsReconnect || !!apiError?.noPermission
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    await saveMetadata({
      needs_reconnect: needsReconnect,
      last_sync_error: needsReconnect ? '연결이 만료되었거나 광고계정 권한이 철회되었습니다. 다시 연결해주세요.' : message,
    })
    return { accountId: adAccountId, status: needsReconnect ? ('needs_reconnect' as const) : ('error' as const), error: message }
  }
}
