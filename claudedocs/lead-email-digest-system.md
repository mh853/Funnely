# 리드 이메일 다이제스트 시스템

## 📋 개요

리드가 생성될 때마다 즉시 이메일을 보내는 대신, **하루 2회 (오전 8시, 오후 4시)** 배치로 새로운 상담 신청을 정리하여 발송하는 시스템입니다.

### 장점
- ✅ **스팸 방지**: 개별 리드마다 이메일을 보내지 않음
- ✅ **효율적**: 여러 리드를 하나의 이메일로 정리
- ✅ **비용 절감**: 이메일 발송 횟수 감소 (Resend 무료 플랜: 월 3,000통)
- ✅ **가독성**: 표 형식으로 한눈에 파악 가능

---

## 🏗️ 시스템 구조

### 1. 리드 생성 흐름

```
랜딩페이지 상담 신청
  ↓
POST /api/leads/submit
  ↓
leads 테이블에 리드 저장
  ↓
DB 트리거 (trigger_notify_new_lead) 자동 실행
  ↓
lead_notification_queue 테이블에 알림 추가
  - sent: false
  - retry_count: 0
  - created_at: 현재 시간
```

### 2. 다이제스트 이메일 발송 흐름

```
Vercel Cron 스케줄러 (오전 8시, 오후 4시 KST)
  ↓
GET /api/cron/lead-digest
  ↓
lead_notification_queue에서 sent=false인 알림 조회
  ↓
회사별로 그룹화
  ↓
다이제스트 이메일 생성 및 발송
  - HTML: 표 형식 + 브랜드 디자인
  - Text: Plain text 버전
  ↓
lead_notification_logs에 발송 기록
  ↓
lead_notification_queue의 sent를 true로 업데이트
```

---

## ⏰ 발송 스케줄

### Vercel Cron 설정 (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/lead-digest",
      "schedule": "0 23,7 * * *"
    }
  ]
}
```

### 스케줄 설명

| UTC 시간 | 한국 시간 (KST) | 비고 |
|---------|----------------|------|
| 23:00   | 오전 8시        | 아침 출근 시간 전 |
| 07:00   | 오후 4시        | 업무 마무리 전 |

**Cron 표현식**: `0 23,7 * * *`
- `0`: 0분
- `23,7`: 23시와 7시 (UTC)
- `* * *`: 매일, 매월, 모든 요일

---

## 📧 이메일 템플릿

### HTML 버전 (반응형)

**특징**:
- 📊 표 형식으로 리드 정보 정리
- 🎨 브랜드 컬러 (Indigo) 적용
- 📱 모바일 친화적 디자인
- 🔘 대시보드 바로가기 CTA 버튼

**포함 정보**:
- 순번
- 고객명 / 연락처
- 이메일
- 랜딩페이지 제목
- 접속 기기 (🖥️ PC, 📱 모바일, 📲 태블릿)
- 신청 일시

### Plain Text 버전

**특징**:
- HTML 미지원 이메일 클라이언트용
- 모든 정보 텍스트로 제공
- 대시보드 링크 포함

---

## 🔐 보안

### Cron Job 인증

**CRON_SECRET 환경 변수**:
```bash
# 32바이트 랜덤 문자열 생성
openssl rand -base64 32

# .env.local 및 Vercel 환경 변수에 추가
CRON_SECRET=BypTwrdYjYZHpPX3+jJ0zPYJ0lKMWZ29+skGYqaXRm4=
```

**API 인증 로직**:
```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Vercel Cron은 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 포함합니다.

---

## 🗄️ 데이터베이스 스키마

### lead_notification_queue

```sql
CREATE TABLE lead_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_emails TEXT[] NOT NULL,
  lead_data JSONB NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### lead_notification_logs

```sql
CREATE TABLE lead_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_queue_id UUID REFERENCES lead_notification_queue(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  lead_id UUID REFERENCES leads(id),
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  email_provider TEXT DEFAULT 'resend'
);
```

---

## 🧪 테스트 방법

### 1. 로컬 테스트

**수동으로 Cron API 호출**:
```bash
curl -X GET http://localhost:3000/api/cron/lead-digest \
  -H "Authorization: Bearer BypTwrdYjYZHpPX3+jJ0zPYJ0lKMWZ29+skGYqaXRm4="
```

**기대 결과**:
```json
{
  "success": true,
  "message": "Lead digest emails sent",
  "companies": 2,
  "totalLeads": 5,
  "emailsSent": 4,
  "emailsFailed": 0
}
```

### 2. DB에서 미발송 알림 확인

```sql
-- 미발송 알림 조회
SELECT * FROM lead_notification_queue
WHERE sent = false
ORDER BY created_at DESC;

