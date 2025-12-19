# 🚨 구독 알림 트리거 적용 가이드

**날짜**: 2025-12-18
**상태**: ❌ 트리거 미설치 확인됨
**우선순위**: CRITICAL

## 현재 상황

✅ **확인 완료**:
- 구독 데이터: 3개 존재
- 알림 데이터: 5개 (모두 테스트 데이터)
- 구독 알림: **0개** (트리거 미작동)

❌ **트리거 상태**:
- `on_subscription_change` 트리거: **데이터베이스에 없음**
- `create_subscription_notification()` 함수: **데이터베이스에 없음**
- Realtime publication: **확인 불가**

**테스트 결과**:
```
구독 업데이트 전: 5개 알림
구독 업데이트 수행 ✓
구독 업데이트 후: 5개 알림 (변화 없음) ❌
→ 트리거가 작동하지 않음
```

## 즉시 실행 가이드 (5분)

### 1단계: Supabase Dashboard 접속

1. **브라우저에서 열기**:
   ```
   https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql
   ```

2. **로그인 확인**:
   - 이미 로그인되어 있어야 함
   - 프로젝트: `wsrjfdnxsggwymlrfqcc` (MediSync)

### 2단계: SQL 에디터 준비

1. **"New query" 버튼 클릭**
2. 빈 SQL 에디터가 열림

### 3단계: 마이그레이션 SQL 복사

**파일 위치**: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`

**중요**: 전체 내용을 복사해야 합니다 (136줄 전체)

**복사할 내용**:
```sql
-- 구독 테이블 Realtime 활성화 및 알림 자동 생성 함수
-- 생성일: 2025-12-18

-- 1. company_subscriptions 테이블 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;

