/**
 * 전화번호 암호화/복호화 유틸리티
 * AES-256 암호화 사용
 */

import CryptoJS from 'crypto-js';

// 환경변수에서 비밀키 가져오기
const getSecretKey = (): string => {
  const key = process.env.PHONE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PHONE_ENCRYPTION_KEY environment variable is not set');
  }
  return key;
};

/**
 * 전화번호 암호화
 * @param phone 원본 전화번호
 * @returns 암호화된 전화번호
 */
export function encryptPhone(phone: string): string {
  try {
    const secretKey = getSecretKey();
    const encrypted = CryptoJS.AES.encrypt(phone, secretKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Phone encryption error:', error);
    throw new Error('Failed to encrypt phone number');
  }
}

/**
 * 전화번호 복호화
 * @param encrypted 암호화된 전화번호
 * @returns 원본 전화번호
 */
export function decryptPhone(encrypted: string): string {
  try {
    const secretKey = getSecretKey();
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return decrypted;
  } catch (error) {
    console.error('Phone decryption error:', error);
    throw new Error('Failed to decrypt phone number');
  }
}

/**
 * 전화번호 해시 생성 (중복 체크용)
 * @param phone 원본 전화번호
 * @returns SHA-256 해시
 */
export function hashPhone(phone: string): string {
  try {
    const hash = CryptoJS.SHA256(phone).toString();
    return hash;
  } catch (error) {
    console.error('Phone hashing error:', error);
    throw new Error('Failed to hash phone number');
  }
}

/**
 * 전화번호 형식 검증
 * @param phone 전화번호
 * @returns 유효 여부
 */
export function validatePhone(phone: string): boolean {
  // 한국 전화번호 형식: 010-1234-5678, 01012345678, +82-10-1234-5678 등
  const phoneRegex = /^(\+82|0)?1[0-9]{1}[0-9]{3,4}[0-9]{4}$/;
  const cleanedPhone = phone.replace(/[-\s]/g, ''); // 하이픈과 공백 제거
  return phoneRegex.test(cleanedPhone);
}

/**
 * 전화번호 정규화 (하이픈 제거)
 * @param phone 전화번호
 * @returns 정규화된 전화번호
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[-\s]/g, '');
}

/**
 * 전화번호 마스킹 (부분 표시)
 * 예: 010-1234-5678 → 010-****-5678
 * @param phone 전화번호
 * @returns 마스킹된 전화번호
 */
export function maskPhone(phone: string): string {
  const cleaned = normalizePhone(phone);

  if (cleaned.length === 11) {
    // 010-1234-5678 형식
    return `${cleaned.slice(0, 3)}-****-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // 02-1234-5678 형식
    return `${cleaned.slice(0, 2)}-****-${cleaned.slice(6)}`;
  }

  // 기본 마스킹
  return phone.replace(/\d{4}/, '****');
}
