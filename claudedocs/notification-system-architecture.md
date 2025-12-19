# Notification System Architecture

## Overview

실시간 알림 시스템은 구독 변경사항을 자동으로 감지하고 슈퍼어드민에게 알려주는 기능입니다.

## System Components

### 1. Database Layer

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Subscription Trigger
**Location**: Database function `create_subscription_notification()`

**Trigger Events**:
- INSERT: 새로운 구독 시작
- UPDATE: 구독 변경 (status, plan_id, billing_cycle)

**Detection Logic**:
```sql
-- Status 변경 감지
IF OLD.status != NEW.status THEN
  -- 구독 상태 변경 알림 생성

-- Plan 변경 감지
ELSIF OLD.plan_id != NEW.plan_id THEN
  -- 플랜 변경 알림 생성

-- Billing cycle 변경 감지
ELSIF OLD.billing_cycle != NEW.billing_cycle THEN
  -- 결제 주기 변경 알림 생성
END IF;
```

**Notification Types**:
- `subscription_started`: 새 구독 시작
- `subscription_changed`: 구독 변경 (status/plan/billing)

### 2. Realtime Layer

#### Supabase Realtime Configuration
**Publication**: `supabase_realtime`
**Table**: `notifications`
**Events**: INSERT, UPDATE, DELETE

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 3. Frontend Components

#### NotificationBell Component
**Location**: `src/app/admin/components/NotificationBell.tsx`

**Update Mechanisms** (Hybrid Approach):

1. **Primary: Supabase Realtime**
   - Channel: `notifications-bell`
   - Events: All postgres_changes on notifications table
   - Behavior: Immediately fetches server count on any change

2. **Backup: Polling**
   - Interval: 10 seconds
   - Behavior: Regularly fetches server count
   - Purpose: Ensures updates even if Realtime fails

**State Management**:
```typescript
const [unreadCount, setUnreadCount] = useState(0)

async function fetchUnreadCount() {
  const response = await fetch('/api/admin/notifications?unread_only=true&limit=1')
  const data = await response.json()
  setUnreadCount(data.unreadCount || 0)
}
```

**Realtime Subscription**:
```typescript
const channel = supabase
  .channel('notifications-bell')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
  }, (payload) => {
    console.log('🔔 [NotificationBell] Realtime notification change:', payload)
    fetchUnreadCount() // ✅ Always fetch from server
  })
  .subscribe()
```

#### Notifications Page
**Location**: `src/app/admin/notifications/page.tsx`

**Features**:
- 알림 목록 표시 (최신순)
- 읽음/읽지 않음 표시
- 알림 타입별 아이콘/색상/라벨
- 읽음 처리 기능
- 실시간 업데이트 (Realtime subscription)

**Notification Type Mappings**:
```typescript
import { CreditCard } from 'lucide-react'

const TYPE_ICONS = {
  subscription_started: CreditCard,
  subscription_changed: CreditCard,
}

const TYPE_COLORS = {
  subscription_started: 'text-indigo-600 bg-indigo-50',
  subscription_changed: 'text-indigo-600 bg-indigo-50',
}

const TYPE_LABELS = {
  subscription_started: '구독 시작',
  subscription_changed: '구독 변경',
}
```

### 4. API Layer

#### GET /api/admin/notifications
**Query Parameters**:
- `unread_only=true`: 읽지 않은 알림만 반환
- `limit=N`: 최대 N개 반환

**Response**:
```json
{
  "notifications": [...],
  "unreadCount": 5,
  "total": 20
}
```

## Data Flow

### Subscription Change Flow

