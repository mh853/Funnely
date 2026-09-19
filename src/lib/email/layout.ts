// 모든 트랜잭션 메일이 공유하는 브랜드 레이아웃(600px 테이블, 인라인 스타일만 사용)
import { config } from '@/lib/config'
import { escapeHtml } from '@/lib/email/template-renderer'

// 로고 PNG(보라 그라데이션 심볼 + 남색 워드마크) 기준 팔레트.
// tailwind primary(스카이)와 기존 메일의 #667eea는 로고와 맞지 않아 쓰지 않는다.
export const EMAIL_BRAND = {
  primary: '#6B4EFF',
  primaryDark: '#5538E6',
  ink: '#1E1B4B',
  text: '#374151',
  muted: '#6B7280',
  border: '#E5E7EB',
  surface: '#F6F5FB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  successBg: '#EEF2FF',
  logoUrl: `${config.app.domain}/brand/funnely-logo-horizontal-primary.png`,
  homeUrl: config.app.domain,
  supportUrl: `${config.app.domain}/dashboard/support`,
} as const

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"

export interface EmailCta {
  label: string
  url: string
  tone?: 'primary' | 'danger'
}

export interface EmailShellOptions {
  /** 본문 상단 제목(h1). 이모지 없이 */
  title: string
  /** 받은편지함 미리보기 문구. 생략하면 title */
  preheader?: string
  /** 본문 HTML. 아래 헬퍼(paragraph/infoTable/callout/quote)로 조립 */
  bodyHtml: string
  cta?: EmailCta
  /** CTA 아래 작은 링크(예: 영수증 보기) */
  secondaryLink?: { label: string; url: string }
  /** 푸터 첫 줄. 왜 이 메일을 받는지 */
  footerNote?: string
  /** 내부 알림 메일은 사업자 정보 푸터를 생략 */
  internal?: boolean
}

/** 본문 문단 */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${EMAIL_BRAND.text};">${html}</p>`
}

/** 인사말. 이름이 비면 "고객님" */
export function greeting(name: string | null | undefined): string {
  const who = name && name.trim() ? `${escapeHtml(name.trim())}님` : '고객님'
  return paragraph(`안녕하세요, <strong style="color:${EMAIL_BRAND.ink};">${who}</strong>.`)
}

/** 라벨/값 표. 값은 호출부에서 escape */
export function infoTable(rows: Array<[string, string]>): string {
  const trs = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:${EMAIL_BRAND.muted};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${EMAIL_BRAND.border};">${escapeHtml(label)}</td>
          <td style="padding:10px 16px;font-size:14px;color:${EMAIL_BRAND.ink};font-weight:600;vertical-align:top;border-bottom:1px solid ${EMAIL_BRAND.border};">${value}</td>
        </tr>`
    )
    .join('')
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:${EMAIL_BRAND.surface};border-radius:8px;border-collapse:separate;overflow:hidden;">
        ${trs}
      </table>`
}

/** 강조 상자. danger는 삭제·실패 경고용 */
export function callout(html: string, tone: 'info' | 'danger' = 'info'): string {
  const bg = tone === 'danger' ? EMAIL_BRAND.dangerBg : EMAIL_BRAND.successBg
  const bar = tone === 'danger' ? EMAIL_BRAND.danger : EMAIL_BRAND.primary
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:${bg};border-left:4px solid ${bar};border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.6;color:${EMAIL_BRAND.text};">${html}</td>
        </tr>
      </table>`
}

/** 인용 블록(티켓 답변 내용 등). 값은 호출부에서 escape */
export function quote(html: string): string {
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:${EMAIL_BRAND.surface};border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.7;color:${EMAIL_BRAND.text};white-space:pre-wrap;">${html}</td>
        </tr>
      </table>`
}

function ctaHtml(cta: EmailCta): string {
  const bg = cta.tone === 'danger' ? EMAIL_BRAND.danger : EMAIL_BRAND.primary
  return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 0;">
        <tr>
          <td style="border-radius:8px;background:${bg};">
            <a href="${cta.url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;font-family:${FONT};">${escapeHtml(cta.label)}</a>
          </td>
        </tr>
      </table>`
}

/** 600px 카드만 반환(다른 문서에 끼워 넣을 때) */
export function renderEmailCard(opts: EmailShellOptions): string {
  const b = EMAIL_BRAND
  const business = config.business
  const footerLegal = opts.internal
    ? ''
    : `
            <p style="margin:12px 0 0;font-size:11px;line-height:1.7;color:#9CA3AF;">
              ${escapeHtml(business.name)} · 대표 ${escapeHtml(business.ceo)} · 사업자등록번호 ${escapeHtml(business.registrationNumber)}<br>
              ${escapeHtml(business.address)} · ${escapeHtml(business.phone)}
            </p>`

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.surface};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:0 0 20px;">
            <a href="${b.homeUrl}" style="text-decoration:none;">
              <img src="${b.logoUrl}" width="150" alt="Funnely" style="display:block;width:150px;height:auto;border:0;">
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid ${b.border};border-radius:12px;padding:36px 32px;font-family:${FONT};">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.4;font-weight:800;color:${b.ink};">${escapeHtml(opts.title)}</h1>
            ${opts.bodyHtml}
            ${opts.cta ? ctaHtml(opts.cta) : ''}
            ${
              opts.secondaryLink
                ? `<p style="margin:16px 0 0;text-align:center;font-size:13px;"><a href="${opts.secondaryLink.url}" style="color:${b.primary};text-decoration:underline;">${escapeHtml(opts.secondaryLink.label)}</a></p>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 12px 0;font-family:${FONT};">
            ${opts.footerNote ? `<p style="margin:0;font-size:12px;line-height:1.7;color:${b.muted};">${opts.footerNote}</p>` : ''}
            <p style="margin:8px 0 0;font-size:12px;line-height:1.7;color:${b.muted};">
              <a href="${b.homeUrl}" style="color:${b.muted};text-decoration:underline;">funnely.co.kr</a>
              ${opts.internal ? '' : ` · <a href="${b.supportUrl}" style="color:${b.muted};text-decoration:underline;">문의하기</a>`}
            </p>
            ${footerLegal}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/** 완성된 HTML 문서 */
export function renderEmailShell(opts: EmailShellOptions): string {
  const preheader = escapeHtml(opts.preheader ?? opts.title)
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.surface};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  ${renderEmailCard(opts)}
</body>
</html>`
}
