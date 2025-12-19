# 구독 만료 알림 및 접근 제어 구현 완료

## 📋 구현 개요

사용자 요청사항:
1. **다음 결제일 7일 전 알림 전송**
2. **구독 만료 시 대시보드 접근 차단**

모든 기능이 성공적으로 구현되었습니다.

---

## ✅ 구현 완료 항목

### 1. 데이터베이스 마이그레이션

**파일**: `supabase/migrations/20251219100000_add_expiry_notifications.sql`

- ✅ `notification_sent_logs` 테이블 생성 (중복 알림 방지)
- ✅ `company_subscriptions.grace_period_end` 컬럼 추가
- ✅ 기존 만료된 구독 자동 상태 업데이트
- ✅ 인덱스 생성으로 성능 최적화

**실행 방법**:
```bash
# Supabase Dashboard → SQL Editor에서 실행
# 또는 로컬에서:
npx supabase db push
```

---

### 2. Cron Job (자동 구독 체크)

**파일**: `src/app/api/cron/daily-tasks/route.ts` (통합됨)

**⚠️ Vercel 무료 플랜 제약**: Cron Job 1개만 지원 → 기존 `daily-tasks`에 구독 체크 로직 통합

**기능**:
- ✅ 만료 7일 전 구독 감지 → `subscription_expiring_soon` 알림 생성
- ✅ 만료된 구독 감지 → 상태를 `expired`로 변경
- ✅ `subscription_expired` 알림 생성
- ✅ Grace period 지원 (결제 지연 시 유예 기간)
- ✅ 중복 알림 방지 (notification_sent_logs 테이블 활용)
- ✅ 기존 daily tasks와 함께 실행 (revenue, health scores, sheets sync)

**실행 주기**: 매일 01:00 UTC (10:00 KST) - `vercel.json`에 설정됨

**보안**: `CRON_SECRET` 환경변수로 인증

**테스트 방법**:
```bash
# 로컬 테스트 (통합된 daily-tasks)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/daily-tasks

# 예상 응답 (통합된 결과)
{
  "timestamp": "2025-12-19T01:00:00.000Z",
  "tasksExecuted": [
    {
      "task": "subscription_expiry_check",
      "status": "success",
      "expiringSoonCount": 2,
      "notificationsCreated": 2,
      "expiredCount": 1,
      "subscriptionsExpired": 1
    },
    {
      "task": "revenue_calculation",
      "status": "success",
      ...
    },
    ...
  ]
}
```

**참고**: `/api/cron/check-subscriptions` 엔드포인트는 수동 테스트용으로 유지되지만 cron 스케줄에서는 제거됨

---

### 3. 접근 제어 (Middleware)

**파일**: `src/middleware.ts`

**구현 로직**:
- ✅ `/dashboard` 경로 접근 시 구독 상태 자동 체크
- ✅ 만료된 구독 → `/dashboard/subscription/expired`로 리다이렉트
- ✅ `/dashboard/subscription` 페이지는 항상 접근 허용 (플랜 선택 필요)
- ✅ Grace period 지원 (결제 지연 시에도 접근 허용)

**차단 조건**:
```typescript
// 아래 조건 중 하나라도 만족하면 접근 차단:
1. status가 'expired', 'cancelled', 'suspended'
2. trial_end < now (trial 기간 만료)
3. current_period_end < now AND (grace_period_end IS NULL OR grace_period_end < now)
```

---

### 4. 만료된 구독 페이지

**파일**: `src/app/dashboard/subscription/expired/page.tsx`

**기능**:
- ✅ 만료된 구독 정보 표시
- ✅ Grace period 상태 구분 표시
- ✅ "플랜 선택하기" 버튼 → `/dashboard/subscription`로 이동
- ✅ "상태 새로고침" 버튼 (결제 완료 후 상태 확인)
- ✅ 고객 지원 링크 제공

**UI 상태**:
- 🟠 Grace Period: 결제 지연 경고 (유예 기간 남음)
- 🔴 Expired: 완전 만료 (대시보드 접근 불가)

---

### 5. 유틸리티 함수

**파일**: `src/lib/subscription-access.ts`

**제공 함수**:
```typescript
// 1. 접근 권한 체크
checkSubscriptionAccess(userId: string): Promise<SubscriptionAccessResult>

// 2. 상태 라벨 (한국어)
getSubscriptionStatusLabel(status: string): string

// 3. 상태 색상 (Tailwind CSS)
getSubscriptionStatusColor(status: string): string
```

**반환 정보**:
- `hasAccess`: 접근 허용 여부 (boolean)
- `subscription`: 구독 정보
- `reason`: 차단/허용 이유 ('expired' | 'active' | 'grace_period' | 'no_subscription')
- `redirectTo`: 리다이렉트 경로 (차단 시)
- `gracePeriodEnd`: 유예 기간 종료일 (해당 시)

---

### 6. 알림 타입 추가

**파일**: `src/app/admin/notifications/page.tsx`

**새로운 알림 타입**:
- ✅ `subscription_expiring_soon`: 만료 7일 전 (🟠 오렌지)
- ✅ `subscription_expired`: 만료됨 (🔴 빨강)
- ✅ `subscription_in_grace_period`: 결제 지연 (🟡 노랑)

