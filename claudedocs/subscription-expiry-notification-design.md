# 구독 만료 알림 및 접근 제어 시스템 설계

## 🎯 요구사항

1. **다음 결제일 7일 전 알림**: 구독 만료 7일 전에 자동으로 알림 생성
2. **만료 시 접속 차단**: 구독 기간이 지나면 대시보드 접속 불가

## 📐 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Cron Job (매일 실행)                                   │
│  - 만료 7일 전 구독 체크                                │
│  - 만료된 구독 체크                                     │
│  - 알림 생성 및 상태 업데이트                           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Database Triggers                                      │
│  - 구독 상태 변경 시 알림 자동 생성                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Middleware (접근 제어)                                 │
│  - 페이지 접근 시 구독 상태 확인                        │
│  - 만료된 구독: /subscription/expired 리다이렉트        │
└─────────────────────────────────────────────────────────┘
```

## 1. 데이터베이스 설계

### 1.1 Notification Types 추가

```sql
-- notifications 테이블에 새로운 알림 타입 추가
-- 'subscription_expiring_soon': 만료 7일 전 알림
-- 'subscription_expired': 구독 만료 알림
-- 'subscription_renewal_failed': 자동 결제 실패 알림
```

### 1.2 Company Subscriptions 상태 확장

```sql
-- 기존: active, trial, expired, cancelled, suspended
-- 추가: past_due (결제 실패), grace_period (유예 기간)

ALTER TABLE company_subscriptions
ADD COLUMN grace_period_end TIMESTAMPTZ NULL;

COMMENT ON COLUMN company_subscriptions.grace_period_end IS
'유예 기간 종료일 (결제 실패 후 7일 유예)';
```

### 1.3 알림 발송 이력 테이블 (중복 방지)

```sql
CREATE TABLE IF NOT EXISTS notification_sent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id),
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_sent_logs_subscription
ON notification_sent_logs(subscription_id, notification_type, period_end);

COMMENT ON TABLE notification_sent_logs IS
'알림 발송 이력 - 같은 기간에 중복 알림 방지';
```

## 2. Cron Job 설계

### 2.1 API 엔드포인트: `/api/cron/check-subscriptions`

```typescript
// src/app/api/cron/check-subscriptions/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const sevenDaysLater = new Date(now)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  // 1. 만료 7일 전 구독 체크
  const { data: expiringSoon } = await supabase
    .from('company_subscriptions')
    .select('*, companies(name)')
    .eq('status', 'active')
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', sevenDaysLater.toISOString())

  // 2. 이미 알림 보낸 구독 제외
  for (const sub of expiringSoon || []) {
    const { data: alreadySent } = await supabase
      .from('notification_sent_logs')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('notification_type', 'subscription_expiring_soon')
      .eq('period_end', sub.current_period_end)
      .single()

    if (!alreadySent) {
      // 알림 생성
      await supabase.from('notifications').insert({
        company_id: sub.company_id,
        title: `${sub.companies.name} - 구독 만료 예정`,
        message: `구독이 7일 후 만료됩니다. 서비스가 중단되지 않도록 결제 정보를 확인해주세요.`,
        type: 'subscription_expiring_soon',
        is_read: false,
      })

      // 발송 이력 기록
      await supabase.from('notification_sent_logs').insert({
        subscription_id: sub.id,
        notification_type: 'subscription_expiring_soon',
        period_end: sub.current_period_end,
      })
    }
  }

  // 3. 만료된 구독 체크 및 상태 업데이트
  const { data: expiredSubs } = await supabase
    .from('company_subscriptions')
    .select('*, companies(name)')
    .in('status', ['active', 'trial', 'past_due'])
    .lt('current_period_end', now.toISOString())

  for (const sub of expiredSubs || []) {
    // 상태를 expired로 변경
    await supabase
      .from('company_subscriptions')
      .update({
        status: 'expired',
        updated_at: now.toISOString()
      })
      .eq('id', sub.id)

    // 만료 알림 생성
    const { data: alreadySent } = await supabase
      .from('notification_sent_logs')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('notification_type', 'subscription_expired')
      .eq('period_end', sub.current_period_end)
      .single()

    if (!alreadySent) {
      await supabase.from('notifications').insert({
        company_id: sub.company_id,
        title: `${sub.companies.name} - 구독 만료`,
        message: `구독이 만료되었습니다. 서비스 이용을 계속하려면 구독을 갱신해주세요.`,
        type: 'subscription_expired',
        is_read: false,
      })

      await supabase.from('notification_sent_logs').insert({
        subscription_id: sub.id,
        notification_type: 'subscription_expired',
        period_end: sub.current_period_end,
      })
    }
  }

  return NextResponse.json({
    success: true,
    expiringSoon: expiringSoon?.length || 0,
    expired: expiredSubs?.length || 0,
    timestamp: now.toISOString(),
  })
}
```

### 2.2 Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-subscriptions",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**스케줄**: 매일 오전 9시 (한국 시간 기준 18시)

## 3. 접근 제어 (Middleware)

### 3.1 구독 상태 확인 유틸리티

```typescript
// src/lib/subscription/checkAccess.ts

