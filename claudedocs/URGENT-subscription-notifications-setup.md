# 🚨 URGENT: Subscription Notification System Setup

**날짜**: 2025-12-18
**상태**: ⚠️ 즉시 적용 필요
**우선순위**: HIGH

## 문제 요약

**사용자 요청**: "dashboard/subscription 페이지에서 구독정보가 변경되면 어드민의 알림센터에 실시간 알림을 줘야해. 지금은 테스트 데이터만 보이고 이썽."

**현재 상황**:
- ❌ 알림 센터에 테스트 데이터 5개만 표시 중
- ❌ 구독 변경 시 자동 알림 생성 안됨
- ✅ 구독 데이터는 정상 존재 (3개)
- ✅ 마이그레이션 파일은 작성 완료
- ❌ 데이터베이스에 미적용

**데이터베이스 현황**:
```
notifications 테이블:
- goal_achieved (월간 목표 달성)
- report_ready (월간 리포트)
- user_activity (새 사용자)
- new_lead (신규 리드)
- status_change (캠페인 상태)
→ 모두 테스트 데이터, subscription 관련 알림 없음

company_subscriptions 테이블:
- 3개 구독 존재
- 상태: active (2개), trial (1개)
- 생성일: 2025-12-18 9:24:48 AM
→ 이 구독들이 자동 알림을 생성했어야 하는데 안됨
```

## 즉시 해야 할 작업

### 1단계: 마이그레이션 적용 (5분)

**Supabase Dashboard 접속**:
1. https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc
2. 좌측 메뉴 → SQL Editor 클릭
3. "New query" 버튼 클릭

**마이그레이션 SQL 복사**:
1. 파일 열기: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`
2. 전체 내용 복사 (Cmd+A, Cmd+C)

**실행**:
1. SQL Editor에 붙여넣기
2. "Run" 버튼 클릭
3. 성공 메시지 확인

**검증**:
```sql
-- 트리거 존재 확인
SELECT tgname, tgtype
FROM pg_trigger
WHERE tgname = 'on_subscription_change';

-- Realtime 활성화 확인
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'company_subscriptions';
```

### 2단계: 테스트 (2분)

터미널에서 실행:
```bash
# 트리거 설치 확인
node scripts/check-subscription-trigger.mjs
```

**예상 출력**:
- ✅ Trigger installed
- ✅ Realtime enabled

### 3단계: 실제 테스트 (3분)

**브라우저에서 테스트**:
1. `/dashboard/subscription` 페이지 접속
2. 다른 플랜 선택 (예: Free → Pro)
3. "이 플랜으로 변경" 버튼 클릭
4. `/admin/dashboard` 페이지에서 알림 벨 확인
5. **예상 결과**: 새 알림 표시 + 배지 카운트 증가

**콘솔 확인**:
- 브라우저 개발자 도구 → Console
- 다음 로그 확인:
  - `🔔 Realtime notification change`
  - `🔔 Realtime subscription change`

## 마이그레이션이 하는 일

### 1. Realtime 활성화
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;
```
→ `company_subscriptions` 테이블 변경사항을 실시간으로 브로드캐스트

### 2. 알림 생성 함수
```sql
CREATE OR REPLACE FUNCTION create_subscription_notification()
```

**작동 방식**:
- 구독 INSERT → "구독 시작" 알림 자동 생성
- 구독 UPDATE → "구독 상태 변경" 알림 자동 생성

**알림 예시**:
- 신규 구독 (trial): `"[회사명] - 구독 시작\n[회사명]에서 Pro 플랜 체험을 시작했습니다. (7일 무료 체험)"`
- 플랜 변경: `"[회사명] - 구독 상태 변경\n[회사명]의 Enterprise 플랜이 활성화되었습니다."`
- 구독 취소: `"[회사명] - 구독 상태 변경\n[회사명]의 Pro 플랜 구독이 취소되었습니다."`

### 3. 트리거 생성
```sql
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();
```

**실행 흐름**:
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

## 예상 결과

### 적용 전 (현재)
```
알림 센터:
1. [goal_achieved] 월간 목표를 달성했습니다 ← 테스트 데이터
2. [report_ready] 월간 리포트가 준비되었습니다 ← 테스트 데이터
3. [user_activity] 새로운 사용자가 추가되었습니다 ← 테스트 데이터
4. [new_lead] 신규 리드가 등록되었습니다 ← 테스트 데이터
5. [status_change] 캠페인 상태가 변경되었습니다 ← 테스트 데이터
```

### 적용 후 (예상)
```
알림 센터:
1. [subscription_changed] 퍼널리 - 구독 상태 변경 ← 새 실시간 알림!
   "퍼널리의 Pro 플랜이 활성화되었습니다."
2. [goal_achieved] 월간 목표를 달성했습니다
3. [report_ready] 월간 리포트가 준비되었습니다
4. [user_activity] 새로운 사용자가 추가되었습니다
5. [new_lead] 신규 리드가 등록되었습니다
```

