// 퍼널리 DB(리드)의 utm_campaign을 광고 캠페인(플랫폼 캠페인 ID 또는 이름)에 붙여 캠페인별 DB 수를 센다

const normalize = (v: string | null | undefined) => (v ?? '').trim().toLowerCase()

export interface CampaignKey {
  id: string
  name: string | null
  platform_campaign_id: string | null
}

export interface LeadMatchResult {
  /** 캠페인 id → 그 캠페인으로 들어온 DB 수 */
  counts: Map<string, number>
  matched: number
  /** utm_campaign은 있는데 어느 캠페인과도 안 맞은 DB 수 */
  unmatched: number
  /** 안 맞은 utm_campaign 값 예시(많이 나온 순, 최대 3개) - 고객이 무엇을 고쳐야 할지 보여준다 */
  unmatchedSamples: string[]
}

/**
 * 캠페인 ID가 먼저, 그다음 이름으로 맞춘다. 이름이 같은 캠페인이 둘 이상이면(플랫폼이 달라도) 어느 쪽인지 알 수 없어
 * 이름으로는 묶지 않는다. 광고 쪽 utm_campaign에 Meta {{campaign.id}}, 구글 {campaignid} 같은 ID를 넣으면 가장 정확하다.
 */
export function matchLeadsToCampaigns(campaigns: CampaignKey[], leadCampaigns: (string | null)[]): LeadMatchResult {
  const byId = new Map<string, string>()
  const byName = new Map<string, string | null>() // null = 이름이 겹쳐 쓸 수 없음
  for (const c of campaigns) {
    const id = normalize(c.platform_campaign_id)
    if (id) byId.set(id, c.id)
    const name = normalize(c.name)
    if (name) byName.set(name, byName.has(name) && byName.get(name) !== c.id ? null : c.id)
  }

  const counts = new Map<string, number>()
  const misses = new Map<string, number>()
  let matched = 0
  for (const raw of leadCampaigns) {
    const key = normalize(raw)
    if (!key) continue
    const campaignId = byId.get(key) ?? byName.get(key) ?? null
    if (campaignId) {
      counts.set(campaignId, (counts.get(campaignId) ?? 0) + 1)
      matched++
    } else {
      const label = (raw ?? '').trim()
      misses.set(label, (misses.get(label) ?? 0) + 1)
    }
  }

  const unmatched = Array.from(misses.values()).reduce((a, b) => a + b, 0)
  const unmatchedSamples = Array.from(misses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label)
  return { counts, matched, unmatched, unmatchedSamples }
}
