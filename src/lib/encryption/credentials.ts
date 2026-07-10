// 광고 플랫폼 API 자격증명(Meta/Kakao/Google 시크릿) 암호화/복호화 유틸리티
import CryptoJS from 'crypto-js'

const getSecretKey = (): string => {
  const key = process.env.API_CREDENTIALS_ENCRYPTION_KEY || process.env.PHONE_ENCRYPTION_KEY
  if (!key) {
    throw new Error('API_CREDENTIALS_ENCRYPTION_KEY or PHONE_ENCRYPTION_KEY environment variable is not set')
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
