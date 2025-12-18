# Admin Notifications Page - API 구현 완료

## 🎯 문제 원인

**API 엔드포인트 미구현** - `/api/admin/notifications` API 파일이 존재하지 않아 404 에러 발생

## 🔍 문제 상세

### 에러 로그
```
GET /api/admin/notifications?unread_only=true&limit=1 404 in 14ms
Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 원인 분석
1. 프론트엔드 페이지: `/app/admin/notifications/page.tsx` ✅ 존재
2. 프론트엔드 컴포넌트: `NotificationBell.tsx` ✅ 존재
3. **API 엔드포인트**: `/app/api/admin/notifications/route.ts` ❌ **존재하지 않음**
4. 데이터베이스 테이블: `notifications` ✅ 존재 (마이그레이션 완료)

**결론**: API 파일만 없어서 404 에러 발생

## ✅ 해결 방법

### 구현된 API 엔드포인트

**1. GET /api/admin/notifications**
[src/app/api/admin/notifications/route.ts](src/app/api/admin/notifications/route.ts)

기능:
- 알림 목록 조회 (페이지네이션)
- 읽지 않은 알림만 필터링 (`unread_only=true`)
- 총 알림 개수 및 읽지 않은 알림 개수 반환

쿼리 파라미터:
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 개수 (기본값: 20, 최대: 100)
- `unread_only`: 읽지 않은 알림만 조회 (true/false)

응답 형식:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_lead|status_change|goal_achieved|report_ready|user_activity",
      "title": "알림 제목",
      "message": "알림 메시지",
      "data": {
        "company_id": "uuid",
        "campaign_id": "uuid"
      },
      "read": false,
      "read_at": null,
      "sent_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "unreadCount": 25
}
```

**2. POST /api/admin/notifications/mark-read**
[src/app/api/admin/notifications/mark-read/route.ts](src/app/api/admin/notifications/mark-read/route.ts)

기능:
- 여러 알림을 한번에 읽음 처리
- 배열로 알림 ID를 받아 일괄 처리

요청 형식:
```json
{
  "notificationIds": ["uuid1", "uuid2", "uuid3"]
}
```

응답 형식:
```json
{
  "success": true,
  "markedCount": 3
}
```

### 데이터베이스 스키마

[supabase/migrations/20250203200000_create_notifications_table.sql](supabase/migrations/20250203200000_create_notifications_table.sql)

테이블: `notifications`
- `id`: UUID (PK)
- `company_id`: UUID (FK → companies)
- `title`: TEXT (알림 제목)
- `message`: TEXT (알림 내용)
- `type`: TEXT (알림 유형)
- `campaign_id`: UUID (FK → campaigns, nullable)
- `is_read`: BOOLEAN (읽음 여부)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

인덱스:
- `idx_notifications_company_id`
- `idx_notifications_is_read`
- `idx_notifications_created_at`

RLS 정책:
- 사용자는 자신의 회사 알림만 조회/수정 가능
- Service Role만 알림 생성 가능

## 📊 테스트 결과

### 데이터베이스 상태 (초기)
```
Total notifications: 0
Unread notifications: 0
```

### 테스트 데이터 생성
```bash
node scripts/create-test-notifications.mjs
```

생성된 테스트 알림 (5개):
1. ✅ 신규 리드가 등록되었습니다 (new_lead, 읽지 않음)
2. ✅ 캠페인 상태가 변경되었습니다 (status_change, 읽지 않음)
3. ✅ 월간 목표를 달성했습니다 (goal_achieved, 읽음)
4. ✅ 월간 리포트가 준비되었습니다 (report_ready, 읽지 않음)
5. ✅ 새로운 사용자가 추가되었습니다 (user_activity, 읽음)

### 최종 상태
```
📊 Summary:
   Total notifications: 5
   Unread notifications: 3
   Read notifications: 2
```

## 📝 관련 파일

### 새로 생성된 파일
1. [src/app/api/admin/notifications/route.ts](src/app/api/admin/notifications/route.ts)
   - GET 엔드포인트: 알림 목록 조회