```
[User changes subscription at /dashboard/subscription]
           ↓
[Database UPDATE on company_subscriptions]
           ↓
[PostgreSQL Trigger: on_subscription_change]
           ↓
[Function: create_subscription_notification()]
           ↓
[INSERT into notifications table]
           ↓
[Supabase Realtime broadcasts INSERT event]
           ↓
┌─────────────────────────┬────────────────────────┐
│                         │                        │
[NotificationBell]  [Notifications Page]
│ Realtime listener │ Realtime listener          │
│ Polling (10s)     │                            │
└─────────────────────────┴────────────────────────┘
           ↓                        ↓
[fetchUnreadCount()]    [Refresh notification list]
           ↓                        ↓
[API: /api/admin/notifications?unread_only=true]
           ↓
[Badge shows updated count]
```

### Mark as Read Flow

```
[User clicks notification in /admin/notifications]
           ↓
[Frontend: markAsRead(id)]
           ↓
[Database UPDATE: is_read = true]
           ↓
[Supabase Realtime broadcasts UPDATE event]
           ↓
┌─────────────────────────┬────────────────────────┐
│                         │                        │
[NotificationBell]  [Notifications Page]
│ Realtime listener │ Realtime listener          │
│ Polling (10s)     │                            │
└─────────────────────────┴────────────────────────┘
           ↓                        ↓
[fetchUnreadCount()]    [Update UI: show as read]
           ↓
[Badge decrements by 1]
```

## Debugging Tools

### Test Scripts

#### 1. test-realtime-notification-insert.mjs
**Purpose**: INSERT 이벤트 Realtime 전파 테스트

**Usage**:
```bash
node scripts/test-realtime-notification-insert.mjs
```

**Expected**:
- 테스트 알림 생성
- NotificationBell 배지 +1
- 5초 후 자동 삭제

#### 2. test-notification-bell-update.mjs
**Purpose**: NotificationBell 업데이트 메커니즘 전체 테스트

**Usage**:
```bash
node scripts/test-notification-bell-update.mjs
```

**Test Flow**:
1. 현재 읽지 않은 알림 개수 확인
2. 테스트 알림 생성 (unread)
3. 12초 대기 → 배지 확인 (Realtime/Polling)
4. 알림 읽음 처리
5. 12초 대기 → 배지 확인 (UPDATE 감지)
6. 테스트 알림 삭제

**Diagnosis Checklist**:
- [ ] Badge showed +1 after create → INSERT 감지 작동
- [ ] Badge showed -1 after read → UPDATE 감지 작동
- [ ] Console shows polling logs every 10s
- [ ] Console shows Realtime event logs

#### 3. check-funnelly-subscription.mjs
**Purpose**: 퍼널리 구독 상태 및 알림 히스토리 확인

**Usage**:
```bash
node scripts/check-funnelly-subscription.mjs
```

**Output**:
- 퍼널리 회사 정보
- 현재 구독 상태 (플랜, status, billing_cycle)
- 관련 알림 히스토리
- Diagnosis: 왜 알림이 생성되지 않았는지 분석

#### 4. debug-subscription-trigger.mjs
**Purpose**: 트리거 설치 및 작동 여부 확인

**Usage**:
```bash
node scripts/debug-subscription-trigger.mjs
```

**Checks**:
- Trigger existence: `on_subscription_change`
- Function existence: `create_subscription_notification()`
- Realtime publication includes notifications table

## Known Issues & Solutions

### Issue 1: Trigger Not Creating Notifications

**Symptom**: 구독 변경해도 알림 생성 안 됨

**Diagnosis**:
1. 트리거 설치 확인: `node scripts/debug-subscription-trigger.mjs`
2. 실제 작동 테스트: `node scripts/check-trigger-direct.mjs`

**Solution**:
Migration SQL 직접 실행:
```sql
-- Step 1: Create function
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
-- [function body]
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger
DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();
```

### Issue 2: Trigger Only Fires on Status Changes

**Symptom**: 플랜 변경 시 알림 생성 안 됨

**Root Cause**: 원래 트리거 조건이 `OLD.status != NEW.status`만 체크

**Solution**: `fix-trigger-condition.sql` 실행
- Status 변경 감지
- Plan ID 변경 감지
- Billing cycle 변경 감지

