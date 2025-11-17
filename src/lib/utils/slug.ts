/**
 * Slug generation and validation utilities
 */

// Korean to English romanization mapping (초성 based)
const KOREAN_TO_ROMAN: Record<string, string> = {
  // 자음 (초성)
  ㄱ: 'g',
  ㄴ: 'n',
  ㄷ: 'd',
  ㄹ: 'r',
  ㅁ: 'm',
  ㅂ: 'b',
  ㅅ: 's',
  ㅇ: '',
  ㅈ: 'j',
  ㅊ: 'ch',
  ㅋ: 'k',
  ㅌ: 't',
  ㅍ: 'p',
  ㅎ: 'h',
  // 쌍자음
  ㄲ: 'kk',
  ㄸ: 'tt',
  ㅃ: 'pp',
  ㅆ: 'ss',
  ㅉ: 'jj',
  // 모음
  ㅏ: 'a',
  ㅑ: 'ya',
  ㅓ: 'eo',
  ㅕ: 'yeo',
  ㅗ: 'o',
  ㅛ: 'yo',
  ㅜ: 'u',
  ㅠ: 'yu',
  ㅡ: 'eu',
  ㅣ: 'i',
  ㅐ: 'ae',
  ㅒ: 'yae',
  ㅔ: 'e',
  ㅖ: 'ye',
  ㅘ: 'wa',
  ㅙ: 'wae',
  ㅚ: 'oe',
  ㅝ: 'wo',
  ㅞ: 'we',
  ㅟ: 'wi',
  ㅢ: 'ui',
}

/**
 * Decompose Korean character into jamo (초성, 중성, 종성)
 */
function decomposeKorean(char: string): string {
  const code = char.charCodeAt(0)

  // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
  if (code < 0xac00 || code > 0xd7a3) {
    return char
  }

  const baseCode = code - 0xac00

  // 초성, 중성, 종성 분리
  const choIndex = Math.floor(baseCode / 588)
  const jungIndex = Math.floor((baseCode % 588) / 28)
  const jongIndex = baseCode % 28

  const CHO = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ]
  const JUNG = [
    'ㅏ',
    'ㅐ',
    'ㅑ',
    'ㅒ',
    'ㅓ',
    'ㅔ',
    'ㅕ',
    'ㅖ',
    'ㅗ',
    'ㅘ',
    'ㅙ',
    'ㅚ',
    'ㅛ',
    'ㅜ',
    'ㅝ',
    'ㅞ',
    'ㅟ',
    'ㅠ',
    'ㅡ',
    'ㅢ',
    'ㅣ',
  ]
  const JONG = [
    '',
    'ㄱ',
    'ㄲ',
    'ㄳ',
    'ㄴ',
    'ㄵ',
    'ㄶ',
    'ㄷ',
    'ㄹ',
    'ㄺ',
    'ㄻ',
    'ㄼ',
    'ㄽ',
    'ㄾ',
    'ㄿ',
    'ㅀ',
    'ㅁ',
    'ㅂ',
    'ㅄ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ]

  let result = ''
  result += KOREAN_TO_ROMAN[CHO[choIndex]] || CHO[choIndex]
  result += KOREAN_TO_ROMAN[JUNG[jungIndex]] || JUNG[jungIndex]
  if (jongIndex > 0) {
    result += KOREAN_TO_ROMAN[JONG[jongIndex]] || JONG[jongIndex]
  }

  return result
}

/**
 * Convert Korean text to romanized slug
 */
export function koreanToSlug(text: string): string {
  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      // 한글 범위
      if (code >= 0xac00 && code <= 0xd7a3) {
        return decomposeKorean(char)
      }
      // 영문, 숫자는 그대로
      if (/[a-zA-Z0-9]/.test(char)) {
        return char.toLowerCase()
      }
      // 공백이나 특수문자는 하이픈으로
      return '-'
    })
    .join('')
    .replace(/-+/g, '-') // 연속된 하이픈 제거
    .replace(/^-+|-+$/g, '') // 시작/끝 하이픈 제거
}

/**
 * Generate slug from text (supporting both Korean and English)
 */
export function generateSlug(text: string): string {
  if (!text) return ''

  // 한글이 포함되어 있으면 로마자 변환
  if (/[가-힣]/.test(text)) {
    return koreanToSlug(text)
  }

  // 영문만 있는 경우
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): boolean {
  if (!slug) return false
  return /^[a-z0-9-]+$/.test(slug)
}

/**
 * Get slug validation error message
 */
export function getSlugValidationError(slug: string): string | null {
  if (!slug) {
    return 'URL 슬러그를 입력해주세요'
  }

  if (slug.length < 3) {
    return 'URL 슬러그는 최소 3자 이상이어야 합니다'
  }

  if (slug.length > 100) {
    return 'URL 슬러그는 최대 100자까지 가능합니다'
  }

  if (!validateSlug(slug)) {
    return '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다'
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return '하이픈(-)으로 시작하거나 끝날 수 없습니다'
  }

  if (slug.includes('--')) {
    return '연속된 하이픈(--)은 사용할 수 없습니다'
  }

  return null
}