## 기존 시스템과의 통합

### NotificationBell 컴포넌트
**위치**: `/src/app/admin/components/NotificationBell.tsx`

**이미 구현된 기능**:
- ✅ Realtime 구독 활성화 (line 18-40)
- ✅ INSERT 이벤트 감지 → 카운트 업데이트
- ✅ 배지 표시 로직
- ✅ 알림 센터 링크

**마이그레이션 후 변화**:
- 구독 변경 시 자동으로 새 알림 생성
- Realtime으로 즉시 전달
- 배지 카운트 자동 증가
- **추가 코드 수정 불필요**

### Admin Subscriptions Page
**위치**: `/src/app/admin/subscriptions/page.tsx`

**이미 구현된 기능**:
- ✅ 구독 목록 표시
- ✅ 상태 변경 기능
- ✅ Realtime 구독 모니터링

**마이그레이션 후 변화**:
- 구독 상태 변경 시 자동 알림 생성
- **추가 코드 수정 불필요**

### User Subscription Page
**위치**: `/src/components/subscription/SubscriptionClient.tsx`

**이미 구현된 기능**:
- ✅ 플랜 변경 (handleSelectPlan)
- ✅ 구독 취소 (handleCancelSubscription)
- ✅ Realtime 구독

**마이그레이션 후 변화**:
- 사용자가 플랜 변경 → 자동 알림 생성
- 사용자가 구독 취소 → 자동 알림 생성
- **추가 코드 수정 불필요**

## 완료 확인 체크리스트

### 마이그레이션 적용 완료
- [ ] Supabase Dashboard SQL Editor에서 마이그레이션 실행
- [ ] 트리거 존재 확인 쿼리 실행 → 결과 1개
- [ ] Realtime 활성화 확인 쿼리 실행 → company_subscriptions 표시
- [ ] `node scripts/check-subscription-trigger.mjs` 실행 → ✅ 표시

### 기능 테스트 완료
- [ ] 플랜 변경 → 알림 생성 확인
- [ ] 구독 취소 → 알림 생성 확인
- [ ] Admin 알림 센터에서 새 알림 보기
- [ ] Realtime 업데이트 작동 (페이지 새로고침 없이 표시)

### 모니터링
- [ ] 브라우저 콘솔 에러 없음
- [ ] Supabase Dashboard → Logs → 에러 없음
- [ ] 알림 센터 배지 정확히 표시

## 문제 해결

### 트리거가 설치되지 않은 경우
**증상**: `check-subscription-trigger.mjs` 실행 시 "Trigger not found"

**해결**:
1. Supabase Dashboard SQL Editor 재확인
2. 마이그레이션 SQL 다시 실행
3. 에러 메시지 확인
4. 필요시 DROP TRIGGER 후 재생성:
   ```sql
   DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;
   -- 그 다음 CREATE TRIGGER 문 실행
   ```

### Realtime이 작동하지 않는 경우
**증상**: 알림이 생성되지만 실시간 업데이트 안됨

**해결**:
1. 브라우저 콘솔 확인 → WebSocket 연결 확인
2. Supabase Dashboard → Settings → API → Realtime 활성화 확인
3. 페이지 새로고침 후 재테스트

### 알림이 생성되지 않는 경우
**증상**: 플랜 변경해도 알림 없음

**해결**:
1. Supabase Dashboard SQL Editor에서:
   ```sql
   -- 직접 구독 업데이트 테스트
   UPDATE company_subscriptions
   SET status = 'active'
   WHERE id = '[구독 ID]';

   -- 알림 생성 확인
   SELECT * FROM notifications
   WHERE type IN ('subscription_started', 'subscription_changed')
   ORDER BY created_at DESC
   LIMIT 5;
   ```
2. 알림이 없다면 → 트리거 미설치, 1단계부터 재실행
3. 알림이 있다면 → Realtime 문제, 위 섹션 참조

## 참고 문서

- [상세 마이그레이션 가이드](/claudedocs/subscription-notification-migration-guide.md)
- [구독 Realtime 알림 시스템](/claudedocs/subscriptions-realtime-notification.md)
- [대시보드 구독 페이지 개선](/claudedocs/dashboard-subscription-page-enhancement.md)

## 요약

**현재 문제**: 구독 변경 시 자동 알림 생성 안됨, 테스트 데이터만 표시
**원인**: 데이터베이스 트리거 미설치
**해결**: 마이그레이션 SQL 실행 (5분 소요)
**결과**: 구독 변경 즉시 실시간 알림 생성

**즉시 실행할 명령**:
1. Supabase Dashboard → SQL Editor
2. `20251218000000_enable_subscriptions_realtime.sql` 복사/붙여넣기/실행
3. `node scripts/check-subscription-trigger.mjs` 확인
4. 브라우저에서 플랜 변경 테스트
