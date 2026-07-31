// 브라우저(클라이언트)에서 발생하는 에러를 Sentry로 전송하는 초기화 파일
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // 성능 추적(트레이스)은 무료 티어 쿼터를 아끼기 위해 낮게 유지 - 목적은 에러 감지이지 APM이 아님
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // 콘솔 브레드크럼의 개인정보 노출 위험 - src/sentry.server.config.ts 참고
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console') return null
    return breadcrumb
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