import { createClient } from '@/lib/supabase/server'

export async function checkSubscriptionAccess(userId: string) {
  const supabase = await createClient()

  // 사용자의 회사 ID 조회
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!profile?.company_id) {
    return {
      hasAccess: false,
      reason: 'no_company',
      message: '회사 정보가 없습니다.',
    }
  }

  // 활성 구독 확인
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('company_id', profile.company_id)
    .in('status', ['active', 'trial', 'past_due'])
    .single()

  if (!subscription) {
    return {
      hasAccess: false,
      reason: 'no_subscription',
      message: '활성 구독이 없습니다.',
      redirectTo: '/dashboard/subscription',
    }
  }

  // 만료 확인
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  if (periodEnd < now && subscription.status !== 'trial') {
    return {
      hasAccess: false,
      reason: 'expired',
      message: '구독이 만료되었습니다.',
      subscription,
      redirectTo: '/dashboard/subscription/expired',
    }
  }

  // 체험 기간 확인
  if (subscription.status === 'trial' && subscription.trial_end) {
    const trialEnd = new Date(subscription.trial_end)
    if (trialEnd < now) {
      return {
        hasAccess: false,
        reason: 'trial_expired',
        message: '체험 기간이 종료되었습니다.',
        subscription,
        redirectTo: '/dashboard/subscription',
      }
    }
  }

  return {
    hasAccess: true,
    subscription,
  }
}
```

### 3.2 Dashboard Layout 접근 제어

```typescript
// src/app/dashboard/layout.tsx

import { redirect } from 'next/navigation'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { checkSubscriptionAccess } from '@/lib/subscription/checkAccess'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 슈퍼어드민은 구독 체크 스킵
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    // 일반 사용자: 구독 상태 확인
    const accessCheck = await checkSubscriptionAccess(user.id)

    if (!accessCheck.hasAccess) {
      // 접근 불가 시 리다이렉트
      redirect(accessCheck.redirectTo || '/dashboard/subscription')
    }
  }

  return (
    <div>
      {/* Dashboard UI */}
      {children}
    </div>
  )
}
```

### 3.3 만료 안내 페이지

```typescript
// src/app/dashboard/subscription/expired/page.tsx

import { redirect } from 'next/navigation'
import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SubscriptionExpiredPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profile = await getCachedUserProfile(user.id)

  if (!profile?.company_id) {
    redirect('/dashboard')
  }

  // 만료된 구독 정보 조회
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* 경고 아이콘 */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            구독이 만료되었습니다
          </h1>

          <p className="text-gray-600 mb-6">
            서비스를 계속 이용하시려면 구독을 갱신해주세요.
          </p>

          {subscription && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="text-sm text-gray-500 mb-1">이전 구독 플랜</div>
              <div className="font-semibold text-gray-900">
                {subscription.subscription_plans.name} 플랜
              </div>
              <div className="text-sm text-gray-600 mt-2">
                만료일:{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
              </div>
            </div>
          )}

          <Link href="/dashboard/subscription">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              구독 갱신하기
            </Button>
          </Link>

          <Link href="/auth/logout">
            <Button variant="ghost" className="w-full mt-3">
              로그아웃
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

## 4. 알림 UI 업데이트

### 4.1 Notification Types 추가

```typescript
// src/app/admin/notifications/page.tsx (기존 파일 업데이트)

import { Clock, AlertTriangle } from 'lucide-react'

const TYPE_ICONS: Record<string, any> = {
  // ... 기존 아이콘
  subscription_expiring_soon: Clock,
  subscription_expired: AlertTriangle,
}

const TYPE_COLORS: Record<string, string> = {
  // ... 기존 색상
  subscription_expiring_soon: 'text-orange-600 bg-orange-50',
  subscription_expired: 'text-red-600 bg-red-50',
}

const TYPE_LABELS: Record<string, string> = {
  // ... 기존 라벨
  subscription_expiring_soon: '만료 예정',
  subscription_expired: '구독 만료',
}
```

## 5. 구현 순서

### Phase 1: 데이터베이스 설정
1. [ ] notification_sent_logs 테이블 생성
2. [ ] company_subscriptions.grace_period_end 컬럼 추가
3. [ ] 테스트 데이터 생성 (만료 예정 구독)

### Phase 2: Cron Job 구현
1. [ ] `/api/cron/check-subscriptions` 엔드포인트 생성
2. [ ] vercel.json에 cron 설정 추가
3. [ ] 로컬 테스트 (수동 API 호출)
4. [ ] CRON_SECRET 환경변수 설정

### Phase 3: 접근 제어
1. [ ] `checkSubscriptionAccess` 유틸리티 생성
2. [ ] Dashboard layout에 접근 제어 추가
3. [ ] `/dashboard/subscription/expired` 페이지 생성
4. [ ] 테스트 (만료된 구독으로 접속 시도)

### Phase 4: 알림 UI
1. [ ] 알림 타입 아이콘/색상/라벨 추가
2. [ ] 사용자 대시보드에 만료 경고 배너 추가
3. [ ] 테스트 (알림 생성 및 표시 확인)

