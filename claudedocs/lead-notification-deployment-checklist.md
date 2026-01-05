# Lead Notification System - Deployment Checklist

## Pre-Deployment

### 1. Code Quality ✅
- [x] TypeScript compilation passes
- [x] Build succeeds (only warnings, no errors)
- [x] All files committed
- [x] Code reviewed

### 2. Database Preparation ⚠️
- [ ] **Apply migration to production**
  - Option A (권장): Supabase Dashboard SQL Editor
    1. 접속: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql
    2. 파일 복사: `supabase/migrations/20250105000000_create_lead_notification_system.sql`
    3. 붙여넣기 후 실행
  - Option B: Script 사용
    ```bash
    npx tsx scripts/test-notification-system.mjs  # 상태 확인
    # 수동 적용 필요
    ```

### 3. Environment Variables ⚠️
- [ ] **Vercel에 RESEND_API_KEY 추가**
  1. Resend 가입: https://resend.com
  2. API Key 생성
  3. Vercel Dashboard → Settings → Environment Variables
  4. 추가: `RESEND_API_KEY=re_xxxxxxxxxxxxx`
  5. Production 환경 선택
  6. Save

## Deployment Steps

### 1. Git Commit & Push
```bash
git status
git add .
git commit -m "feat: 리드 알림 이메일 시스템 구현

- 데이터베이스: notification_emails, lead_notification_queue, lead_notification_logs
- UI: 이메일 관리 설정 페이지
- API: 이메일 CRUD 및 테스트 전송
- Cron: daily-tasks에 알림 전송 통합
- Email: Resend를 사용한 이메일 전송

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

### 2. Wait for Vercel Deployment
- Vercel이 자동으로 배포 시작
- 배포 로그 확인
- 배포 완료 확인

### 3. Verify Environment Variables
```bash
# Vercel Dashboard에서 확인
# Settings → Environment Variables
# RESEND_API_KEY가 설정되어 있는지 확인
```

### 4. Re-deploy if Needed
Environment variable 추가 후 재배포 필요 시:
```bash
# Vercel CLI 사용
vercel --prod

# 또는 Vercel Dashboard에서 Redeploy
```

## Post-Deployment Testing

### 1. Database Migration Verification
```bash
# 로컬에서 테스트
npx tsx scripts/test-notification-system.mjs

# 예상 출력:
# ✅ notification_emails column exists
# ✅ lead_notification_queue table exists
# ✅ lead_notification_logs table exists
```

### 2. UI Testing

#### A. Settings Page Access
1. 접속: https://funnely.co.kr/dashboard/settings
2. "이메일 알림" 카드 확인
3. 클릭 → Notifications 페이지 이동

#### B. Email Management
1. 테스트 이메일 주소 입력
2. "추가" 버튼 클릭
3. 목록에 추가 확인
4. 삭제 버튼 테스트

#### C. Test Email
1. "테스트 이메일 전송" 버튼 클릭
2. 성공 메시지 확인
3. 이메일 수신함 확인
   - 제목: `[Funnely] 새로운 상담 신청 - 홍길동 (테스트)`
   - 발신자: `Funnely <noreply@funnely.co.kr>`
   - 내용: 테스트 리드 정보

### 3. End-to-End Testing

#### A. Create Test Lead
1. 공개 랜딩페이지 접속
   - 예: https://q81d1c.funnely.co.kr/landing/asdf
2. 상담 신청 양식 작성
   - 이름: 테스트 사용자
   - 연락처: 010-9999-9999
   - 이메일: test@test.com
3. 제출

#### B. Verify Queue Entry
Supabase Dashboard에서 확인:
```sql
-- 큐에 추가되었는지 확인
SELECT * FROM lead_notification_queue
WHERE sent = false
ORDER BY created_at DESC
LIMIT 5;

-- lead_data JSONB 확인
SELECT
  id,
  lead_data->>'name' as lead_name,
  lead_data->>'phone' as phone,
  recipient_emails,
  created_at
FROM lead_notification_queue
WHERE sent = false;
```

#### C. Wait for Cron Execution
- Cron 실행 시간: 01:00 UTC (10:00 KST)
- 또는 수동 트리거: Vercel Dashboard → Cron Jobs → Trigger

#### D. Verify Email Delivery
1. 이메일 수신 확인
2. 내용 검증:
   - 고객명: 테스트 사용자
   - 연락처: 010-9999-9999
   - 랜딩페이지: 올바른 제목
   - 시간: KST 시간대

#### E. Verify Database Updates
```sql
-- 큐 상태 확인 (sent = true)
SELECT * FROM lead_notification_queue
WHERE sent = true
ORDER BY sent_at DESC
LIMIT 5;

-- 전송 로그 확인
SELECT
  recipient_email,
  success,
  error_message,
  sent_at
FROM lead_notification_logs
ORDER BY sent_at DESC
LIMIT 10;
```

### 4. Retry Logic Testing

#### A. Simulate Failure (Optional)
1. Temporarily set invalid RESEND_API_KEY
2. Create test lead
3. Wait for cron execution
4. Verify retry_count increases
5. Restore valid API key
6. Wait for next cron
7. Verify successful retry

```sql
-- 재시도 횟수 확인
SELECT
  id,
  retry_count,
  error,
  created_at
FROM lead_notification_queue
WHERE retry_count > 0
ORDER BY created_at DESC;
```

### 5. Monitoring

#### A. Vercel Logs
```bash
# Vercel CLI로 로그 확인
vercel logs production

# 또는 Vercel Dashboard
# https://vercel.com/[team]/[project]/logs

