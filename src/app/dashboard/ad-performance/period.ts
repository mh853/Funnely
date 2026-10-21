// 광고 성과 화면의 기간 파라미터(days·range·from/to)를 KST 기준 조회 범위(since~until)로 해석
import { toKSTDateStr } from '@/lib/utils/date'

export const PRESETS = [
  { key: '7', label: '최근 7일', href: '?days=7' },
  { key: '30', label: '최근 30일', href: '?days=30' },
  { key: '90', label: '최근 90일', href: '?days=90' },
  { key: 'this_month', label: '이번 달', href: '?range=this_month' },
  { key: 'last_month', label: '지난 달', href: '?range=last_month' },
] as const

export interface Period {
  key: string
  label: string
  since: string
  until: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`)
const toStr = (t: number) => new Date(t).toISOString().slice(0, 10)

function isDateStr(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && toStr(toTime(value)) === value
}

export function resolvePeriod(
  params: { days?: string; range?: string; from?: string; to?: string },
  today: string = toKSTDateStr(new Date())
): Period {
  if (isDateStr(params.from) && isDateStr(params.to)) {
    // 미래 날짜는 오늘로 자르고, 순서가 바뀌었으면 맞춰 준다
    const a = params.from > today ? today : params.from
    const b = params.to > today ? today : params.to
    const [since, until] = a <= b ? [a, b] : [b, a]
    return { key: 'custom', label: `${since} ~ ${until}`, since, until }
  }

  const monthStart = `${today.slice(0, 8)}01`
  if (params.range === 'this_month') {
    return { key: 'this_month', label: '이번 달', since: monthStart, until: today }
  }
  if (params.range === 'last_month') {
    const lastDay = toStr(toTime(monthStart) - DAY_MS)
    return { key: 'last_month', label: '지난 달', since: `${lastDay.slice(0, 8)}01`, until: lastDay }
  }

  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 30
  return { key: String(days), label: `최근 ${days}일`, since: toStr(toTime(today) - (days - 1) * DAY_MS), until: today }
}
