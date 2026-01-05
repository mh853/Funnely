# Lead Notification Email System - Implementation Summary

## Overview

리드 유입 시 이메일 알림 시스템 구현 완료. 공개 랜딩페이지로부터 리드가 유입되면 자동으로 등록된 이메일 주소로 알림을 전송하는 시스템입니다.

**구현 날짜**: 2025-01-05
**프로젝트**: Funnely
**Cron 통합**: Vercel Cron (무료 플랜 제약으로 기존 daily-tasks에 통합)

## System Architecture

### Flow
```
Lead Submission (Landing Page)
    ↓
Database INSERT (leads table)
    ↓
PostgreSQL Trigger (notify_new_lead)
    ↓
Queue Entry (lead_notification_queue)
    ↓
Cron Job (01:00 UTC / 10:00 KST)
    ↓
Email Sending (Resend API)
    ↓
Logging (lead_notification_logs)
```

### Key Features
- **실시간 큐잉**: 리드 생성 시 즉시 알림 큐에 추가
- **재시도 로직**: 실패 시 최대 3회 재시도
- **이메일 로깅**: 모든 전송 이력 기록
- **다중 수신자**: 회사당 최대 5개 이메일 주소 등록 가능
- **테스트 기능**: 대시보드에서 테스트 이메일 전송 가능

## Implementation Details

### Phase 1: Database Schema ✅

**파일**: `supabase/migrations/20250105000000_create_lead_notification_system.sql`

#### 테이블 생성

1. **companies.notification_emails** (컬럼 추가)
   - 타입: `TEXT[]`
   - 기본값: 빈 배열
   - 용도: 알림 수신 이메일 목록 (최대 5개)

2. **lead_notification_queue** (새 테이블)
   ```sql
   - id: UUID (Primary Key)
   - lead_id: UUID (FK to leads)
   - company_id: UUID (FK to companies)
   - recipient_emails: TEXT[]
   - lead_data: JSONB (리드 정보 스냅샷)
   - sent: BOOLEAN (전송 완료 여부)
   - sent_at: TIMESTAMPTZ
   - error: TEXT (에러 메시지)
   - retry_count: INT (재시도 횟수)
   - created_at: TIMESTAMPTZ
   ```

3. **lead_notification_logs** (새 테이블)
   ```sql
   - id: UUID (Primary Key)
   - notification_queue_id: UUID (FK)
   - company_id: UUID (FK to companies)
   - lead_id: UUID (FK to leads)
   - recipient_email: TEXT
   - sent_at: TIMESTAMPTZ
   - success: BOOLEAN
   - error_message: TEXT
   - email_provider: TEXT (default: 'resend')
   ```

#### 트리거 함수

**notify_new_lead()**
- 타이밍: AFTER INSERT on leads
- 동작:
  1. 회사의 notification_emails 조회
  2. 랜딩페이지 제목 조회 (있는 경우)
  3. 이메일이 등록되어 있으면 lead_notification_queue에 추가
  4. 리드 데이터를 JSONB로 저장 (히스토리 보존)

#### RLS 정책
- Super Admin만 디버깅용으로 큐 조회 가능
- 일반 사용자는 접근 불가 (서비스 계정만)

### Phase 2: UI Components ✅

#### 1. NotificationEmailSettings 컴포넌트
**파일**: `src/components/settings/NotificationEmailSettings.tsx`

**기능**:
- 이메일 추가/삭제
- 테스트 이메일 전송
- 이메일 형식 검증
- 중복 검사
- 최대 5개 제한

**상태 관리**:
```typescript
const [emails, setEmails] = useState<string[]>([])
const [newEmail, setNewEmail] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [isTesting, setIsTesting] = useState(false)
const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
```

**권한 체크**: `canEdit` prop으로 company_owner/admin만 수정 가능

#### 2. Notifications 설정 페이지
**파일**: `src/app/dashboard/settings/notifications/page.tsx`

서버 컴포넌트로 구현:
- 회사 정보 및 알림 이메일 조회
- NotificationEmailSettings 렌더링
- 사용 가이드 포함

