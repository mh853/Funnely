// Node.js 런타임(API 라우트, 서버 컴포넌트 등)에서 발생하는 에러를 Sentry로 전송
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // 콘솔 브레드크럼은 코드 전반의 console.log/error 호출 인자를 그대로 실어나르는데,
  // 그 중 다수가 리드 연락처 등 개인정보를 포함한다. 프로덕션은 next.config.js의
  // removeConsole이 우연히 이를 막아주지만 로컬 개발(같은 운영 DB 사용)에는 이
  // 방어막이 없어, 콘솔 브레드크럼 자체를 수집하지 않도록 한다.
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console') return null
    return breadcrumb
  },
})