**아이콘**:
- `Clock` (시계): 만료 예정, Grace period
- `AlertTriangle` (경고): 만료됨

---

### 7. Vercel Cron 설정

**파일**: `vercel.json`

**⚠️ 변경사항**: Vercel 무료 플랜은 Cron Job 1개만 지원 → `daily-tasks`에 통합

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**실행 주기**: 매일 01:00 UTC (10:00 KST)

**⏰ 시간 처리 정책**:
- **서버/DB**: 모든 시간은 UTC로 저장 및 처리
- **프론트엔드**: 사용자 타임존으로 자동 변환하여 표시
- **Cron**: UTC 01:00 = 한국 시간 오전 10시 실행

**통합된 작업**:
1. 구독 만료 체크 및 알림 생성 (NEW)
2. Revenue 계산 (MRR/ARR)
3. Health Score 계산
4. Google Sheets 동기화
5. Growth Opportunities 감지

---

## 🔄 시스템 플로우

### 플로우 1: 만료 7일 전 알림

```
1. Cron Job 실행 (매일 01:00 UTC = 10:00 KST - daily-tasks)
   ↓
2. checkSubscriptionExpiry() 함수 실행
   ↓
3. current_period_end가 7일 이내인 구독 검색
   ↓
4. notification_sent_logs에서 중복 체크
   ↓
5. 중복 아니면:
   - notifications 테이블에 알림 생성
   - notification_sent_logs에 로그 기록
   ↓
6. Realtime으로 NotificationBell 업데이트
```

### 플로우 2: 구독 만료 처리

```
1. Cron Job 실행 (매일 01:00 UTC = 10:00 KST - daily-tasks)
   ↓
2. checkSubscriptionExpiry() 함수 실행
   ↓
3. current_period_end < now인 구독 검색
   ↓
4. Grace period 확인
   - grace_period_end > now → status = 'past_due' (접근 허용)
   - grace_period_end ≤ now OR NULL → status = 'expired' (접근 차단)
   ↓
5. expired 상태로 변경 시:
   - notifications 테이블에 만료 알림 생성
   - notification_sent_logs에 로그 기록
```

### 플로우 3: 대시보드 접근

```
사용자가 /dashboard 접근
   ↓
Middleware 실행
   ↓
구독 상태 체크:
   - expired, cancelled, suspended → /dashboard/subscription/expired
   - trial_end < now → /dashboard/subscription/expired
   - current_period_end < now AND grace_period_end < now → /dashboard/subscription/expired
   - 그 외 → 접근 허용
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 만료 7일 전 알림 테스트

```sql
-- 1. 테스트용 구독 생성 (7일 후 만료)
INSERT INTO company_subscriptions (company_id, plan_id, status, current_period_end)
VALUES (
  'YOUR_COMPANY_ID',
  'YOUR_PLAN_ID',
  'active',
  NOW() + INTERVAL '7 days'
);

-- 2. Cron Job 수동 실행
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/check-subscriptions

-- 3. 알림 생성 확인
SELECT * FROM notifications
WHERE type = 'subscription_expiring_soon'
ORDER BY created_at DESC LIMIT 1;

-- 4. 로그 기록 확인
SELECT * FROM notification_sent_logs
WHERE notification_type = 'subscription_expiring_soon'
ORDER BY sent_at DESC LIMIT 1;
```

### 시나리오 2: 만료된 구독 접근 차단 테스트

```sql
-- 1. 테스트용 만료 구독 생성
UPDATE company_subscriptions
SET
  status = 'expired',
  current_period_end = NOW() - INTERVAL '1 day'
WHERE company_id = 'YOUR_COMPANY_ID';

-- 2. 브라우저에서 /dashboard 접근 시도
-- → 자동으로 /dashboard/subscription/expired로 리다이렉트됨

-- 3. /dashboard/subscription 접근
-- → 정상 접근 (플랜 선택 가능)
```

### 시나리오 3: Grace Period 테스트

```sql
-- 1. Grace period 설정 (3일 유예)
UPDATE company_subscriptions
SET
  status = 'past_due',
  current_period_end = NOW() - INTERVAL '1 day',
  grace_period_end = NOW() + INTERVAL '3 days'
WHERE company_id = 'YOUR_COMPANY_ID';

-- 2. /dashboard 접근
-- → 접근 허용 (grace period 중)

-- 3. Grace period 만료 시뮬레이션
UPDATE company_subscriptions
SET grace_period_end = NOW() - INTERVAL '1 hour'
WHERE company_id = 'YOUR_COMPANY_ID';

-- 4. Cron Job 실행
-- → status가 'expired'로 변경됨
```

### 시나리오 4: 중복 알림 방지 테스트

```bash
# 1. Cron Job 첫 실행
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/check-subscriptions
# 결과: notificationsCreated: 1

