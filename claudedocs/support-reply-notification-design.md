# 기술지원 답변 알림 시스템 설계

## 개요

어드민이 기술지원 티켓에 답변하면 티켓 작성자(일반 사용자)에게 실시간 알림을 전달하는 시스템.

## 요구사항 분석

### 기능 요구사항
1. **어드민 답변 시 알림 생성**: 어드민이 티켓에 메시지를 추가하면 자동으로 알림 생성
2. **사용자별 알림**: 티켓을 작성한 사용자에게만 알림 전달
3. **실시간 알림**: Supabase Realtime을 통한 즉시 알림 전달
4. **알림 표시**: 헤더 벨 아이콘에 읽지 않은 알림 개수 표시
5. **알림 읽음 처리**: 사용자가 티켓 상세 페이지 방문 시 자동 읽음 처리
6. **내부 메모 제외**: 어드민 전용 내부 메모(is_internal_note=true)는 알림 생성하지 않음

### 비기능 요구사항
1. **성능**: 알림 생성은 1초 이내 처리
2. **확장성**: 기존 notifications 테이블 재사용
3. **일관성**: 기존 구독 알림 시스템과 동일한 패턴 사용
4. **신뢰성**: Realtime 실패 시 폴링으로 백업

---

## 시스템 아키텍처

### 1. Database Layer

#### 기존 Notifications 테이블 활용
```sql
-- 기존 테이블 (변경 없음)
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),  -- 알림 수신자 (티켓 작성자)
  company_id UUID REFERENCES companies(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'support_reply' 타입 추가
  metadata JSONB,  -- { ticket_id, message_id, admin_name }
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**새로운 알림 타입**: `support_reply`

**메타데이터 구조**:
```json
{
  "ticket_id": "uuid",
  "message_id": "uuid",
  "admin_name": "관리자 이름",
  "ticket_subject": "티켓 제목"
}
```

#### Database Trigger 구현
```sql
-- Function: 기술지원 답변 시 알림 생성
CREATE OR REPLACE FUNCTION create_support_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
  v_admin_name TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- 내부 메모는 알림 생성하지 않음
  IF NEW.is_internal_note = true THEN
    RETURN NEW;
  END IF;

  -- 티켓 정보 조회
  SELECT * INTO v_ticket
  FROM support_tickets
  WHERE id = NEW.ticket_id;

  -- 메시지 작성자가 어드민인지 확인
  SELECT is_super_admin INTO v_is_admin
  FROM users
  WHERE id = NEW.user_id;

  -- 어드민이 작성한 메시지만 알림 생성
  IF v_is_admin = true AND v_ticket.created_by_user_id IS NOT NULL THEN
    -- 어드민 이름 조회
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = NEW.user_id;

    -- 알림 생성 (티켓 작성자에게)
    INSERT INTO notifications (
      user_id,
      company_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      v_ticket.created_by_user_id,  -- 티켓 작성자
      v_ticket.company_id,
      '기술지원 답변',
      v_admin_name || '님이 "' || v_ticket.subject || '" 티켓에 답변했습니다.',
      'support_reply',
      jsonb_build_object(
        'ticket_id', v_ticket.id,
        'message_id', NEW.id,
        'admin_name', v_admin_name,
        'ticket_subject', v_ticket.subject
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: 메시지 INSERT 시 알림 생성
DROP TRIGGER IF EXISTS on_support_message_insert ON support_ticket_messages;
CREATE TRIGGER on_support_message_insert
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_support_reply_notification();
```

**트리거 동작 조건**:
1. ✅ `is_internal_note = false` (고객에게 보이는 메시지만)
2. ✅ 메시지 작성자가 `is_super_admin = true` (어드민만)
3. ✅ 티켓에 `created_by_user_id` 존재 (티켓 작성자가 있는 경우만)

---

### 2. Realtime Layer

#### Supabase Realtime 설정

**기존 설정 활용**:
```sql
-- notifications 테이블은 이미 realtime publication에 포함되어 있음
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Realtime 이벤트**:
- `INSERT`: 새 알림 생성 시
- `UPDATE`: 알림 읽음 처리 시

---

### 3. Frontend Components

#### 3.1 NotificationBell Component (일반 사용자용)

**위치**: `src/components/shared/NotificationBell.tsx`

**기능**:
- 읽지 않은 알림 개수 표시
- Realtime 구독 + 폴링 백업
- 클릭 시 알림 목록 페이지로 이동

**구현**:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  // 읽지 않은 알림 개수 조회
  async function fetchUnreadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }

  useEffect(() => {
    // 초기 로드
    fetchUnreadCount()

    // Realtime 구독
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        console.log('🔔 Notification change detected')
        fetchUnreadCount()
      })
      .subscribe()

    // 폴링 백업 (10초마다)
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [userId])

  return (
    <Link href="/dashboard/notifications" className="relative">
      <BellIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
```

#### 3.2 Notifications Page (일반 사용자용)

**위치**: `src/app/dashboard/notifications/page.tsx`

**기능**:
- 사용자의 모든 알림 목록 표시
- 알림 타입별 아이콘/색상/라벨
- 클릭 시 해당 티켓 페이지로 이동 + 읽음 처리
- 실시간 업데이트

**구현**:
```typescript
import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const userProfile = await getCachedUserProfile(user.id)
  if (!userProfile) return <div>사용자 정보를 불러올 수 없습니다.</div>

  // 사용자의 알림 조회
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">알림</h1>
      </div>

      <NotificationsClient
        notifications={notifications || []}
        userId={user.id}
      />
    </div>
  )
}
```

**NotificationsClient.tsx**:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils/date'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  metadata: any
  is_read: boolean
  created_at: string
}

const TYPE_CONFIG = {
  support_reply: {
    icon: BellIcon,
    color: 'text-blue-600 bg-blue-50',
    label: '기술지원 답변',
  },
  subscription_started: {
    icon: CheckIcon,
    color: 'text-green-600 bg-green-50',
    label: '구독 시작',
  },
  subscription_changed: {
    icon: CheckIcon,
    color: 'text-indigo-600 bg-indigo-50',
    label: '구독 변경',
  },
}

export default function NotificationsClient({
  notifications: initialNotifications,
  userId,
}: {
  notifications: Notification[]
  userId: string
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const router = useRouter()
  const supabase = createClient()

  // Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel('notifications-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        console.log('🔔 Notification update:', payload)

        if (payload.eventType === 'INSERT') {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new as Notification : n))
          )
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  // 알림 클릭 처리
  const handleNotificationClick = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)
    }

    // 티켓 페이지로 이동
    if (notification.type === 'support_reply' && notification.metadata?.ticket_id) {
      router.push(`/dashboard/support/${notification.metadata.ticket_id}`)
    }
  }

  return (
    <div className="space-y-2">
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          알림이 없습니다.
        </div>
      ) : (
        notifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.support_reply
          const Icon = config.icon

          return (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                notification.is_read
                  ? 'bg-white hover:bg-gray-50'
                  : 'bg-blue-50 hover:bg-blue-100 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {notification.message}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex-shrink-0">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
```

