// 엣지 런타임(middleware 등)에서 발생하는 에러를 Sentry로 전송
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // 콘솔 브레드크럼의 개인정보 노출 위험 - src/sentry.server.config.ts 참고
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console') return null
    return breadcrumb
  },
})
