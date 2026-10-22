// 광고 성과 동기화 기간 계산 — 과거 1년치를 아직 안 받은 계정은 1년, 받은 계정은 평소 기간(크론 7일·수동 30일)
import { toKSTDateStr } from '@/lib/utils/date'

/** 연결할 때 받아오는 과거 성과 기간. Meta는 도달·빈도가 13개월을 넘으면 빠져서 1년으로 둔다 */
export const HISTORY_DAYS = 365

const DAY_MS = 24 * 60 * 60 * 1000

/** 오늘(KST)까지 days일 범위 */
export function syncRange(days: number) {
  return {
    since: toKSTDateStr(new Date(Date.now() - (days - 1) * DAY_MS)),
    until: toKSTDateStr(new Date()),
  }
}

/** metadata.history_since(받아 둔 가장 이른 날짜)가 1년 범위를 덮지 못하면 1년치를 받는다 */
export function syncDaysFor(account: { metadata: Record<string, any> | null }, defaultDays: number) {
  const historySince: string | undefined = account.metadata?.history_since
  return !historySince || historySince > syncRange(HISTORY_DAYS).since ? HISTORY_DAYS : defaultDays
}

/** 이번에 받은 범위 시작일과 기존 기록 중 더 이른 날짜 */
export function mergeHistorySince(previous: string | undefined, since: string) {
  return previous && previous < since ? previous : since
}

/** [since, until]을 maxDays일 이하 구간으로 겹치지 않게 나눈다 (양 끝 포함) */
export function splitRange(since: string, until: string, maxDays: number) {
  const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`)
  const toStr = (t: number) => new Date(t).toISOString().slice(0, 10)
  const chunks: { since: string; until: string }[] = []
  const end = toTime(until)
  for (let start = toTime(since); start <= end; start += maxDays * DAY_MS) {
    chunks.push({ since: toStr(start), until: toStr(Math.min(start + (maxDays - 1) * DAY_MS, end)) })
  }
  return chunks
}