### Issue 3: NotificationBell Badge Not Updating in Real-time

**Symptom**:
- 알림 읽음 처리해도 배지 숫자 안 바뀜
- 새로고침해야 업데이트됨
- Realtime SUBSCRIBED는 성공하지만 UPDATE 이벤트 안 옴

**Solution**: Hybrid approach implemented
1. **Primary**: Supabase Realtime (즉시 반영)
2. **Backup**: 10초 폴링 (최대 10초 지연)

**Expected Behavior**:
- Realtime 작동 시: 즉시 업데이트
- Realtime 실패 시: 10초 이내 업데이트
- 최악의 경우에도 10초 이내 동기화 보장

## Testing Procedure

### Complete System Test

1. **브라우저 준비**
   ```
   - /admin/dashboard 페이지 열기 (NotificationBell 표시됨)
   - /admin/notifications 페이지 열기 (새 탭)
   - 브라우저 콘솔 열기 (로그 확인용)
   ```

2. **초기 상태 확인**
   ```bash
   node scripts/test-notification-bell-update.mjs
   ```

   **Expected Console Logs**:
   ```
   ✅ [NotificationBell] Successfully subscribed to notifications table
   ⏰ [NotificationBell] Polling unread count... (every 10s)
   ```

3. **INSERT 테스트**
   - Script가 테스트 알림 생성
   - 12초 대기
   - **Check**: 배지 숫자 +1 증가했는지 확인

4. **UPDATE 테스트**
   - Script가 알림 읽음 처리
   - 12초 대기
   - **Check**: 배지 숫자 -1 감소했는지 확인

5. **실제 구독 변경 테스트**
   ```
   - /dashboard/subscription 페이지 열기
   - 플랜 또는 결제 주기 변경
   - /admin/notifications에서 새 알림 확인
   - NotificationBell 배지 업데이트 확인 (10초 이내)
   ```

### Diagnosis Guide

**Polling만 작동하는 경우** (Realtime 로그 없음):
- ✅ 배지는 10초마다 업데이트됨 (정상 동작)
- ⚠️ Realtime 최적화 필요 (선택사항)
- 💡 현재 상태로 사용 가능

**Polling도 안 되는 경우**:
- ❌ API 응답 확인: `/api/admin/notifications?unread_only=true&limit=1`
- ❌ Network 탭에서 API 호출 확인
- ❌ Console 에러 로그 확인

**Trigger가 안 되는 경우**:
- ❌ `node scripts/debug-subscription-trigger.mjs` 실행
- ❌ Trigger 재설치 필요

## Performance Considerations

### Polling Interval
- **Current**: 10 seconds
- **Trade-off**: 더 짧게 = 더 실시간 / 더 많은 서버 부하
- **Recommendation**: 10초가 적절 (UX와 성능 균형)

### Realtime Connection
- **Optimization**: Channel 이름 중복 방지
  - NotificationBell: `notifications-bell`
  - Notifications Page: `notifications-page`
- **Why**: 같은 channel 이름 사용 시 이벤트 중복 가능

### Database Query
- **Optimization**: `unread_only=true&limit=1`로 최소 데이터만 fetch
- **Index**: `notifications(is_read)` 인덱스 권장

## Future Improvements

1. **Realtime 디버깅 강화**
   - Realtime UPDATE 이벤트가 왜 안 오는지 추가 조사
   - Supabase Dashboard에서 Realtime 로그 확인

2. **Push Notifications**
   - 브라우저 알림 (Web Push API)
   - 모바일 푸시 알림

3. **알림 카테고리 확장**
   - 사용자 활동 알림
   - 시스템 알림
   - 결제 알림

4. **알림 필터링**
   - 타입별 필터
   - 읽음/읽지 않음 필터
   - 날짜 범위 필터

5. **성능 최적화**
   - Polling interval 동적 조정
   - Idle 상태에서 polling 중지
   - Visibility API 활용