2. [src/app/api/admin/notifications/mark-read/route.ts](src/app/api/admin/notifications/mark-read/route.ts)
   - POST 엔드포인트: 읽음 처리

3. [scripts/check-notifications-data.mjs](scripts/check-notifications-data.mjs)
   - 알림 데이터 확인 스크립트

4. [scripts/create-test-notifications.mjs](scripts/create-test-notifications.mjs)
   - 테스트 알림 생성 스크립트

### 기존 파일 (수정 없음)
- [src/app/admin/notifications/page.tsx](src/app/admin/notifications/page.tsx) - 프론트엔드 페이지
- [src/app/admin/components/NotificationBell.tsx](src/app/admin/components/NotificationBell.tsx) - 알림 벨 컴포넌트
- [supabase/migrations/20250203200000_create_notifications_table.sql](supabase/migrations/20250203200000_create_notifications_table.sql) - DB 스키마

## 💡 구현 패턴

### 이전 Companies API와 동일한 패턴 적용
1. **인증**: `getSuperAdminUser()` 사용
2. **페이지네이션**: page/limit/offset 구조
3. **필터링**: 쿼리 파라미터로 조건 제어
4. **에러 처리**: try-catch 및 적절한 HTTP 상태 코드
5. **Service Role Key**: RLS 우회하여 모든 데이터 접근

### 프론트엔드 - API 계약
프론트엔드는 다음 필드를 기대:
- `read` (API에서 `is_read`를 변환)
- `read_at` (DB에 없는 필드, null 반환)
- `sent_at` (API에서 `created_at`를 변환)
- `data` (company_id, campaign_id를 객체로 포장)

## 🧪 테스트 방법

### 1. 브라우저 테스트
```
http://localhost:3001/admin/notifications
```

확인 사항:
- ✅ 알림 목록이 5개 표시되는지
- ✅ 읽지 않은 알림 배지가 3으로 표시되는지
- ✅ 필터 (전체/읽지 않음) 동작 확인
- ✅ "읽음 처리" 버튼 클릭 후 상태 업데이트 확인
- ✅ "모두 읽음 처리" 버튼 동작 확인

### 2. 알림 벨 테스트
레이아웃의 NotificationBell 컴포넌트:
- ✅ 읽지 않은 알림 개수 표시 (빨간 배지)
- ✅ 30초마다 자동 업데이트
- ✅ 클릭 시 알림 페이지로 이동

### 3. API 직접 테스트
```bash
# 알림 목록 조회 (브라우저에서 로그인 필요)
curl http://localhost:3001/api/admin/notifications?page=1&limit=20

# 읽지 않은 알림만 조회
curl http://localhost:3001/api/admin/notifications?unread_only=true&limit=1
```

## ✨ 구현 완료 기능

이번 작업으로 완성된 기능:
1. ✅ 알림 목록 조회 (페이지네이션)
2. ✅ 읽지 않은 알림 필터링
3. ✅ 알림 읽음 처리 (개별/일괄)
4. ✅ 읽지 않은 알림 개수 표시
5. ✅ 알림 유형별 아이콘 및 색상 표시
6. ✅ 실시간 알림 개수 업데이트 (30초 간격)
7. ✅ 통계 카드 (전체/읽지 않음/읽음)
8. ✅ 테스트 데이터 생성 스크립트

## 🔄 다음 단계 (선택사항)

현재 알림은 수동으로 생성해야 합니다. 향후 개선 사항:

1. **자동 알림 생성**
   - 신규 리드 등록 시 알림 생성
   - 캠페인 상태 변경 시 알림 생성
   - 목표 달성 시 알림 생성

2. **실시간 알림**
   - Supabase Realtime 활용
   - 브라우저 푸시 알림

3. **알림 설정**
   - 사용자별 알림 수신 설정
   - 알림 유형별 on/off

4. **알림 삭제**
   - 읽은 알림 삭제 기능
   - 일괄 삭제 기능
