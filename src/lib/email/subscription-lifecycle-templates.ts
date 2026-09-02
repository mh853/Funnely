// 체험/구독 만료 전후(2일전/당일/2일후/1개월후) + 데이터 삭제 안내 이메일 본문 빌더.
// variant('trial'|'subscription')에 따라 단어만 바뀌고 레이아웃은 공유한다.
import { escapeHtml } from '@/lib/email/template-renderer'

export type LifecycleVariant = 'trial' | 'subscription'

const HOME_URL = 'https://funnely.co.kr'
export const PLAN_SELECT_URL = 'https://funnely.co.kr/dashboard/subscription'

interface EmailContent {
  subject: string
  text: string
  html: string
}

function unitWord(variant: LifecycleVariant): string {
  return variant === 'trial' ? '무료체험' : '구독'
}

function wrapHtml(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 12px 0 20px;">
      <a href="${HOME_URL}" style="font-size: 20px; font-weight: 800; color: #667eea; text-decoration: none;">Funnely</a>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px;">
      ${bodyHtml}
    </div>
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p>이 이메일은 Funnely 구독 관리 안내입니다.</p>
    </div>
  </div>
</body>
</html>
  `
}

function ctaButtonHtml(label: string, url: string): string {
  return `
      <div style="text-align: center; margin-top: 24px;">
        <a href="${url}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          ${escapeHtml(label)} →
        </a>
      </div>`
}

/** 만료 2일전 */
export function buildExpiring2dEmail(variant: LifecycleVariant): EmailContent {
  const unit = unitWord(variant)
  const subject = `[Funnely] ${unit}이 2일 후 만료됩니다`
  const text = `퍼널리 ${unit}이 2일 남았습니다.\n\n만료 후 7일이 지나면 데이터가 삭제되니, 계속 이용하시려면 결제를 진행해주세요.\n\n구독 플랜 선택: ${PLAN_SELECT_URL}`
  const html = wrapHtml(`
      <h1 style="margin: 0 0 12px; font-size: 20px; color: #111827;">${unit}이 2일 후 만료됩니다</h1>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        만료 후 7일이 지나면 데이터가 삭제되니, 계속 이용하시려면 결제를 진행해주세요.
      </p>
      ${ctaButtonHtml('구독 플랜 선택하기', PLAN_SELECT_URL)}
  `)
  return { subject, text, html }
}

/** 만료 당일 */
export function buildExpiringTodayEmail(variant: LifecycleVariant): EmailContent {
  const unit = unitWord(variant)
  const subject = `[Funnely] ${unit}이 오늘 만료됩니다`
  const text = `퍼널리 ${unit}이 오늘 만료됩니다.\n\n7일 후 데이터가 삭제되니, 계속 이용하시려면 결제를 진행해주세요.\n\n구독 플랜 선택: ${PLAN_SELECT_URL}`
  const html = wrapHtml(`
      <h1 style="margin: 0 0 12px; font-size: 20px; color: #111827;">${unit}이 오늘 만료됩니다</h1>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        7일 후 데이터가 삭제되니, 계속 이용하시려면 결제를 진행해주세요.
      </p>
      ${ctaButtonHtml('구독 플랜 선택하기', PLAN_SELECT_URL)}
  `)
  return { subject, text, html }
}

/** 만료 2일후/1개월후 winback (본문 동일, 2일후만 삭제 예고 문구 포함) */
export function buildWinbackEmail(
  variant: LifecycleVariant,
  timing: '2d' | '1m',
  discountUrl: string
): EmailContent {
  const unit = unitWord(variant)
  const subject = `[Funnely] ${unit}, 잘 이용하셨나요? 10% 할인 안내`
  const deletionNotice =
    timing === '2d' ? ' (7일 후에는 데이터가 삭제됩니다)' : ''
  const text = `퍼널리 ${unit}은 잘 이용하셨나요?${deletionNotice}\n\n${unit}을 이용하셨던 분 한정으로, 7일 내 결제하시면 10% 추가 할인을 적용해드립니다.\n아래 링크로만 10% 할인이 적용됩니다.\n\n할인받고 계속하기: ${discountUrl}`
  const html = wrapHtml(`
      <h1 style="margin: 0 0 12px; font-size: 20px; color: #111827;">${unit}은 잘 이용하셨나요?</h1>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        ${unit}을 이용하셨던 분 한정으로, 7일 내 결제하시면 10% 추가 할인을 적용해드립니다.<br>
        아래 '할인받고 계속하기' 링크로만 10% 할인이 적용됩니다.${deletionNotice ? `<br><span style="color:#dc2626;">${deletionNotice.trim()}</span>` : ''}
      </p>
      ${ctaButtonHtml('할인받고 계속하기', discountUrl)}
  `)
  return { subject, text, html }
}

/** 데이터 삭제 안내 (D+7) */
export function buildDataDeletedEmail(variant: LifecycleVariant): EmailContent {
  const unit = unitWord(variant)
  const subject = `[Funnely] 귀사의 데이터가 삭제되었습니다`
  const text = `${unit} 만료 후 7일이 지나 귀사의 데이터가 삭제되었습니다.\n\n일정 기간 내에 결제하시면 데이터를 복구해드릴 수 있으니, 복구가 필요하시면 지금 결제해주세요.\n\n구독 플랜 선택: ${PLAN_SELECT_URL}`
  const html = wrapHtml(`
      <h1 style="margin: 0 0 12px; font-size: 20px; color: #111827;">귀사의 데이터가 삭제되었습니다</h1>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        ${unit} 만료 후 7일이 지나 데이터가 삭제되었습니다.<br>
        일정 기간 내에 결제하시면 데이터를 복구해드릴 수 있으니, 복구가 필요하시면 지금 결제해주세요.
      </p>
      ${ctaButtonHtml('구독 플랜 선택하기', PLAN_SELECT_URL)}
  `)
  return { subject, text, html }
}
