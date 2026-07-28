// 광고 플랫폼 API 자격증명(Meta/Kakao/Google 시크릿, OAuth 액세스/리프레시 토큰)
// 암호화/복호화 유틸리티
import CryptoJS from 'crypto-js'

// 예전엔 이 키가 없으면 PHONE_ENCRYPTION_KEY로 조용히 폴백했다 - 고객 전화번호와
// 광고 플랫폼 시크릿(서로 다른 신뢰 영역)이 같은 키를 공유하게 돼, 한쪽 키
// 유출/회전 시 다른 쪽도 함께 영향받고 두 도메인을 독립적으로 회전할 수 없는
// 문제가 있었다. 전용 키를 필수로 강제한다.
const getSecretKey = (): string => {
  const key = process.env.API_CREDENTIALS_ENCRYPTION_KEY
  if (!key) {
    throw new Error('API_CREDENTIALS_ENCRYPTION_KEY environment variable is not set')
  }
  return key
}

/**
 * 자격증명 객체(JSON)를 AES로 암호화해 하나의 문자열로 반환한다.
 * api_credentials.credentials(JSONB) 컬럼에는 이 문자열을 그대로 저장한다.
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  const key = getSecretKey()
  return CryptoJS.AES.encrypt(JSON.stringify(credentials), key).toString()
}

/**
 * api_credentials.credentials 컬럼 값을 복호화해 원래의 자격증명 객체로 반환한다.
 * 마이그레이션 이전에 평문 JSONB 객체로 저장된 기존 행과 호환되도록, 값이 이미
 * 객체이면(암호화되지 않은 레거시 데이터) 그대로 반환한다.
 */
export function decryptCredentials(stored: unknown): Record<string, any> {
  if (stored && typeof stored === 'object') {
    return stored as Record<string, any>
  }
  if (typeof stored !== 'string' || !stored) {
    return {}
  }
  try {
    const key = getSecretKey()
    const bytes = CryptoJS.AES.decrypt(stored, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted ? JSON.parse(decrypted) : {}
  } catch (error) {
    console.error('Credentials decryption error:', error)
    return {}
  }
}

/**
 * OAuth 액세스/리프레시 토큰(ad_accounts.access_token/refresh_token) 같은
 * 단일 문자열 시크릿을 암호화한다. 자격증명(JSON 객체)과 같은 신뢰 영역이라
 * 동일한 전용 키를 재사용한다.
 */
export function encryptToken(token: string): string {
  const key = getSecretKey()
  return CryptoJS.AES.encrypt(token, key).toString()
}

/**
 * 암호화된 토큰 문자열을 복호화한다. 이 암호화가 적용되기 전에 평문으로 저장된
 * 기존 행과 호환되도록, 복호화 결과가 비어있으면(=암호화되지 않은 평문이었음)
 * 원본 값을 그대로 반환한다.
 */
export function decryptToken(stored: string | null): string | null {
  if (!stored) return stored
  try {
    const key = getSecretKey()
    const bytes = CryptoJS.AES.decrypt(stored, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted || stored
  } catch (error) {
    console.error('Token decryption error:', error)
    return stored
  }
}