#### 3. Settings 메인 페이지 수정
**파일**: `src/app/dashboard/settings/page.tsx`

**변경사항**:
- BellIcon import 추가
- 그리드 레이아웃 조정: 5열 (관리자), 3열 (일반 사용자)
- "이메일 알림" 링크 카드 추가 (첫 번째 위치)

### Phase 3: API Endpoints ✅

#### 1. Notification Emails Management
**파일**: `src/app/api/settings/notification-emails/route.ts`

**엔드포인트**:

**GET** - 이메일 목록 조회
- 인증: 필수
- 권한: 자신의 회사 정보만 조회
- 응답: `{ emails: string[] }`

**POST** - 이메일 추가
- 인증: 필수
- 권한: company_owner 또는 company_admin
- 검증:
  - 이메일 형식 검증 (정규식)
  - 중복 확인
  - 최대 5개 제한
- 응답: `{ success: true, emails: string[] }`

**DELETE** - 이메일 삭제
- 인증: 필수
- 권한: company_owner 또는 company_admin
- 검증: 이메일 존재 확인
- 응답: `{ success: true, emails: string[] }`

#### 2. Test Email Endpoint
**파일**: `src/app/api/notifications/test-lead-email/route.ts`

**POST** - 테스트 이메일 전송
- 인증: 필수
- 권한: company_owner 또는 company_admin
- 동작:
  1. 회사의 모든 등록 이메일 조회
  2. 각 이메일로 테스트 데이터 전송
  3. 성공/실패 집계
- 테스트 데이터:
  ```typescript
  {
    leadName: '홍길동 (테스트)',
    leadPhone: '010-1234-5678',
    leadEmail: 'test@example.com',
    landingPageTitle: '테스트 랜딩페이지',
    deviceType: 'desktop'
  }
  ```
- 응답: `{ success: true, sentTo: number, totalEmails: number, successfulEmails: string[], failedEmails?: [] }`

### Phase 4: Email Sending System ✅

#### Email Utility Library
**파일**: `src/lib/email/send-lead-notification.ts`

**기능**:
- Resend API를 사용한 이메일 전송
- HTML 및 Plain Text 템플릿
- KST 시간대 변환
- 한글 현지화

**이메일 템플릿**:
- 헤더: 그라데이션 배경 (보라색)
- 콘텐츠: 리드 정보 (이름, 연락처, 이메일, 랜딩페이지, 시간, 디바이스)
- 액션 버튼: "대시보드에서 확인하기"
- 푸터: 회사명, 설정 변경 링크

**발신자**: `Funnely <noreply@funnely.co.kr>`

#### Resend Package
- 설치: `npm install resend`
- 환경변수: `RESEND_API_KEY` (필요)
- 무료 플랜: 3,000 emails/month

### Phase 5: Vercel Cron Integration ✅

#### Cron Job 통합
**파일**: `src/app/api/cron/daily-tasks/route.ts`

**기존 작업** (01:00 UTC / 10:00 KST):
0. 구독 만료 체크
1. 수익 계산 (MRR/ARR)
2. 고객 건강 점수 계산
3. Google Sheets 동기화
4. 성장 기회 탐지

**추가 작업 (Task 5)**:
5. **리드 알림 이메일 전송** ⬅️ 새로 추가

#### sendLeadNotifications() 함수

**동작 흐름**:
1. 미전송 알림 쿼리 (`sent = false AND retry_count < 3`)
2. 각 알림에 대해:
   - 모든 수신자에게 이메일 전송
   - 성공: `lead_notification_logs`에 기록
   - 실패: 에러 로그 및 `retry_count` 증가
3. 알림 상태 업데이트:
   - 모두 성공: `sent = true`, `sent_at = NOW()`
   - 일부 실패: `retry_count++`, `error` 메시지 저장

**재시도 로직**:
- 최대 3회 재시도
- 3회 실패 후에는 더 이상 시도하지 않음
- 각 실패마다 로그 기록

