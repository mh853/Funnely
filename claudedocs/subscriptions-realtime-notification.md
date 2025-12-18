# 구독 관리 - 실시간 알림 시스템

## 🎯 구현 목표

Dashboard에서 구독을 생성하거나 Admin에서 구독 상태를 변경할 때:
1. **Admin 페이지**: 구독 목록 즉시 업데이트
2. **Dashboard 페이지**: 현재 구독 상태 즉시 업데이트
3. **알림 자동 생성**: "퍼널리에서 Pro 플랜 구독을 시작했습니다"
4. **NotificationBell**: 알림 배지 즉시 업데이트

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  User Action: Dashboard에서 구독 생성                             │
│  /dashboard/subscription → "7일 무료 체험 시작"                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────────────────┐
                │  Supabase INSERT      │
                │  company_subscriptions│
                │  (status: trial)      │
                └───────────────────────┘
                            ↓
                ┌───────────────────────┐
                │  Database Trigger     │
                │  create_subscription_ │
                │  notification()       │
                └───────────────────────┘
                            ↓
                ┌───────────────────────┐
                │  Notifications Table  │
                │  INSERT               │
                │  "퍼널리에서 Pro 플랜  │
                │  체험을 시작했습니다"  │
                └───────────────────────┘
        ┌───────────────────┴────────────────────┐
        ↓                                        ↓
┌──────────────────────┐            ┌──────────────────────┐
│  Realtime Event #1   │            │  Realtime Event #2   │
│  → subscriptions     │            │  → notifications     │
│                      │            │                      │
│  Admin Page          │            │  NotificationBell    │
│  fetchSubscriptions()│            │  fetchUnreadCount()  │
│  즉시 목록 갱신 ✅   │            │  배지 숫자 업데이트✅ │
│                      │            │                      │
│  Dashboard Page      │            │  Notifications Page  │
│  router.refresh()    │            │  fetchNotifications()│
│  현재 구독 상태 갱신✅│            │  새 알림 표시 ✅     │
└──────────────────────┘            └──────────────────────┘
```

## 📝 구현 내용

### 1. 데이터베이스 마이그레이션

**파일**: [supabase/migrations/20251218000000_enable_subscriptions_realtime.sql](supabase/migrations/20251218000000_enable_subscriptions_realtime.sql)

#### 1.1 Realtime Publication 활성화

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;
```

**효과**: `company_subscriptions` 테이블의 INSERT/UPDATE/DELETE 이벤트를 Realtime으로 브로드캐스트

#### 1.2 알림 자동 생성 함수