# 찾을 로그:
# [Lead Notifications] Starting email processing
# [Lead Notifications] Found X pending notifications
# [Lead Notifications] Email sent to xxx@xxx.com for lead ...
# [Lead Notifications] Successfully processed notification ...
```

#### B. Resend Dashboard
1. 접속: https://resend.com/emails
2. 전송 이력 확인
3. 전송 상태 확인 (delivered, bounced, etc.)
4. 에러 로그 확인

#### C. Supabase Monitoring
```sql
-- 일별 전송 통계
SELECT
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
FROM lead_notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- 재시도 필요한 알림
SELECT
  COUNT(*) as pending_retries
FROM lead_notification_queue
WHERE sent = false AND retry_count < 3;

-- 재시도 한도 초과 (수동 처리 필요)
SELECT
  COUNT(*) as failed_max_retries
FROM lead_notification_queue
WHERE sent = false AND retry_count >= 3;
```

## Troubleshooting

### Issue: 이메일 등록이 저장되지 않음 (해결됨 ✅)

**증상**:
- 이메일 추가 시 성공 메시지 표시됨
- 페이지 새로고침 시 등록된 이메일이 사라짐

**원인**:
- API 라우트가 ANON_KEY 사용하는 `createClient()` 사용
- RLS 정책으로 인해 companies 테이블 업데이트가 차단됨
- 에러가 반환되지 않아 프론트엔드에서 성공으로 표시

**해결**:
- `createServiceClient()` 사용으로 SERVICE_ROLE_KEY 활용
- RLS 정책 우회하여 관리자 작업 수행
- POST 및 DELETE 엔드포인트 모두 수정

**커밋**: 3ae22dc - "fix: 이메일 알림 설정 DB 저장 오류 수정"

---

### Issue: 이메일이 도착하지 않음

**진단 단계**:
1. Resend Dashboard 확인
   - API 호출 성공 여부
   - Bounce/Spam 여부
2. lead_notification_logs 확인
   - success = false인 레코드 조회
   - error_message 확인
3. Vercel Logs 확인
   - Cron Job 실행 여부
   - 에러 메시지
4. RESEND_API_KEY 확인
   - 환경 변수 설정 확인
   - API Key 유효성 확인

**해결 방법**:
- API Key 재발급 및 재설정
- Resend 계정 상태 확인 (한도 초과 여부)
- 스팸 폴더 확인
- 수신 이메일 주소 검증

### Issue: 큐가 계속 쌓임 (sent = false)

**진단 단계**:
1. Cron Job 실행 확인
   - Vercel Dashboard → Cron Jobs
   - 마지막 실행 시간 확인
2. Cron Job 로그 확인
   - 에러 발생 여부
3. RESEND_API_KEY 확인

**해결 방법**:
- Cron Job 수동 트리거
- 환경 변수 재설정
- Vercel 재배포

### Issue: retry_count가 3 이상인 레코드

**진단**:
```sql
SELECT
  id,
  lead_data->>'name' as lead_name,
  recipient_emails,
  retry_count,
  error,
  created_at
FROM lead_notification_queue
WHERE retry_count >= 3 AND sent = false;
```

**해결 방법**:
1. 에러 원인 파악 (error 컬럼)
2. 문제 해결 후 수동 재시도:
```sql
-- retry_count 초기화
UPDATE lead_notification_queue
SET retry_count = 0, error = null
WHERE id = 'xxx-xxx-xxx';
```
3. 다음 Cron 실행 대기

### Issue: 마이그레이션 적용 실패

**증상**:
- 테이블이 생성되지 않음
- 트리거가 작동하지 않음

**해결**:
1. Supabase Dashboard SQL Editor 사용
2. 마이그레이션 파일을 단계별로 실행
3. 각 statement의 에러 메시지 확인
4. 필요 시 수동으로 수정하여 재실행

## Rollback Plan

만약 문제가 발생하면:

### 1. Immediate Actions
- Vercel에서 이전 배포 버전으로 롤백
- RESEND_API_KEY 환경 변수 제거 (비용 발생 방지)

### 2. Database Rollback
```sql
-- 트리거 제거
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;
DROP FUNCTION IF EXISTS notify_new_lead();

-- 테이블 삭제
DROP TABLE IF EXISTS lead_notification_logs;
DROP TABLE IF EXISTS lead_notification_queue;

-- 컬럼 제거
ALTER TABLE companies DROP COLUMN IF EXISTS notification_emails;
```

### 3. Code Rollback
```bash
git revert HEAD
git push origin main
```

## Success Criteria

배포가 성공적으로 완료되었다고 판단할 수 있는 기준:

- [x] 코드 빌드 성공
- [ ] 마이그레이션 적용 완료
- [ ] 환경 변수 설정 완료
- [ ] Settings 페이지 정상 접근
- [ ] 이메일 추가/삭제 기능 작동
- [ ] 테스트 이메일 수신 확인
- [ ] 실제 리드 제출 → 큐 생성 확인
- [ ] Cron Job 실행 → 이메일 수신 확인
- [ ] 로그 기록 확인
- [ ] 재시도 로직 작동 확인

## Support

문제 발생 시 참고:
- Implementation Summary: `claudedocs/lead-notification-implementation-summary.md`
- System Design: `claudedocs/lead-notification-email-system-design.md`
- Migration File: `supabase/migrations/20250105000000_create_lead_notification_system.sql`

---

**배포 시작 날짜**: 2025-01-05
**담당자**: MH.C
**상태**: Ready for Deployment
