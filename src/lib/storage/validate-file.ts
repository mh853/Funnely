// 클라이언트가 선언한 Content-Type이 아니라 파일의 실제 바이트(매직넘버)로 형식을 검증
// 48차 QA에서 HTML/스크립트를 image/jpeg로 위장 업로드해 그대로 공개 서빙되는 것을
// 라이브로 확인한 문제의 근본 대응 - 서버 업로드 프록시에서 이 검사를 통과한 파일만
// Storage에 실제로 올린다.

type Signature = (buf: Buffer) => boolean

const SIGNATURES: Record<string, Signature> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) =>
    b.length >= 6 &&
    (b.subarray(0, 6).toString('ascii') === 'GIF87a' || b.subarray(0, 6).toString('ascii') === 'GIF89a'),
  'image/webp': (b) =>
    b.length >= 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (b) => b.length >= 4 && b.subarray(0, 4).toString('ascii') === '%PDF',
}

// 매직넘버로 형식을 판별할 수 없는 텍스트 계열 형식 - 대신 HTML/스크립트로 보이는
// 내용이면 거부한다(실행 가능한 콘텐츠를 다른 확장자로 위장해 올리는 것을 막는 최소 방어)
const HTML_LIKE = /<!doctype\s+html|<html[\s>]|<script[\s>]/i

export function detectRealMimeType(buffer: Buffer): string | null {
  for (const [mime, check] of Object.entries(SIGNATURES)) {
    if (check(buffer)) return mime
  }
  return null
}

export function looksLikeHtml(buffer: Buffer): boolean {
  return HTML_LIKE.test(buffer.subarray(0, 2048).toString('utf-8'))
}

/**
 * declaredMime이 magic-number로 검증 가능한 바이너리 형식이면 실제 바이트와 일치하는지
 * 확인하고, 검증 불가능한 텍스트 계열 형식이면 HTML 위장 여부만 확인한다.
 */
export function validateFileContent(
  buffer: Buffer,
  declaredMime: string,
  allowedMimeTypes: string[]
): { valid: boolean; reason?: string } {
  if (!allowedMimeTypes.includes(declaredMime)) {
    return { valid: false, reason: '허용되지 않는 파일 형식입니다.' }
  }

  if (declaredMime in SIGNATURES) {
    const realType = detectRealMimeType(buffer)
    if (realType !== declaredMime) {
      return { valid: false, reason: '파일 내용이 선언된 형식과 일치하지 않습니다.' }
    }
    return { valid: true }
  }

  // text/plain, application/json, text/csv 등: 매직넘버가 없어 HTML 위장만 방어
  if (looksLikeHtml(buffer)) {
    return { valid: false, reason: '허용되지 않는 파일 내용입니다.' }
  }
  return { valid: true }
}
