# 트리거 미설치 문제 요약

**날짜**: 2025-12-18
**문제**: 구독 변경 알림이 생성되지 않음
**원인**: 데이터베이스 트리거가 실제로 설치되지 않음
**상태**: 해결 방법 제시 완료

## 문제 상황

사용자 보고:
> "supabase/migrations/20251218000000_enable_subscriptions_realtime.sql 파일을 이미 실행했는데도 안나오고 있어."

실제 상황:
- ❌ 트리거 `on_subscription_change`: 데이터베이스에 없음
- ❌ 함수 `create_subscription_notification()`: 데이터베이스에 없음
- ❌ 구독 알림: 0개 (구독은 3개 존재)
- ✅ 테스트 알림: 5개 (정상 작동)

## 검증 결과

### 테스트 1: 트리거 존재 확인
```bash
node scripts/debug-subscription-trigger.mjs
```

**결과**:
```
❌ Trigger NOT FOUND in database
→ Migration was not applied successfully
```

### 테스트 2: 수동 트리거 테스트
```bash
node scripts/check-trigger-direct.mjs
```

**결과**:
```
Notifications before: 5
Performing test update...
Notifications after: 5

❌ TRIGGER NOT WORKING
→ No notification was created after subscription update
```

## 원인 분석

**가능한 원인**:

1. **SQL 파일을 실행했지만 성공하지 않았을 가능성**:
   - 권한 문제로 실패
   - 부분 실행으로 일부만 적용
   - 에러 메시지를 놓쳤을 가능성

2. **잘못된 방법으로 실행했을 가능성**:
   - 로컬 환경에서 실행 (프로덕션 DB에 적용 안됨)
   - CLI 도구 사용 시 연결 실패
   - 다른 데이터베이스에 실행

3. **실행 위치 문제**:
   - 파일을 열어봤지만 실제로 실행하지 않았을 가능성
   - SQL Editor가 아닌 다른 곳에서 실행 시도

## 해결 방법

### 올바른 실행 방법 (Supabase Dashboard)

**1단계**: Supabase Dashboard SQL Editor 접속
```
https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql
```

**2단계**: "New query" 클릭

**3단계**: 마이그레이션 파일 전체 내용 복사
- 파일: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`
- **중요**: 136줄 전체를 복사해야 함

**4단계**: SQL Editor에 붙여넣기 및 실행
- "Run" 버튼 클릭
- 성공 메시지 확인

**5단계**: 검증
```sql
-- 트리거 확인
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_subscription_change';

-- 함수 확인
SELECT proname
FROM pg_proc
WHERE proname = 'create_subscription_notification';
```

### 대안: 직접 데이터베이스 연결 (고급)

**psql 사용** (psql이 설치된 경우):
```bash
PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -d postgres \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -f supabase/migrations/20251218000000_enable_subscriptions_realtime.sql
```

**Supabase CLI 사용**:
```bash
npx supabase db push --linked
```

## 검증 방법

### 자동 검증 스크립트

```bash
# 전체 시스템 점검
node scripts/debug-subscription-trigger.mjs

# 트리거 작동 테스트
node scripts/check-trigger-direct.mjs
```

### 수동 검증

**1. 트리거 존재 확인** (Supabase Dashboard SQL Editor):
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_subscription_change';
```

**예상 결과**: 1개 행 (트리거 정보)

**2. 실제 테스트**:
1. `/dashboard/subscription` 페이지에서 플랜 변경
2. `/admin/notifications` 페이지 확인
3. 새 알림 생성 확인

## 완료 후 기대 결과

### 데이터베이스 상태
- ✅ 트리거 `on_subscription_change` 설치
- ✅ 함수 `create_subscription_notification()` 생성
- ✅ Realtime publication에 `company_subscriptions` 추가

### 동작 흐름
```
사용자가 플랜 변경
   ↓
company_subscriptions UPDATE
   ↓
트리거 on_subscription_change 발동
   ↓
create_subscription_notification() 실행
   ↓
notifications 테이블에 INSERT
   ↓
Realtime 브로드캐스트
   ↓
NotificationBell 컴포넌트 업데이트
   ↓
어드민 알림 센터에 표시
```

### 알림 예시
**신규 구독**:
- 제목: "최문호의 병원 - 구독 시작"
- 메시지: "최문호의 병원에서 Pro 플랜 체험을 시작했습니다. (7일 무료 체험)"
- 타입: `subscription_started`

**플랜 변경**:
- 제목: "퍼널리 - 구독 상태 변경"
- 메시지: "퍼널리의 Enterprise 플랜이 활성화되었습니다."
- 타입: `subscription_changed`

**구독 취소**:
- 제목: "홍란의 병원 - 구독 상태 변경"
- 메시지: "홍란의 병원의 Pro 플랜 구독이 취소되었습니다."
- 타입: `subscription_changed`

## 참고 문서

- [즉시 적용 가이드](/claudedocs/APPLY-SUBSCRIPTION-TRIGGER-NOW.md)
- [URGENT 셋업 가이드](/claudedocs/URGENT-subscription-notifications-setup.md)
- [상세 마이그레이션 가이드](/claudedocs/subscription-notification-migration-guide.md)

## 디버깅 스크립트 목록

| 스크립트 | 용도 |
|---------|------|
| `check-subscription-trigger.mjs` | 시스템 전체 점검 |
| `debug-subscription-trigger.mjs` | 상세 디버깅 정보 |
| `check-trigger-direct.mjs` | 트리거 작동 실시간 테스트 |
| `show-current-notifications.mjs` | 현재 알림 목록 조회 |

## 요약

**문제**: 마이그레이션 파일을 "실행했다"고 생각했지만 실제로는 데이터베이스에 적용되지 않음

**해결**: Supabase Dashboard SQL Editor에서 마이그레이션 SQL을 직접 실행

**검증**: 검증 스크립트 실행으로 트리거 작동 확인

**예상 소요 시간**: 5-10분