#### 3.3 Header 통합

**위치**: `src/components/layout/DashboardHeader.tsx` (기존 파일 수정)

```typescript
import NotificationBell from '@/components/shared/NotificationBell'

export default function DashboardHeader({ user }: { user: any }) {
  return (
    <header className="...">
      {/* 기존 코드 */}

      {/* 알림 벨 추가 */}
      <NotificationBell userId={user.id} />

      {/* 기존 사용자 메뉴 등 */}
    </header>
  )
}
```

---

### 4. Data Flow

#### 4.1 알림 생성 Flow

```
[Admin writes reply at /admin/support/[id]]
           ↓
[API: POST /api/admin/support/tickets/[id]/messages]
           ↓
[INSERT into support_ticket_messages]
           ↓
[PostgreSQL Trigger: on_support_message_insert]
           ↓
[Function: create_support_reply_notification()]
           ↓
[Check: is_internal_note = false?]
           ↓ YES
[Check: user is_super_admin = true?]
           ↓ YES
[INSERT into notifications table]
    - user_id: ticket.created_by_user_id
    - type: 'support_reply'
    - metadata: { ticket_id, message_id, admin_name }
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
[Badge shows +1]    [New notification appears at top]
```

#### 4.2 알림 읽음 처리 Flow

```
[User clicks notification]
           ↓
[NotificationsClient: handleNotificationClick()]
           ↓
[UPDATE notifications SET is_read = true WHERE id = ?]
           ↓
[Navigate to /dashboard/support/[ticket_id]]
           ↓
[Supabase Realtime broadcasts UPDATE event]
           ↓
┌─────────────────────────┬────────────────────────┐
│                         │                        │
[NotificationBell]  [Notifications Page]
│ Realtime listener │ Realtime listener          │
└─────────────────────────┴────────────────────────┘
           ↓                        ↓
[Badge decrements -1]    [Notification shows as read]
```

---

## Migration Plan

### Phase 1: Database Setup

**Migration File**: `supabase/migrations/YYYYMMDD_support_reply_notifications.sql`