## 6. 환경변수 설정

```bash
# .env.local
CRON_SECRET=your-secure-random-string-here
```

Vercel Dashboard → Settings → Environment Variables에도 추가

## 7. 테스트 시나리오

### 7.1 만료 7일 전 알림 테스트

```sql
-- 테스트용 구독 생성 (7일 후 만료)
INSERT INTO company_subscriptions (
  company_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end
)
VALUES (
  '[YOUR_COMPANY_ID]',
  '[YOUR_PLAN_ID]',
  'active',
  'monthly',
  NOW(),
  NOW() + INTERVAL '7 days'
);

-- Cron API 수동 호출
curl http://localhost:3000/api/cron/check-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

-- 알림 생성 확인
SELECT * FROM notifications
WHERE type = 'subscription_expiring_soon'
ORDER BY created_at DESC LIMIT 1;
```

### 7.2 만료 구독 접근 차단 테스트

```sql
-- 테스트용 만료 구독 생성
UPDATE company_subscriptions
SET current_period_end = NOW() - INTERVAL '1 day'
WHERE company_id = '[YOUR_COMPANY_ID]';

-- 브라우저에서 /dashboard 접속 시도
-- 예상 결과: /dashboard/subscription/expired로 리다이렉트
```

### 7.3 중복 알림 방지 테스트

```bash
# Cron API 2번 연속 호출
curl http://localhost:3000/api/cron/check-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl http://localhost:3000/api/cron/check-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 알림이 1개만 생성되었는지 확인
SELECT COUNT(*) FROM notifications
WHERE type = 'subscription_expiring_soon'
AND company_id = '[YOUR_COMPANY_ID]';
-- 예상 결과: 1
```

## 8. 모니터링 및 로깅

### 8.1 Cron Job 실행 로그

```typescript
// Vercel Dashboard → Deployments → Functions → Logs
// 또는 별도 로그 테이블 생성

CREATE TABLE cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed')),
  expiring_soon_count INT DEFAULT 0,
  expired_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 알림 발송 통계

```sql
-- 일별 알림 발송 통계
SELECT
  DATE(sent_at) as date,
  notification_type,
  COUNT(*) as count
FROM notification_sent_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at), notification_type
ORDER BY date DESC, notification_type;
```

## 9. 추가 개선사항

### 9.1 이메일 알림 (선택사항)

```typescript
// 만료 7일 전 이메일 발송
import { sendEmail } from '@/lib/email'

await sendEmail({
  to: companyAdmin.email,
  subject: '[퍼널리] 구독 만료 7일 전 안내',
  html: `
    <h1>구독 만료 안내</h1>
    <p>귀사의 구독이 <strong>7일 후</strong> 만료됩니다.</p>
    <p>서비스가 중단되지 않도록 결제 정보를 확인해주세요.</p>
    <a href="https://yourapp.com/dashboard/subscription">구독 갱신하기</a>
  `,
})
```

### 9.2 유예 기간 (Grace Period)

```typescript
// 결제 실패 후 7일 유예 기간 제공
const gracePeriodEnd = new Date(subscription.current_period_end)
gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)

await supabase
  .from('company_subscriptions')
  .update({
    status: 'past_due',
    grace_period_end: gracePeriodEnd.toISOString(),
  })
  .eq('id', subscription.id)
```

### 9.3 자동 갱신 시도

```typescript
// 토스 자동결제 API 호출
import { requestBillingPayment } from '@/lib/payment/toss'

const paymentResult = await requestBillingPayment({
  billingKey: subscription.billing_key,
  amount: subscription.subscription_plans.price_monthly,
  customerKey: subscription.customer_key,
})

if (paymentResult.success) {
  // 구독 기간 연장
  await extendSubscriptionPeriod(subscription.id)
} else {
  // 결제 실패 알림
  await createPaymentFailedNotification(subscription.company_id)
}
```

## 10. 보안 고려사항

1. **Cron 인증**: CRON_SECRET 환경변수로 엔드포인트 보호
2. **Rate Limiting**: Cron API에 Rate Limit 적용 (1분당 1회)
3. **데이터 암호화**: 결제 정보 암호화 저장
4. **로그 보안**: 민감 정보 로그 제외

## 11. 성능 최적화

1. **배치 처리**: 대량 구독 처리 시 배치 단위로 처리
2. **인덱스**: notification_sent_logs에 복합 인덱스 추가
3. **캐싱**: 구독 상태 체크 결과 캐싱 (5분)
4. **비동기 처리**: 알림 생성 비동기 큐 사용

## 📋 체크리스트

- [ ] notification_sent_logs 테이블 생성
- [ ] Cron API 엔드포인트 구현
- [ ] vercel.json cron 설정
- [ ] checkSubscriptionAccess 유틸리티
- [ ] Dashboard layout 접근 제어
- [ ] 만료 안내 페이지
- [ ] 알림 타입 UI 추가
- [ ] 테스트 시나리오 실행
- [ ] 환경변수 설정
- [ ] 프로덕션 배포