# 2. 같은 날 다시 실행 (중복 체크)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/check-subscriptions
# 결과: notificationsCreated: 0 (중복 방지)
```

---

## 🛡️ 보안 고려사항

1. **Cron Job 인증**:
   - `CRON_SECRET` 환경변수 필수 설정
   - Vercel 환경변수에 추가: `CRON_SECRET=랜덤_문자열_생성`

2. **RLS (Row Level Security)**:
   - 기존 Supabase RLS 정책 유지
   - `notification_sent_logs`는 서버 사이드에서만 접근

3. **Middleware 성능**:
   - 구독 조회 쿼리 최적화 (인덱스 활용)
   - 캐싱 가능 시 적용 (향후 개선)

---

## 📊 데이터베이스 스키마 변경사항

### 신규 테이블: `notification_sent_logs`

```sql
CREATE TABLE notification_sent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notification_logs_subscription
  ON notification_sent_logs(subscription_id, notification_type);
CREATE INDEX idx_notification_logs_sent_at
  ON notification_sent_logs(sent_at);
```

**목적**: 중복 알림 방지 및 알림 이력 추적

### 기존 테이블 수정: `company_subscriptions`

```sql
ALTER TABLE company_subscriptions
ADD COLUMN grace_period_end TIMESTAMPTZ;
```

**목적**: 결제 실패 시 유예 기간 지원

---

## 🚀 배포 체크리스트

### 1단계: 환경변수 설정

```bash
# Vercel Dashboard → Project Settings → Environment Variables
CRON_SECRET=랜덤_생성_문자열_최소_32자
```

### 2단계: 데이터베이스 마이그레이션

```bash
# Supabase Dashboard → SQL Editor
# 파일 내용 복사하여 실행:
# supabase/migrations/20251219100000_add_expiry_notifications.sql
```

**확인**:
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notification_sent_logs';

-- 컬럼 추가 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'company_subscriptions' AND column_name = 'grace_period_end';
```

### 3단계: 코드 배포

```bash
# Git commit & push
git add .
git commit -m "feat: 구독 만료 알림 및 접근 제어 시스템 구현"
git push origin main

# Vercel 자동 배포 확인
```

### 4단계: Cron Job 동작 확인

```bash
# Vercel Dashboard → Project → Cron Jobs
# "check-subscriptions" 항목 확인
# Status: Active
# Last Run: 최근 실행 시간 표시됨

# 수동 테스트
curl -X GET "https://YOUR_DOMAIN/api/cron/check-subscriptions" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5단계: 기능 테스트

1. **만료 7일 전 알림**:
   - 테스트 구독 생성 (7일 후 만료)
   - Cron Job 수동 실행
   - 알림 생성 확인

2. **접근 차단**:
   - 만료된 구독 시뮬레이션
   - `/dashboard` 접근 → 자동 리다이렉트 확인

3. **Grace Period**:
   - `grace_period_end` 설정
   - 접근 허용 확인
   - 만료 후 차단 확인

---

## 📚 관련 문서

- 설계 문서: `claudedocs/subscription-expiry-notification-design.md`
- 플랜 마이그레이션 가이드: `claudedocs/subscription-plan-migration-guide.md`
- 플랜 재설계 문서: `claudedocs/subscription-plan-redesign.md`

---

## 🔧 향후 개선 사항 (선택사항)

1. **이메일 알림 추가**:
   - Resend/SendGrid 연동
   - 만료 7일 전 이메일 발송
   - 만료 당일 이메일 발송

2. **대시보드 배너**:
   - Grace period 중 경고 배너 표시
   - "결제하기" 버튼 추가

3. **자동 갱신**:
   - 결제 정보 연동
   - 자동 결제 처리
   - 결제 실패 시 Grace period 자동 설정

4. **알림 세부 설정**:
   - 사용자별 알림 설정 (켜기/끄기)
   - 알림 채널 선택 (앱/이메일/SMS)

5. **성능 최적화**:
   - Middleware에서 구독 조회 캐싱
   - Redis 활용 (구독 상태 캐시)

---

## ❓ 문제 해결

### 문제 1: Cron Job이 실행되지 않음

**원인**: `CRON_SECRET` 환경변수 미설정

**해결**:
```bash
# Vercel Dashboard → Environment Variables
CRON_SECRET=YOUR_SECRET_HERE

# 재배포 필요
```

### 문제 2: 알림이 중복 생성됨

**원인**: `notification_sent_logs` 테이블 누락

**해결**:
```sql
-- 마이그레이션 재실행
-- supabase/migrations/20251219100000_add_expiry_notifications.sql
```

### 문제 3: Middleware에서 무한 리다이렉트

**원인**: `/dashboard/subscription/expired` 페이지도 차단됨

**해결**: 코드 확인
```typescript
// middleware.ts
const isSubscriptionPage =
  request.nextUrl.pathname.startsWith('/dashboard/subscription')
// 이 조건이 올바르게 동작하는지 확인
```

---

## 📞 지원

문제 발생 시:
1. Supabase Dashboard → Logs 확인
2. Vercel Dashboard → Functions → Logs 확인
3. 브라우저 Console 로그 확인
4. GitHub Issues에 문의

---

**구현 완료일**: 2025-12-19
**구현자**: Claude Code Assistant
**상태**: ✅ 완료 및 테스트 준비 완료
