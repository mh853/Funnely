// 대시보드 UI가 "[임시 비활성화]" 상태로 /dashboard로 리다이렉트만 하고 있는
// 기능들의 백엔드 API 라우트가 계속 완전히 살아있어, UI를 거치지 않고 URL을
// 직접 호출하면 실제 동작(OAuth 연동, 캠페인/폼 템플릿 생성 등)이 그대로
// 되고 있었다. UI만 막고 백엔드를 그대로 두는 것은 우회 가능한 반쪽짜리
// 비활성화이므로, API 쪽에도 동일한 게이트를 건다.
// 각 기능을 다시 켤 준비가 되면 해당 값만 true로 바꾸면 된다.
export const AD_INTEGRATION_ENABLED = false
export const FORM_BUILDER_ENABLED = false

export const FEATURE_DISABLED_RESPONSE = {
  error: '현재 준비 중인 기능입니다.',
} as const
