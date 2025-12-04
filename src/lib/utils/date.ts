/**
 * Date/Time formatting utilities
 * Standardized format: YYYY-MM-DD HH:mm (e.g., 2025-11-01 21:08)
 */

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
