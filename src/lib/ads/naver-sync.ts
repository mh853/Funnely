// 승인된 네이버 검색광고 계정 1개의 캠페인·일자별 성과를 가져와 campaigns / campaign_metrics에 저장
import { NaverAdsApiError, getCampaignDailyStats, listCampaigns, type NaverDailyStat } from './naver'
import { upsertMetricRows, type AdAccountRow } from './meta-sync'
import { mergeHistorySince, splitRange, syncRange } from './sync-window'

type CampaignStatus = 'active' | 'paused' | 'ended'

function mapStatus(status?: string, userLock?: boolean): CampaignStatus {
  if (status === 'DELETED') return 'ended'
  // 사용자가 끈(userLock) 캠페인은 status가 ELIGIBLE로 남을 수 있다
  if (userLock || status === 'PAUSED') return 'paused'
  return 'active'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 광고주(CUSTOMER_ID)별 속도 제한 수치가 공개돼 있지 않아, 걸리면 잠시 쉬고 몇 번만 다시 시도한다 */
async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (!(error instanceof NaverAdsApiError) || !error.rateLimited || attempt >= 3) throw error
      await sleep(1000 * 2 ** attempt)
    }
  }
}

/**
 * 계정 1개 동기화. 일자별 성과는 캠페인 하나씩·92일씩만 받을 수 있어 캠페인 수 × 기간 조각만큼 호출한다.
 * 결과는 ad_accounts.metadata에 last_synced_at / last_sync_error / needs_reconnect / history_since로 남긴다.
 */
export async function syncNaverAdAccount(supabase: any, account: AdAccountRow, days: number) {
  const metadata = { ...(account.metadata || {}) }
  const saveMetadata = async (patch: Record<string, any>) => {
    await supabase.from('ad_accounts').update({ metadata: { ...metadata, ...patch } }).eq('id', account.id)
  }

  // 퍼널리 관리자가 광고계정 이름·회사를 대조해 승인하기 전에는 조회하지 않는다
  if (metadata.approval !== 'approved') {
    return { accountId: account.account_id, status: 'skipped_not_approved' as const }
  }

  const customerId = account.account_id
  const { since, until } = syncRange(days)

  try {
    const campaigns = await withRetry(() => listCampaigns(customerId))
    const campaignRows = new Map<string, { name: string; status: CampaignStatus; objective: string | null }>()
    for (const c of campaigns) {
      campaignRows.set(c.nccCampaignId, { name: c.name, status: mapStatus(c.status, c.userLock), objective: c.campaignTp || null })
    }

    const dailyRows: (NaverDailyStat & { campaignId: string })[] = []
    for (const campaignId of Array.from(campaignRows.keys())) {
      for (const chunk of splitRange(since, until, 92)) {
        const stats = await withRetry(() => getCampaignDailyStats(customerId, campaignId, chunk.since, chunk.until))
        for (const s of stats) dailyRows.push({ ...s, campaignId })
        await sleep(200)
      }
    }

    // Meta에서 행동은 있는데 노출이 0인 응답이 실제 성과를 덮어쓴 적이 있어, 클릭이 있는데 노출 0인 행은 저장하지 않는다
    const broken = dailyRows.find((d) => (Number(d.clkCnt) || 0) > 0 && !(Number(d.impCnt) > 0))
    if (broken) {
      throw new Error(`네이버가 노출 없이 클릭을 보냈습니다 (${JSON.stringify({ date: broken.dateStart, imp: broken.impCnt, clk: broken.clkCnt })})`)
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
      .filter((d) => campaignIdMap.has(d.campaignId) && ((Number(d.impCnt) || 0) > 0 || (Number(d.salesAmt) || 0) > 0))
      .map((d) => {
        const impressions = Number(d.impCnt) || 0
        const clicks = Number(d.clkCnt) || 0
        // salesAmt는 VAT 포함 광고비다 (화면 하단에 기준을 적어 둔다)
        const spend = Number(d.salesAmt) || 0
        const conversions = Number(d.ccnt) || 0
        return {
          campaign_id: campaignIdMap.get(d.campaignId),
          date: d.dateStart,
          impressions,
          clicks,
          spend,
          conversions,
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
          cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
          raw_data: { ccnt: d.ccnt ?? 0, convAmt: d.convAmt ?? 0, spend_vat_included: true },
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
    return { accountId: account.account_id, status: 'success' as const, campaigns: campaignRows.size, days: metricRows.length }
  } catch (error) {
    const apiError = error instanceof NaverAdsApiError ? error : null
    const needsReconnect = !!apiError?.noPermission
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    await saveMetadata({
      needs_reconnect: needsReconnect,
      last_sync_error: needsReconnect ? '퍼널리 조회 권한이 해제되었습니다. 네이버 광고계정에서 다시 초대해주세요.' : message,
    })
    return { accountId: account.account_id, status: needsReconnect ? ('needs_reconnect' as const) : ('error' as const), error: message }
  }
}
