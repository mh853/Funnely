/**
 * Date/Time formatting utilities
 * Standardized format: YYYY-MM-DD HH:mm (e.g., 2025-11-01 21:08)
 */

/**
 * UTC 타임스탬프를 KST(UTC+9) 기준 YYYY-MM-DD 문자열로 변환.
 * 서버 컴포넌트(Vercel = UTC)에서 날짜를 한국 기준으로 집계할 때 사용.
 */
export function toKSTDateStr(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

/**
 * 현재 시각을 KST(UTC+9) 벽시계 기준으로 읽을 수 있는 Date를 반환한다.
 * 반환된 Date의 getUTC*() 게터들이 그대로 KST 연/월/일/요일을 나타낸다.
 * 서버(Vercel = UTC)에서 "오늘"/"이번 주"/"이번 달"을 KST 기준으로 판단할 때 사용한다.
 */
export function getKSTNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
}

/**
 * KST 기준 "오늘 + offsetDays"의 자정을, 실제 UTC 인스턴트(Date)로 반환한다.
 * TIMESTAMPTZ 컬럼과 비교(gte/lt)할 때 이 값을 그대로 사용하면 된다.
 */
export function getKSTStartOfDay(offsetDays = 0): Date {
  const kst = getKSTNow()
  const y = kst.getUTCFullYear()
  const m = kst.getUTCMonth()
  const d = kst.getUTCDate() + offsetDays
  // KST 자정 = UTC 자정보다 9시간 빠르므로, UTC 기준으로 9시간을 빼줘야 실제 인스턴트가 나온다.
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 60 * 60 * 1000)
}

/**
 * KST 기준 특정 연/월의 1일(+dayOffset)의 자정을, 실제 UTC 인스턴트(Date)로 반환한다.
 * month는 1~12 (JS Date와 달리 0-index가 아님).
 */
export function getKSTMonthStart(year: number, month: number, dayOffset = 0): Date {
  return new Date(Date.UTC(year, month - 1, 1 + dayOffset, 0, 0, 0) - 9 * 60 * 60 * 1000)
}

/**
 * 주어진 Date가 KST 기준 "오늘"과 같은 날인지 판정한다.
 * 'use client' 컴포넌트도 Next.js에서는 최초 렌더가 서버(UTC)에서 한 번 실행되므로,
 * date.toDateString() === new Date().toDateString()처럼 실행 환경의 로컬 타임존에
 * 의존하는 비교를 쓰면 서버(UTC)와 클라이언트(브라우저=KST) 계산이 갈려, 자정 근처
 * (00~09시 KST)에 "오늘" 하이라이트가 하이드레이션 중 깜빡이거나 틀리게 나온다.
 */
export function isTodayKST(date: Date): boolean {
  return toKSTDateStr(date) === toKSTDateStr(new Date())
}

/**
 * "YYYY-MM-DD" 문자열이 나타내는 KST 캘린더 하루를 [시작, 다음날 시작) UTC 인스턴트
 * 범위로 변환한다. TIMESTAMPTZ 컬럼을 특정 KST 날짜로 필터링할 때 new Date(dateStr)를
 * 직접 쓰면 UTC 자정으로 해석되어 9시간 어긋나므로(day 필터가 KST 기준 하루가 아니라
 * KST 09:00~다음날 09:00을 가리키게 됨) 이 함수를 통해야 한다.
 */
export function getKSTDayRange(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    start: getKSTMonthStart(year, month, day - 1),
    end: getKSTMonthStart(year, month, day),
  }
}

/**
 * Format date to standard format: YYYY-MM-DD HH:mm
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string or '-' if invalid
 */
export function formatDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '-'

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return '-'
  }
}

/**
 * Format date only: YYYY-MM-DD
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted date string or '-' if invalid
 */
export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date) return '-'

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return '-'
  }
}

/**
 * Format time only: HH:mm
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted time string or '-' if invalid
 */
export function formatTime(date: string | Date | number | null | undefined): string {
  if (!date) return '-'

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'

    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
  } catch {
    return '-'
  }
}

/**
 * Format relative time (e.g., "2시간 전", "3일 전")
 * @param date - Date string, Date object, or timestamp
 * @returns Relative time string or '-' if invalid
 */
export function formatRelativeTime(date: string | Date | number | null | undefined): string {
  if (!date) return '-'

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'

    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    const diffMonth = Math.floor(diffDay / 30)
    const diffYear = Math.floor(diffDay / 365)

    if (diffSec < 60) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 30) return `${diffDay}일 전`
    if (diffMonth < 12) return `${diffMonth}개월 전`
    return `${diffYear}년 전`
  } catch {
    return '-'
  }
}

/**
 * Check if date is today
 * @param date - Date string, Date object, or timestamp
 * @returns true if date is today
 */
export function isToday(date: string | Date | number | null | undefined): boolean {
  if (!date) return false

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return false

    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  } catch {
    return false
  }
}

/**
 * 월/연 단위로 날짜를 더하되, 말일 오버플로우를 방지한다.
 * 예: 1월 31일 + 1개월 → Date.setMonth()를 그냥 쓰면 3월 3일로 밀리는데(2월엔 31일이 없어서),
 * 이 함수는 대상 월의 마지막 날(2월 28일/29일)로 고정한다. 정기결제 기간(current_period_end)
 * 계산처럼 매달 반복 호출되는 곳에서 오버플로우가 누적되면 결제 주기가 조금씩 앞당겨진다.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date)
  const originalDay = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const daysInTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate()
  result.setDate(Math.min(originalDay, daysInTargetMonth))
  return result
}

/**
 * Get date range for period filter
 * @param period - 'today' | 'week' | 'month' | 'all'
 * @returns Start date or null for 'all'
 */
export function getDateRangeStart(
  period: 'today' | 'week' | 'month' | 'all'
): Date | null {
  const now = new Date()

  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'all':
    default:
      return null
  }
}
