/**
 * 타임존 변환 유틸리티
 *
 * 한국 표준시(KST) = UTC+9
 * Supabase는 모든 timestamp를 UTC로 저장
 */

const KST_OFFSET = 9 * 60 * 60 * 1000 // 9시간 (밀리초)

/**
 * UTC timestamp를 KST datetime-local 형식으로 변환
 *
 * @param utcTimestamp - Supabase에서 가져온 UTC timestamp
 * @returns datetime-local 입력에 사용할 형식 (YYYY-MM-DDTHH:mm)
 *
 * 예: "2025-01-22T14:00:00Z" → "2025-01-22T23:00"
 */
export function utcToKstDatetimeLocal(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return ''

  const utcDate = new Date(utcTimestamp)
  const kstDate = new Date(utcDate.getTime() + KST_OFFSET)

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * KST datetime-local 형식을 UTC ISO 8601 문자열로 변환
 *
 * @param kstDatetimeLocal - datetime-local 입력값 (YYYY-MM-DDTHH:mm)
 * @returns Supabase 저장용 UTC ISO 8601 문자열
 *
 * 예: "2025-01-22T23:00" → "2025-01-22T14:00:00.000Z"
 */
export function kstDatetimeLocalToUtc(kstDatetimeLocal: string | null | undefined): string | null {
  if (!kstDatetimeLocal) return null

  // datetime-local 값을 파싱
  const parts = kstDatetimeLocal.split('T')
  const dateParts = parts[0].split('-')
  const timeParts = parts[1].split(':')

  const year = parseInt(dateParts[0])
  const month = parseInt(dateParts[1]) - 1 // 0-based month
  const day = parseInt(dateParts[2])
  const hours = parseInt(timeParts[0])
  const minutes = parseInt(timeParts[1])

  // KST 시간을 UTC 기준으로 Date 객체 생성 후 9시간 빼기
  const kstAsUtc = new Date(Date.UTC(year, month, day, hours, minutes, 0))
  const utcDate = new Date(kstAsUtc.getTime() - KST_OFFSET)

  // ISO 8601 UTC 문자열 반환
  return utcDate.toISOString()
}

/**
 * 현재 KST 시간을 datetime-local 형식으로 반환
 *
 * @returns 현재 KST 시간 (YYYY-MM-DDTHH:mm)
 */
export function getCurrentKstDatetimeLocal(): string {
  const now = new Date()
  const kstNow = new Date(now.getTime() + KST_OFFSET)

  const year = kstNow.getUTCFullYear()
  const month = String(kstNow.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstNow.getUTCDate()).padStart(2, '0')
  const hours = String(kstNow.getUTCHours()).padStart(2, '0')
  const minutes = String(kstNow.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * KST 날짜 문자열 포맷팅
 *
 * @param utcTimestamp - UTC timestamp
 * @param format - 'full' | 'date' | 'time'
 * @returns 포맷된 KST 문자열
 */
export function formatKst(
  utcTimestamp: string | null | undefined,
  format: 'full' | 'date' | 'time' = 'full'
): string {
  if (!utcTimestamp) return '-'

  const utcDate = new Date(utcTimestamp)
  const kstDate = new Date(utcDate.getTime() + KST_OFFSET)

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hours}:${minutes}`
    case 'full':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`
  }
}
