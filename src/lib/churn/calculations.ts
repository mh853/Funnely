import type { ChurnRecord, ChurnReasonBreakdown } from '@/types/churn'

/**
 * 이탈률 계산
 * Churn Rate = (이탈 회사 수 / 기간 시작 시점 총 회사 수) * 100
 */
export function calculateChurnRate(
  churnedCount: number,
  totalAtStart: number
): number {
  if (totalAtStart === 0) return 0
  return Number(((churnedCount / totalAtStart) * 100).toFixed(2))
}

/**
 * 평균 사용 기간 계산
 */
export function calculateAverageTenure(records: ChurnRecord[]): number {
  if (records.length === 0) return 0
  const sum = records.reduce((acc, r) => acc + (r.metadata?.tenure_days || 0), 0)
  return Math.round(sum / records.length)
}

/**
 * 중앙값 사용 기간 계산
 */
export function calculateMedianTenure(records: ChurnRecord[]): number {
  if (records.length === 0) return 0

  const sorted = [...records].sort(
    (a, b) => (a.metadata?.tenure_days || 0) - (b.metadata?.tenure_days || 0)
  )
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    const tenure1 = sorted[mid - 1].metadata?.tenure_days || 0
    const tenure2 = sorted[mid].metadata?.tenure_days || 0
    return Math.round((tenure1 + tenure2) / 2)
  } else {
    return sorted[mid].metadata?.tenure_days || 0
  }
}

/**
 * 이탈 사유 카테고리별 분석
 */
export function analyzeChurnReasons(
  records: ChurnRecord[]
): ChurnReasonBreakdown[] {
  const categoryMap = new Map<string, { count: number; lost_mrr: number }>()

  records.forEach((record) => {
    // churn_type을 category로 사용
    const category = record.churn_type || 'unknown'
    const existing = categoryMap.get(category) || { count: 0, lost_mrr: 0 }

    categoryMap.set(category, {
      count: existing.count + 1,
      lost_mrr: existing.lost_mrr + (record.metadata?.last_mrr || 0),
    })
  })

  const total = records.length
  const breakdown: ChurnReasonBreakdown[] = []

  for (const [category, value] of Array.from(categoryMap.entries())) {
    breakdown.push({
      category,
      count: value.count,
      percentage: total > 0 ? Number(((value.count / total) * 100).toFixed(2)) : 0,
      lost_mrr: value.lost_mrr,
    })
  }

  // 비율 높은 순으로 정렬
  return breakdown.sort((a, b) => b.percentage - a.percentage)
}

/**
 * 예방 가능 이탈 분석
 */
export function analyzePreventableChurn(records: ChurnRecord[]) {
  const preventable = records.filter((r) => r.metadata?.was_preventable === true)
  const preventableCount = preventable.length
  const preventablePercentage =
    records.length > 0
      ? Number(((preventableCount / records.length) * 100).toFixed(2))
      : 0

  const potentialSavedMrr = preventable.reduce(
    (sum, r) => sum + (r.metadata?.last_mrr || 0),
    0
  )

  return {
    preventable_count: preventableCount,
    preventable_percentage: preventablePercentage,
    potential_saved_mrr: potentialSavedMrr,
  }
}

/**
 * 총 손실 MRR/ARR 계산
 */
export function calculateLostRevenue(records: ChurnRecord[]) {
  const lostMrr = records.reduce((sum, r) => sum + (r.metadata?.last_mrr || 0), 0)
  const lostArr = lostMrr * 12

  return { lost_mrr: lostMrr, lost_arr: lostArr }
}