```sql
-- 1. Add user_id column to notifications table (if not exists)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Create index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read, created_at DESC);

-- 3. Create function for support reply notifications
CREATE OR REPLACE FUNCTION create_support_reply_notification()
RETURNS TRIGGER AS $$
-- [Function body from above]
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
DROP TRIGGER IF EXISTS on_support_message_insert ON support_ticket_messages;
CREATE TRIGGER on_support_message_insert
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_support_reply_notification();

-- 5. Enable realtime for notifications (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 6. Add RLS policy for user notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Phase 2: Frontend Implementation

1. **Create NotificationBell component** (`src/components/shared/NotificationBell.tsx`)
2. **Create NotificationsClient component** (`src/app/dashboard/notifications/NotificationsClient.tsx`)
3. **Create Notifications page** (`src/app/dashboard/notifications/page.tsx`)
4. **Update DashboardHeader** to include NotificationBell
5. **Add route** to Next.js app router

### Phase 3: Testing

**Test Cases**:

1. **Trigger Test**:
   ```sql
   -- Test notification creation
   INSERT INTO support_ticket_messages (ticket_id, user_id, message, is_internal_note)
   VALUES (
     '[existing_ticket_id]',
     '[admin_user_id]',
     'Test reply from admin',
     false
   );

   -- Verify notification created
   SELECT * FROM notifications WHERE type = 'support_reply' ORDER BY created_at DESC LIMIT 1;
   ```

2. **Realtime Test**:
   - Admin: /admin/support/[id]에서 답변 작성
   - User: /dashboard 페이지에서 벨 아이콘 확인
   - Expected: 10초 이내 배지 숫자 +1

3. **Read Test**:
   - User: 알림 클릭 → 티켓 페이지 이동
   - Expected: 배지 숫자 -1, 알림 회색으로 표시

4. **Internal Note Test**:
   - Admin: 내부 메모 작성 (is_internal_note=true)
   - Expected: 알림 생성되지 않음

---

## Performance Considerations

### Database
- **Index**: `idx_notifications_user_unread` (user_id, is_read, created_at)
- **Query Optimization**: `SELECT count(*)` 대신 `SELECT 1 LIMIT 1` 사용

### Realtime
- **Channel Naming**: 중복 방지를 위해 고유한 채널명 사용
  - NotificationBell: `user-notifications`
  - Notifications Page: `notifications-list`

### Polling
- **Interval**: 10초 (UX와 서버 부하 균형)
- **Optimization**: Visibility API로 탭 비활성화 시 polling 중지 가능

---

## Security Considerations

### RLS Policies
- ✅ 사용자는 자신의 알림만 조회 가능
- ✅ 사용자는 자신의 알림만 수정 가능 (읽음 처리)
- ✅ 알림 생성은 SECURITY DEFINER 함수에서만

### Trigger Security
- ✅ 내부 메모는 알림 생성하지 않음
- ✅ 어드민이 작성한 메시지만 알림 생성
- ✅ 티켓 작성자에게만 알림 전달

---

## Future Enhancements

1. **이메일 알림**: 중요 알림 발생 시 이메일 전송
2. **푸시 알림**: 브라우저 Web Push API 활용
3. **알림 그룹화**: 같은 티켓의 여러 답변을 하나로 그룹화
4. **알림 설정**: 사용자가 알림 타입별로 on/off 설정
5. **알림 필터**: 읽음/안 읽음, 타입별 필터링
6. **일괄 읽음 처리**: 모든 알림 읽음 처리 버튼
7. **알림 삭제**: 사용자가 개별 알림 삭제 기능

---

## Implementation Checklist

### Database
- [ ] Migration 파일 작성 및 실행
- [ ] Trigger 함수 테스트
- [ ] RLS 정책 테스트
- [ ] Index 생성 확인

### Frontend
- [ ] NotificationBell 컴포넌트 구현
- [ ] NotificationsClient 컴포넌트 구현
- [ ] Notifications 페이지 구현
- [ ] DashboardHeader 통합
- [ ] Realtime 구독 테스트
- [ ] 폴링 백업 테스트

### Testing
- [ ] 단위 테스트: Trigger 함수
- [ ] 통합 테스트: 알림 생성 flow
- [ ] E2E 테스트: 사용자 경험 flow
- [ ] 성능 테스트: Realtime latency
- [ ] 보안 테스트: RLS 정책

### Documentation
- [ ] API 문서 업데이트
- [ ] 사용자 가이드 작성
- [ ] 어드민 가이드 작성

---

## API Specifications

### GET /api/notifications

**Query Parameters**:
- `unread_only=true`: 읽지 않은 알림만 반환
- `limit=N`: 최대 N개 반환
- `type=support_reply`: 특정 타입만 필터링

**Response**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "기술지원 답변",
      "message": "관리자님이 \"티켓 제목\" 티켓에 답변했습니다.",
      "type": "support_reply",
      "metadata": {
        "ticket_id": "uuid",
        "message_id": "uuid",
        "admin_name": "관리자",
        "ticket_subject": "티켓 제목"
      },
      "is_read": false,
      "created_at": "2025-12-23T10:00:00Z"
    }
  ],
  "unreadCount": 5,
  "total": 20
}
```

### PATCH /api/notifications/[id]

**Request Body**:
```json
{
  "is_read": true
}
```

**Response**:
```json
{
  "success": true,
  "notification": { /* updated notification */ }
}
```

### PATCH /api/notifications/mark-all-read

**Response**:
```json
{
  "success": true,
  "updated_count": 5
}
```