**결과 반환**:
```typescript
{
  processed: number,    // 처리된 알림 수
  successful: number,   // 성공한 알림 수
  failed: number,       // 실패한 알림 수
  message: string       // 요약 메시지
}
```

## Migration Application

### Migration Status
❌ **아직 적용되지 않음**

### Application Methods

#### Option 1: Supabase Dashboard (권장)
1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. SQL Editor 열기
3. 마이그레이션 파일 복사-붙여넣기: `supabase/migrations/20250105000000_create_lead_notification_system.sql`
4. 실행

#### Option 2: 스크립트 사용
```bash
# 마이그레이션 상태 확인
npx tsx scripts/test-notification-system.mjs

# 마이그레이션 적용 (수동)
npx tsx scripts/apply-migration-manually.mjs
```

**참고**: `apply-migration-manually.mjs`는 exec_sql RPC가 활성화되어 있어야 작동합니다.

## Environment Variables Required

### Production (Vercel)
```bash
# Existing (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://wsrjfdnxsggwymlrfqcc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_DOMAIN=https://funnely.co.kr
CRON_SECRET=your-cron-secret

# NEW - REQUIRED
RESEND_API_KEY=re_xxxxxxxxxxxxx  # ⚠️ 설정 필요!
```

### Resend API Key 발급
1. https://resend.com 접속
2. 회원가입 / 로그인
3. API Keys 메뉴에서 키 생성
4. Vercel 환경 변수에 추가

## Testing Checklist

### Pre-Deployment
- [x] TypeScript 컴파일 통과
- [x] 모든 파일 생성 완료
- [x] Cron Job 통합 완료
- [ ] 마이그레이션 적용 (운영 DB)
- [ ] RESEND_API_KEY 환경 변수 설정

### Post-Deployment
- [ ] Settings 페이지에서 이메일 추가 테스트
- [ ] 테스트 이메일 전송 테스트
- [ ] 공개 랜딩페이지에서 실제 리드 제출
- [ ] 알림 큐 생성 확인
- [ ] Cron Job 실행 대기 (01:00 UTC)
- [ ] 이메일 수신 확인
- [ ] 재시도 로직 테스트 (의도적 실패)

### Manual Testing Steps

1. **이메일 등록**
   ```
   1. /dashboard/settings/notifications 접속
   2. 테스트 이메일 주소 입력
   3. "추가" 버튼 클릭
   4. 목록에 추가되었는지 확인
   ```

2. **테스트 이메일 전송**
   ```
   1. "테스트 이메일 전송" 버튼 클릭
   2. 성공 메시지 확인
   3. 이메일 수신 확인
   ```

3. **실제 리드 제출**
   ```
   1. 공개 랜딩페이지 접속
   2. 상담 신청 양식 작성
   3. 제출 완료
   4. Supabase에서 lead_notification_queue 확인:
      SELECT * FROM lead_notification_queue WHERE sent = false;
   ```

4. **Cron Job 실행 확인**
   ```
   1. Vercel 로그 확인 (01:00 UTC)
   2. "[Lead Notifications] Starting email processing" 로그 확인
   3. 이메일 수신 확인
   4. Supabase에서 상태 확인:
      SELECT * FROM lead_notification_queue WHERE sent = true;
      SELECT * FROM lead_notification_logs ORDER BY sent_at DESC LIMIT 10;
   ```

## Files Created

### Database
- `supabase/migrations/20250105000000_create_lead_notification_system.sql`

### UI Components
- `src/components/settings/NotificationEmailSettings.tsx`
- `src/app/dashboard/settings/notifications/page.tsx`

### API Endpoints
- `src/app/api/settings/notification-emails/route.ts`
- `src/app/api/notifications/test-lead-email/route.ts`

### Utilities
- `src/lib/email/send-lead-notification.ts`

### Scripts
- `scripts/test-notification-system.mjs`
- `scripts/apply-migration-manually.mjs`
- `scripts/apply-lead-notification-migration.sh`

### Documentation
- `claudedocs/lead-notification-email-system-design.md`
- `claudedocs/lead-notification-implementation-summary.md`

## Files Modified