-- 발송 로그 확인
SELECT * FROM lead_notification_logs
ORDER BY sent_at DESC
LIMIT 10;
```

### 3. 테스트 시나리오

1. **랜딩페이지에서 리드 3건 생성**
   ```
   → lead_notification_queue에 3개 항목 추가 (sent=false)
   ```

2. **Cron API 수동 호출**
   ```bash
   curl -X GET http://localhost:3000/api/cron/lead-digest \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **결과 확인**
   - 이메일 수신 확인 (companies.notification_emails에 등록된 주소)
   - `lead_notification_queue`의 `sent`가 `true`로 변경
   - `lead_notification_logs`에 발송 기록 추가

---

## 🚀 Vercel 배포

### 1. 환경 변수 설정

```
Vercel Dashboard → 프로젝트 → Settings → Environment Variables
```

추가할 환경 변수:
- `RESEND_API_KEY`: Resend API 키
- `CRON_SECRET`: Cron job 인증용 랜덤 문자열
- `NEXT_PUBLIC_DOMAIN`: 프로덕션 도메인 (예: https://funnely.co.kr)

### 2. vercel.json 확인

```json
{
  "crons": [
    {
      "path": "/api/cron/lead-digest",
      "schedule": "0 23,7 * * *"
    }
  ]
}
```

### 3. 배포

```bash
git add .
git commit -m "feat: 하루 2회 리드 다이제스트 이메일 시스템 구현"
git push
```

Vercel이 자동으로 배포하고 Cron 작업을 스케줄링합니다.

### 4. Vercel에서 Cron 작업 확인

```
Vercel Dashboard → 프로젝트 → Cron → Logs
```

- 실행 이력 확인
- 성공/실패 상태 확인
- 실행 시간 확인

---

## 📊 모니터링

### 성공적인 발송 로그 예시

```
[Lead Digest] Found 8 pending notifications
[Lead Digest] Email sent to admin@company.com for company abc-123 (5 leads)
[Lead Digest] Email sent to manager@company.com for company abc-123 (5 leads)
[Lead Digest] Email sent to sales@company2.com for company def-456 (3 leads)
```

### 실패 시 로그 예시

```
[Lead Digest] Failed to send to invalid@email.com: Invalid recipient
[Lead Digest] Query error: { message: "relation does not exist" }
```

### 주요 메트릭

- **companies**: 처리된 회사 수
- **totalLeads**: 발송된 리드 총 개수
- **emailsSent**: 성공한 이메일 수
- **emailsFailed**: 실패한 이메일 수

---

## 🔧 트러블슈팅

### 이메일이 발송되지 않음

**원인 1**: CRON_SECRET 불일치
```bash
# 확인 방법
echo $CRON_SECRET
# Vercel 환경 변수와 일치하는지 확인
```

**원인 2**: RESEND_API_KEY 미설정
```bash
# Vercel 환경 변수 확인
vercel env ls
```

**원인 3**: Cron 스케줄 미실행
```
Vercel Dashboard → Cron → Logs
# 실행 이력 확인
```

### 특정 회사만 이메일 수신 안 됨

```sql
-- notification_emails 확인
SELECT id, name, notification_emails
FROM companies
WHERE id = 'company_id';

-- 빈 배열이면 이메일 추가
-- /dashboard/settings/notifications 페이지에서 등록
```

### 중복 이메일 발송

```sql
-- 이미 발송된 알림인지 확인
SELECT * FROM lead_notification_queue
WHERE sent = true
AND lead_id = 'lead_id';

-- sent=true인데 다시 발송되는 경우
-- DB 트리거 또는 큐 업데이트 로직 확인
```

---

## 📚 관련 파일

- `/Users/mh.c/medisync/src/app/api/cron/lead-digest/route.ts` - Cron API 엔드포인트
- `/Users/mh.c/medisync/vercel.json` - Cron 스케줄 설정
- `/Users/mh.c/medisync/supabase/migrations/20250105000000_create_lead_notification_system.sql` - DB 스키마
- `/Users/mh.c/medisync/src/lib/email/send-lead-notification.ts` - 개별 이메일 발송 (테스트용)

---

## ✅ 체크리스트

**배포 전**:
- [ ] `.env.local`에 `RESEND_API_KEY` 설정
- [ ] `.env.local`에 `CRON_SECRET` 설정
- [ ] 로컬에서 수동 Cron API 호출 테스트
- [ ] 이메일 수신 확인

**배포 후**:
- [ ] Vercel 환경 변수 `RESEND_API_KEY` 추가
- [ ] Vercel 환경 변수 `CRON_SECRET` 추가
- [ ] Vercel 환경 변수 `NEXT_PUBLIC_DOMAIN` 추가
- [ ] Vercel Cron Logs에서 실행 확인
- [ ] 프로덕션에서 이메일 수신 확인
- [ ] `lead_notification_logs` 테이블 모니터링

---

**문서 작성일**: 2025-01-21
**최종 업데이트**: 2025-01-21
**작성자**: Claude Code
**프로젝트**: Funnely - 리드 이메일 다이제스트 시스템