```sql
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  plan_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- 회사명, 플랜명 조회
  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  SELECT name INTO plan_name FROM subscription_plans WHERE id = NEW.plan_id;

  -- INSERT 이벤트 (신규 구독)
  IF TG_OP = 'INSERT' THEN
    notification_title := format('%s - 구독 시작', company_name);

    IF NEW.status = 'trial' THEN
      notification_message := format(
        '%s에서 %s 플랜 체험을 시작했습니다. (7일 무료 체험)',
        company_name,
        plan_name
      );
    ELSE
      notification_message := format(
        '%s에서 %s 플랜 구독을 시작했습니다.',
        company_name,
        plan_name
      );
    END IF;

    INSERT INTO notifications (
      company_id, title, message, type, is_read
    ) VALUES (
      NEW.company_id,
      notification_title,
      notification_message,
      'subscription_started',
      false
    );

  -- UPDATE 이벤트 (상태 변경)
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- ... 상태별 메시지 생성 및 알림 INSERT
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**알림 메시지 예시**:
- 신규 체험: "퍼널리에서 Pro 플랜 체험을 시작했습니다. (7일 무료 체험)"
- 신규 구독: "퍼널리에서 Pro 플랜 구독을 시작했습니다."
- 정식 전환: "퍼널리의 Pro 플랜이 정식 구독으로 전환되었습니다."
- 취소: "퍼널리의 Pro 플랜 구독이 취소되었습니다."

#### 1.3 트리거 생성

```sql
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();
```

**동작 방식**:
1. `company_subscriptions` 테이블에 INSERT/UPDATE 발생
2. 트리거가 `create_subscription_notification()` 함수 실행
3. 함수가 자동으로 `notifications` 테이블에 알림 INSERT
4. `notifications` INSERT → Realtime 이벤트 발생
5. NotificationBell/NotificationsPage 즉시 업데이트

### 2. Admin Subscriptions 페이지 - Realtime 구독

**파일**: [src/app/admin/subscriptions/page.tsx](src/app/admin/subscriptions/page.tsx#L87-L120)

```typescript
useEffect(() => {
  fetchSubscriptions()

  // Supabase Realtime 구독
  const supabase = createClient()

  const channel = supabase
    .channel('subscriptions-admin-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'company_subscriptions',
      },
      (payload) => {
        console.log('🔔 Realtime subscription change:', payload)
        console.log('  - Event type:', payload.eventType)
        console.log('  - Company:', payload.new?.company_id || payload.old?.company_id)
        console.log('  - Status:', payload.new?.status || payload.old?.status)

        // 구독 변경 시 즉시 목록 새로고침
        setTimeout(() => {
          fetchSubscriptions()
        }, 50) // DB 복제 지연 고려
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [filter, page])
```

**동작**:
- 모든 구독 변경사항 감지 (INSERT, UPDATE, DELETE)
- 50ms 지연 후 목록 새로고침 (DB 복제 지연 고려)
- 브라우저 콘솔에 상세 로그 출력

### 3. SubscriptionClient - Realtime 구독

**파일**: [src/components/subscription/SubscriptionClient.tsx](src/components/subscription/SubscriptionClient.tsx#L48-L78)

```typescript
import { useRouter } from 'next/navigation'

export default function SubscriptionClient({ plans, currentSubscription, companyId }) {
  const router = useRouter()

  // Realtime 구독 - 내 구독 상태 변경 감지
  useEffect(() => {
    if (!companyId) return

    const supabase = createClient()

    const channel = supabase
      .channel('user-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_subscriptions',
          filter: `company_id=eq.${companyId}`, // 현재 회사만 감지
        },
        (payload) => {
          console.log('🔔 My subscription changed:', payload)
          console.log('  - Event type:', payload.eventType)
          console.log('  - New status:', payload.new?.status)

          // Server Component 데이터 재조회
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, router])

  // ... 기존 코드
}
```

**동작**:
- `filter: company_id=eq.{companyId}` 로 현재 회사 구독만 감지
- `router.refresh()` 로 Server Component 데이터 재조회
- 현재 플랜 표시 즉시 업데이트

### 4. 알림 타입 추가

**notifications 테이블 type 컬럼에 추가된 값**:
- `subscription_started`: 구독 시작 (체험 또는 정식)
- `subscription_changed`: 구독 상태 변경 (활성화, 취소, 정지, 만료)

기존 타입:
- `new_lead`: 신규 리드
- `status_change`: 상태 변경
- `goal_achieved`: 목표 달성
- `report_ready`: 리포트 완료
- `user_activity`: 사용자 활동

## 🧪 테스트 시나리오

### 자동 테스트 스크립트

```bash
node scripts/test-subscription-notification.mjs
```

**스크립트 동작**:
1. 첫 번째 회사와 플랜 조회
2. Trial 구독 생성 (7일 무료 체험)
3. 1초 대기 (트리거 실행 시간)
4. 알림 자동 생성 확인
5. 테스트 결과 출력

**예상 출력**:
```
🧪 Testing subscription notification...

✅ Using company: 퍼널리
✅ Using plan: Pro

📤 Creating trial subscription:
   Company: 퍼널리
   Plan: Pro
   Status: trial
   Trial End: 2025. 12. 25.

✅ Subscription created successfully!
   ID: xxx-xxx-xxx

⏳ Waiting for notification trigger...
✅ Notification created automatically!
   Title: 퍼널리 - 구독 시작
   Message: 퍼널리에서 Pro 플랜 체험을 시작했습니다. (7일 무료 체험)

🔍 Check your browser WITHOUT refreshing:
   1. Admin subscriptions page: 새 구독이 즉시 표시되어야 합니다
   2. NotificationBell: 알림 배지가 즉시 업데이트되어야 합니다
   3. Admin notifications page: 새 알림이 즉시 표시되어야 합니다
```

### 수동 테스트

**1. 신규 구독 생성 테스트**
```
1. 브라우저 A: /admin/subscriptions 열기
2. 브라우저 B: /admin/notifications 열기
3. 브라우저 C: /dashboard/subscription 열기 (일반 사용자)
4. 브라우저 C에서 "7일 무료 체험 시작" 클릭
5. 확인 사항:
   ✅ 브라우저 A: 새 구독 즉시 표시 (< 1초)
   ✅ 브라우저 B: 새 알림 즉시 표시 (< 1초)
   ✅ 브라우저 C: 현재 플랜 표시 업데이트
   ✅ NotificationBell: 배지 숫자 +1
```

**브라우저 콘솔 로그**:
```javascript
// Admin Subscriptions Page (브라우저 A)
🔔 Realtime subscription change: { eventType: 'INSERT', ... }
  - Event type: INSERT
  - Company: xxx-company-id
  - Status: trial

// NotificationBell (모든 브라우저)
🔔 Realtime notification change: { eventType: 'INSERT', ... }
  - Event type: INSERT
  - Old is_read: undefined
  - New is_read: false

// Dashboard Subscription (브라우저 C)
🔔 My subscription changed: { eventType: 'INSERT', ... }
  - Event type: INSERT
  - New status: trial
```

**2. 구독 상태 변경 테스트**
```
1. 브라우저 A, B 모두 /admin/subscriptions 열기
2. 브라우저 A에서 구독 상태 변경: trial → active (정식 전환)
3. 확인 사항:
   ✅ 브라우저 A: 즉시 상태 배지 변경 (파란색 → 녹색)
   ✅ 브라우저 B: 즉시 동기화 (< 1초)
   ✅ NotificationBell: 새 알림 배지 +1
   ✅ 알림 메시지: "퍼널리의 Pro 플랜이 정식 구독으로 전환되었습니다."
```

**3. 다중 관리자 동기화 테스트**
```
1. 관리자 3명 모두 /admin/subscriptions 열기
2. 관리자 A가 구독 취소 처리
3. 확인 사항:
   ✅ 관리자 B, C 화면에서 즉시 반영
   ✅ 취소된 구독의 배지 색상 변경 (녹색 → 빨간색)
   ✅ "취소" 버튼 사라지고 다른 버튼 표시
```

## 📊 데이터 흐름 상세

### INSERT 이벤트 (신규 구독)

```
1. User: "7일 무료 체험 시작" 클릭
   ↓
2. SubscriptionClient.handleSelectPlan()
   - INSERT company_subscriptions
   - status: 'trial'
   - trial_end: 7일 후
   ↓
3. Database Trigger: on_subscription_change
   - create_subscription_notification() 실행
   - 회사명, 플랜명 조회
   - notification_message 생성
   - INSERT notifications
   ↓
4. Realtime Events (병렬 발생)
   ├─ Event #1: company_subscriptions INSERT
   │  → Admin Subscriptions Page
   │  → Dashboard Subscription Page (filter: company_id)
   │
   └─ Event #2: notifications INSERT
      → NotificationBell
      → Admin Notifications Page
```

### UPDATE 이벤트 (상태 변경)

```
1. Admin: "정식 전환" 버튼 클릭
   ↓
2. handleUpdateStatus('active')
   - PATCH /api/admin/subscriptions/[id]
   - UPDATE company_subscriptions SET status = 'active'
   ↓
3. Database Trigger: on_subscription_change
   - OLD.status = 'trial'
   - NEW.status = 'active'
   - notification_message: "정식 구독으로 전환되었습니다"
   - INSERT notifications
   ↓
4. Realtime Events
   ├─ Event #1: company_subscriptions UPDATE
   │  → Admin Subscriptions (다른 관리자들)
   │  → Dashboard Subscription (해당 회사 사용자)
   │
   └─ Event #2: notifications INSERT
      → NotificationBell (모든 사용자)
      → Admin Notifications
```

## ⚡ 성능 고려사항

### Realtime 이벤트 부하

**예상 트래픽**:
- 구독 생성: 월 100건 → 일 평균 3건
- 구독 상태 변경: 월 50건 → 일 평균 1.6건
- **총 이벤트**: 월 150건 → **매우 낮은 부하**

**최적화 전략**:
1. **필터링**: Dashboard는 `filter: company_id=eq.{id}` 로 불필요한 이벤트 차단
2. **채널 분리**: Admin용 / User용 채널 별도 관리
3. **50ms 지연**: DB 복제 지연 고려
4. **Trigger 효율**: 상태 변경 시에만 알림 생성 (`OLD.status != NEW.status`)

### 데이터베이스 부하

**Trigger 실행**:
- 실행 시간: < 10ms (회사명/플랜명 조회 + INSERT)
- 트랜잭션: AFTER 트리거로 메인 트랜잭션과 분리
- 실패 격리: SECURITY DEFINER로 권한 보장

**알림 테이블 증가**:
- 월 150건 알림 생성
- 연간 1,800건 → 매우 적은 데이터

## 🔒 보안 고려사항

### RLS (Row Level Security)

**Realtime 필터링**:
```sql
-- Dashboard는 자신의 회사 구독만 감지
filter: `company_id=eq.${companyId}`
```

Supabase Realtime은 RLS 정책을 자동 적용:
- 사용자는 자신의 회사 구독만 수신
- Admin은 모든 구독 수신 (is_super_admin=true)

### Trigger 권한

```sql
CREATE FUNCTION create_subscription_notification()
... SECURITY DEFINER;
```

- `SECURITY DEFINER`: 함수를 정의한 소유자 권한으로 실행
- 일반 사용자가 직접 `notifications` INSERT 불가해도 트리거는 실행 가능

## 📚 알림 메시지 전체 목록

### 신규 구독

**체험 시작**:
```
Title: {회사명} - 구독 시작
Message: {회사명}에서 {플랜명} 플랜 체험을 시작했습니다. (7일 무료 체험)
Type: subscription_started
```

**정식 구독 시작**:
```
Title: {회사명} - 구독 시작
Message: {회사명}에서 {플랜명} 플랜 구독을 시작했습니다.
Type: subscription_started
```

### 상태 변경

**정식 전환** (trial → active):
```
Title: {회사명} - 구독 상태 변경
Message: {회사명}의 {플랜명} 플랜이 정식 구독으로 전환되었습니다.
Type: subscription_changed
```

**활성화** (suspended → active):
```
Title: {회사명} - 구독 상태 변경
Message: {회사명}의 {플랜명} 플랜이 활성화되었습니다.
Type: subscription_changed
```

**취소**:
```
Title: {회사명} - 구독 상태 변경
Message: {회사명}의 {플랜명} 플랜 구독이 취소되었습니다.
Type: subscription_changed
```

**정지**:
```
Title: {회사명} - 구독 상태 변경
Message: {회사명}의 {플랜명} 플랜이 정지되었습니다.
Type: subscription_changed
```

**만료**:
```
Title: {회사명} - 구독 상태 변경
Message: {회사명}의 {플랜명} 플랜이 만료되었습니다.
Type: subscription_changed
```

## ✅ 구현 완료 체크리스트

- [x] Realtime Publication 마이그레이션 생성
- [x] 알림 자동 생성 함수 및 트리거 생성
- [x] Admin Subscriptions 페이지 Realtime 구독 추가
- [x] SubscriptionClient Realtime 구독 추가
- [x] Realtime 이벤트 디버깅 로그 추가
- [x] 테스트 스크립트 작성 (test-subscription-notification.mjs)
- [x] 문서화 완료
- [ ] 마이그레이션 실행
- [ ] 신규 구독 생성 테스트
- [ ] 구독 상태 변경 테스트
- [ ] 다중 브라우저 동기화 테스트

## 🚀 배포 순서

### 1. 마이그레이션 실행

```bash
# 로컬 Supabase에서 테스트
supabase db push

# 또는 프로덕션에 직접 실행
psql -h {host} -p {port} -d {db} -U {user} \
  -f supabase/migrations/20251218000000_enable_subscriptions_realtime.sql
```

### 2. 확인

```sql
-- Realtime Publication 확인
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'company_subscriptions';

-- 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_change';

-- 함수 확인
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_subscription_notification';
```

### 3. 테스트

```bash
# 자동 테스트
node scripts/test-subscription-notification.mjs

# 브라우저 테스트
# 1. /admin/subscriptions 열기
# 2. /dashboard/subscription 에서 체험 시작
# 3. 즉시 반영 확인
```

## 🎓 학습 포인트

### Database Trigger 패턴

**장점**:
- 비즈니스 로직을 DB 레벨에서 보장
- 클라이언트가 어디서든 INSERT하면 알림 자동 생성
- API 엔드포인트 코드 중복 제거

**주의사항**:
- 복잡한 로직은 성능 저하 가능
- 디버깅이 어려울 수 있음 (로그 확인 중요)
- 트리거 실패 시 메인 트랜잭션도 롤백

### Realtime Filter

```typescript
// ✅ 좋은 방법 (필요한 것만 수신)
filter: `company_id=eq.${companyId}`

// ❌ 나쁜 방법 (모든 이벤트 수신 후 클라이언트에서 필터)
event: '*'  // without filter
```

### Server Component + Realtime

```typescript
// Server Component (page.tsx)
const currentSubscription = await fetchFromDB()

// Client Component (SubscriptionClient.tsx)
useEffect(() => {
  supabase.on(..., () => {
    router.refresh()  // Server Component 재조회
  })
}, [])
```

## 🔧 트러블슈팅

### 문제: 알림이 자동 생성되지 않음

**확인 사항**:
1. 트리거가 활성화되어 있는지 확인
2. 함수 권한 (`SECURITY DEFINER`)
3. PostgreSQL 로그 확인

**해결**:
```sql
-- 트리거 재생성
DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;
CREATE TRIGGER on_subscription_change ...
```

### 문제: Realtime 이벤트가 안 옴

**확인 사항**:
1. Publication 설정 확인
2. 브라우저 콘솔에서 WebSocket 연결 확인
3. RLS 정책 확인

**해결**:
```sql
-- Publication 확인 및 재추가
ALTER PUBLICATION supabase_realtime DROP TABLE company_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;
```

### 문제: Dashboard에서 router.refresh() 안 됨

**확인 사항**:
1. `'use client'` 지시어 확인
2. `useRouter`가 `next/navigation`에서 import되었는지 확인
3. Server Component가 비동기 데이터 fetch하는지 확인

## 📖 참고 자료

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js router.refresh()](https://nextjs.org/docs/app/api-reference/functions/use-router#userouter)