-- 2. 구독 생성 시 알림 자동 생성 함수
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  plan_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- 회사명 조회
  SELECT name INTO company_name
  FROM companies
  WHERE id = NEW.company_id;

  -- 플랜명 조회
  SELECT name INTO plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;

  -- INSERT 이벤트 (신규 구독 생성)
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

    -- 알림 생성
    INSERT INTO notifications (
      company_id,
      title,
      message,
      type,
      is_read
    ) VALUES (
      NEW.company_id,
      notification_title,
      notification_message,
      'subscription_started',
      false
    );

  -- UPDATE 이벤트 (구독 상태 변경)
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    notification_title := format('%s - 구독 상태 변경', company_name);

    CASE NEW.status
      WHEN 'active' THEN
        IF OLD.status = 'trial' THEN
          notification_message := format(
            '%s의 %s 플랜이 정식 구독으로 전환되었습니다.',
            company_name,
            plan_name
          );
        ELSE
          notification_message := format(
            '%s의 %s 플랜이 활성화되었습니다.',
            company_name,
            plan_name
          );
        END IF;
      WHEN 'cancelled' THEN
        notification_message := format(
          '%s의 %s 플랜 구독이 취소되었습니다.',
          company_name,
          plan_name
        );
      WHEN 'suspended' THEN
        notification_message := format(
          '%s의 %s 플랜이 정지되었습니다.',
          company_name,
          plan_name
        );
      WHEN 'expired' THEN
        notification_message := format(
          '%s의 %s 플랜이 만료되었습니다.',
          company_name,
          plan_name
        );
      ELSE
        notification_message := format(
          '%s의 %s 플랜 상태가 %s로 변경되었습니다.',
          company_name,
          plan_name,
          NEW.status
        );
    END CASE;

    -- 알림 생성
    INSERT INTO notifications (
      company_id,
      title,
      message,
      type,
      is_read
    ) VALUES (
      NEW.company_id,
      notification_title,
      notification_message,
      'subscription_changed',
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 생성
DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();
```

### 4단계: SQL 실행

1. **SQL 에디터에 붙여넣기** (Cmd+V)
2. **"Run" 버튼 클릭** (우측 하단)
3. **성공 메시지 확인**:
   - ✅ "Success. No rows returned"
   - 또는 유사한 성공 메시지

### 5단계: 검증 (1분)

**검증 쿼리 1**: 트리거 존재 확인
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_subscription_change';
```

**예상 결과**:
```
tgname                  | tgenabled
------------------------|----------
on_subscription_change  | O
```

**검증 쿼리 2**: 함수 존재 확인
```sql
SELECT proname
FROM pg_proc
WHERE proname = 'create_subscription_notification';
```

**예상 결과**:
```
proname
--------------------------------
create_subscription_notification
```

**검증 쿼리 3**: Realtime 활성화 확인
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'company_subscriptions';
```

**예상 결과**:
```
tablename
---------------------
company_subscriptions
```

### 6단계: 테스트 (2분)

**터미널에서 실행**:
```bash
node scripts/check-trigger-direct.mjs
```

**예상 출력**:
```
🔍 Checking trigger status directly...

📝 Testing: Creating a test subscription update...

   Using subscription:
   - Company: 최문호의 병원
   - Plan: Free
   - Current status: active

   Notifications before: 5
   Performing test update...
   Notifications after: 6

✅ TRIGGER IS WORKING!
   → 1 new notification(s) created
   → The trigger is properly installed and functional
```

### 7단계: 실제 테스트 (1분)

1. **브라우저에서 `/dashboard/subscription` 접속**
2. **다른 플랜 선택** (예: Pro)
3. **"이 플랜으로 변경" 버튼 클릭**
4. **`/admin/notifications` 페이지 확인**
5. **새 알림 표시 확인**:
   - 제목: "[회사명] - 구독 상태 변경"
   - 메시지: "[회사명]의 Pro 플랜이 활성화되었습니다."
   - 타입: `subscription_changed`

## 문제 해결

### 문제 1: "Permission denied" 에러

**증상**: SQL 실행 시 권한 에러

**해결**:
1. Supabase Dashboard에서 로그아웃
2. 다시 로그인
3. 올바른 프로젝트 선택 확인
4. SQL 재실행

### 문제 2: "Already exists" 에러

**증상**: 트리거나 함수가 이미 존재한다는 에러

**해결**:
- 이미 설치된 것이므로 검증 단계(5단계)로 이동
- 검증 쿼리로 정상 작동 확인

### 문제 3: 검증 쿼리가 결과 없음

**증상**: 트리거/함수 확인 쿼리가 빈 결과

**해결**:
1. SQL 에디터에서 "History" 탭 확인
2. 마이그레이션 SQL이 실행되었는지 확인
3. 에러 메시지가 있었는지 확인
4. 다시 전체 SQL 복사/붙여넣기/실행

### 문제 4: 테스트 후에도 알림 생성 안됨

**증상**: 검증은 성공했지만 실제 알림이 안 나타남

**해결**:
1. 브라우저 콘솔 확인 (F12)
2. Realtime 연결 확인:
   ```
   🔔 Realtime notification change: {...}
   ```
3. 페이지 새로고침 (F5)
4. 알림 센터 다시 확인

## 완료 체크리스트

- [ ] Supabase Dashboard SQL Editor 접속
- [ ] 마이그레이션 SQL 전체 복사
- [ ] SQL 실행 및 성공 메시지 확인
- [ ] 검증 쿼리 1: 트리거 존재 확인 ✓
- [ ] 검증 쿼리 2: 함수 존재 확인 ✓
- [ ] 검증 쿼리 3: Realtime 활성화 확인 ✓
- [ ] 터미널 테스트: `check-trigger-direct.mjs` 성공
- [ ] 브라우저 테스트: 플랜 변경 → 알림 생성 확인
- [ ] Admin 알림 센터에서 새 알림 확인
- [ ] Realtime 업데이트 작동 확인 (페이지 새로고침 없이)

## 참고

**마이그레이션 파일**:
- 위치: `supabase/migrations/20251218000000_enable_subscriptions_realtime.sql`
- 크기: 136줄
- 내용: Realtime 활성화 + 함수 생성 + 트리거 생성

**관련 문서**:
- [URGENT 가이드](/claudedocs/URGENT-subscription-notifications-setup.md)
- [상세 마이그레이션 가이드](/claudedocs/subscription-notification-migration-guide.md)

**디버깅 스크립트**:
- `scripts/check-subscription-trigger.mjs`: 시스템 전체 점검
- `scripts/debug-subscription-trigger.mjs`: 상세 디버깅
- `scripts/check-trigger-direct.mjs`: 트리거 작동 테스트
- `scripts/show-current-notifications.mjs`: 현재 알림 목록 조회