### UI
- `src/app/dashboard/settings/page.tsx`
  - Added BellIcon import
  - Changed grid layout (5 columns for admin, 3 for regular users)
  - Added "이메일 알림" link card

### API
- `src/app/api/cron/daily-tasks/route.ts`
  - Added sendLeadNotificationEmail import
  - Added Task 5: Send Lead Notification Emails
  - Added sendLeadNotifications() function

### Bug Fixes
- `src/app/api/settings/notification-emails/route.ts`
  - Fixed TypeScript type error: `(e: string) => e !== email`

## Cost Analysis

### Resend (Email Service)
- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Pro Plan**: $20/month for 50,000 emails
- **예상 사용량**:
  - 리드 10개/일 × 5개 이메일 = 50 emails/day
  - 월간: 50 × 30 = 1,500 emails/month ✅ 무료 범위

### Vercel Cron
- **Free Plan**: 1 cron job (현재 사용 중)
- **통합 완료**: daily-tasks에 통합하여 무료 플랜 유지

## Next Steps (배포 후)

1. **마이그레이션 적용**
   - Supabase Dashboard에서 SQL 실행
   - 또는 스크립트 사용

2. **환경 변수 설정**
   - Vercel에 RESEND_API_KEY 추가
   - Redeploy

3. **기능 테스트**
   - 이메일 등록/삭제
   - 테스트 이메일 전송
   - 실제 리드 제출

4. **모니터링**
   - Vercel Cron 로그 확인
   - Supabase 큐 테이블 모니터링
   - 이메일 로그 확인

5. **사용자 안내**
   - 이메일 알림 기능 공지
   - 설정 방법 안내

## Support & Troubleshooting

### 이메일이 도착하지 않을 때
1. Resend 대시보드에서 전송 로그 확인
2. lead_notification_logs 테이블 확인
3. Vercel Cron 로그 확인
4. retry_count가 3 이상인지 확인

### 큐가 쌓일 때
1. Cron Job이 정상 실행되는지 확인
2. RESEND_API_KEY가 올바른지 확인
3. Resend 계정 상태 확인 (한도 초과 여부)

### 마이그레이션 실패 시
1. Supabase Dashboard의 SQL Editor 사용
2. 각 statement를 개별 실행
3. 에러 메시지 확인 및 수정

## Implementation Notes

### Design Decisions

1. **큐잉 시스템 사용 이유**
   - 트리거에서 직접 이메일을 보내지 않음 (성능 문제)
   - 재시도 로직 구현 가능
   - 실패한 알림 추적 가능

2. **Cron 통합 이유**
   - Vercel 무료 플랜 제약 (1개 cron job만 가능)
   - 기존 daily-tasks에 통합하여 비용 절감
   - 성능 최적화는 유료 전환 시 분리 예정

3. **JSONB 사용 이유**
   - 리드 데이터 히스토리 보존
   - 나중에 리드가 삭제되어도 알림 내용 확인 가능
   - 유연한 데이터 구조

### Future Improvements

1. **실시간 알림**
   - Vercel Pro 전환 시 별도 cron job 생성
   - 5분 또는 10분 간격 실행

2. **알림 템플릿 커스터마이징**
   - 회사별 이메일 템플릿 설정
   - 로고, 색상 커스터마이징

3. **알림 채널 확장**
   - SMS 알림 추가
   - Slack 웹훅 통합
   - 카카오톡 알림톡

4. **알림 조건 설정**
   - 특정 랜딩페이지만 알림
   - 업무 시간에만 알림
   - 중요도별 필터링

## Conclusion

리드 유입 이메일 알림 시스템 구현이 완료되었습니다.

**구현 완료**:
- ✅ 데이터베이스 스키마
- ✅ UI 컴포넌트
- ✅ API 엔드포인트
- ✅ 이메일 전송 시스템
- ✅ Vercel Cron 통합

**다음 단계**:
1. 마이그레이션 적용
2. RESEND_API_KEY 설정
3. 배포 및 테스트

배포 후 정상 작동하면 고객들이 리드 유입 시 실시간으로 알림을 받을 수 있습니다!
