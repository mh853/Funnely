# 리드 유입 이메일 알림 시스템 설계

## 목적
공개 랜딩페이지를 통해 리드(DB)가 유입될 때 지정된 이메일 주소로 실시간 알림을 전송하는 기능

## 시스템 구성요소

### 1. 데이터베이스 스키마

#### companies 테이블 확장
```sql
ALTER TABLE companies
ADD COLUMN notification_emails TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN companies.notification_emails IS '리드 유입 시 알림받을 이메일 주소 목록';
```

**설계 결정**:
- `TEXT[]` 배열 타입 사용 → 여러 이메일 주소 저장 가능
- 기본값: 빈 배열 → 기존 데이터 호환성
- NULL 허용 X → 빈 배열로 명확한 상태 표현

### 2. 이메일 전송 시스템

#### 전송 방식 선택
**옵션 A: Supabase Edge Function (권장)**
- 장점: 서버리스, 자동 스케일링, Supabase 네이티브 통합
- 단점: 콜드 스타트 지연 가능성

**옵션 B: Next.js API Route**
- 장점: 기존 인프라 활용, 빠른 응답
- 단점: 서버 리소스 사용

**선택**: Next.js API Route (`/api/notifications/send-lead-email`)
- 이유: 기존 코드베이스와 통합 용이, 즉각적인 응답

#### 이메일 서비스 프로바이더
**옵션**:
1. Resend (권장)
   - 한국어 지원
   - 개발자 친화적 API
   - 무료 플랜: 3,000통/월

2. SendGrid
   - 무료 플랜: 100통/일
   - 복잡한 설정

3. AWS SES
   - 저렴한 비용
   - 복잡한 설정, 초기 승인 필요

**선택**: Resend
- 이유: 간단한 API, 한국어 지원, 빠른 전송

### 3. UI 컴포넌트

#### A. 설정 페이지 (dashboard/settings)
**위치**: [src/app/dashboard/settings/page.tsx:132-203](src/app/dashboard/settings/page.tsx#L132-L203)의 Quick Settings Links 섹션에 추가

**새 링크 컴포넌트**:
```tsx
<Link
  href="/dashboard/settings/notifications"
  className="group flex items-center gap-3 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-xl px-4 py-3 transition-all shadow-sm hover:shadow"
>
  <div className="flex-shrink-0 bg-orange-100 rounded-lg p-2 group-hover:bg-orange-200 transition-colors">
    <BellIcon className="h-5 w-5 text-orange-600" />
  </div>
  <div className="flex-1 min-w-0">
    <h3 className="text-sm font-medium text-gray-900 truncate">이메일 알림</h3>
    <p className="text-xs text-gray-500 truncate">리드 유입 알림 수신</p>
  </div>
  <svg className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
</Link>
```

#### B. 알림 설정 페이지 (dashboard/settings/notifications)
**경로**: `/dashboard/settings/notifications`
**파일**: `src/app/dashboard/settings/notifications/page.tsx` (신규)

**기능**:
1. 이메일 주소 추가/삭제
2. 이메일 유효성 검증
3. 테스트 이메일 전송
4. 권한 체크 (company_owner, company_admin만 수정 가능)

**UI 구성**:
```
┌─────────────────────────────────────┐
│ 🔔 이메일 알림 설정                   │
│ 리드 유입 시 알림받을 이메일 관리      │
├─────────────────────────────────────┤
│                                     │
│ 📧 등록된 이메일 주소                 │
│ ┌─────────────────────────────────┐ │
│ │ test@example.com           [X]  │ │
│ │ admin@company.com          [X]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ➕ 새 이메일 추가                     │
│ ┌─────────────────────────────────┐ │
│ │ email@example.com          [추가]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📤 테스트 이메일 전송                 │
│ [테스트 메일 보내기]                  │
│                                     │
│ ⚠️ 알림 수신 조건                     │
│ • 랜딩페이지에서 리드 제출 시          │
│ • 즉시 전송 (실시간)                  │
│ • 최대 5개 이메일 주소 등록 가능       │
└─────────────────────────────────────┘
```

#### C. NotificationEmailSettings 컴포넌트
**파일**: `src/components/settings/NotificationEmailSettings.tsx` (신규)

**Props**:
```typescript
interface NotificationEmailSettingsProps {
  companyId: string
  initialEmails: string[]
  canEdit: boolean
}
```

**상태 관리**:
```typescript
const [emails, setEmails] = useState<string[]>(initialEmails)
const [newEmail, setNewEmail] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [testLoading, setTestLoading] = useState(false)
```

**API 엔드포인트**:
- GET `/api/settings/notification-emails` - 이메일 목록 조회
- POST `/api/settings/notification-emails` - 이메일 추가
- DELETE `/api/settings/notification-emails` - 이메일 삭제
- POST `/api/notifications/test-lead-email` - 테스트 이메일 전송

### 4. 알림 트리거 시스템

#### Database Trigger (권장)
```sql
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  notification_emails TEXT[];
  company_name TEXT;
BEGIN
  -- Get company notification emails
  SELECT c.notification_emails, c.name
  INTO notification_emails, company_name
  FROM companies c
  WHERE c.id = NEW.company_id;

  -- If emails exist, trigger notification
  IF array_length(notification_emails, 1) > 0 THEN
    -- Insert into notification queue
    INSERT INTO lead_notification_queue (
      lead_id,
      company_id,
      recipient_emails,
      lead_data,
      created_at
    ) VALUES (
      NEW.id,
      NEW.company_id,
      notification_emails,
      jsonb_build_object(
        'name', NEW.name,
        'phone', NEW.phone,
        'landing_page_id', NEW.landing_page_id
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_lead
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION notify_new_lead();
```

#### 알림 큐 테이블
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

CREATE INDEX idx_lead_notification_queue_sent ON lead_notification_queue(sent, created_at);
CREATE INDEX idx_lead_notification_queue_company_id ON lead_notification_queue(company_id);
```

**설계 결정**:
- 큐 테이블 사용 → 전송 실패 시 재시도 가능
- JSONB로 리드 데이터 저장 → 리드 삭제 후에도 알림 이력 유지
- retry_count 추가 → 최대 3회 재시도 로직

### 5. 이메일 전송 워커

#### Cron Job API Route
**파일**: `src/app/api/cron/send-lead-notifications/route.ts` (신규)

**실행 주기**: 1분마다 (Vercel Cron)

**로직**:
```typescript
export async function GET(request: NextRequest) {
  // 1. 미전송 알림 조회 (retry_count < 3)
  const { data: pendingNotifications } = await supabase
    .from('lead_notification_queue')
    .select('*')
    .eq('sent', false)
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  // 2. 각 알림에 대해 이메일 전송
  for (const notification of pendingNotifications) {
    try {
      await sendLeadNotificationEmail(notification)

      // 3. 성공 시 sent = true 업데이트
      await supabase
        .from('lead_notification_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', notification.id)
    } catch (error) {
      // 4. 실패 시 retry_count 증가
      await supabase
        .from('lead_notification_queue')
        .update({
          retry_count: notification.retry_count + 1,
          error: error.message
        })
        .eq('id', notification.id)
    }
  }

  return NextResponse.json({ processed: pendingNotifications.length })
}
```

**Vercel Cron 설정**:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/send-lead-notifications",
    "schedule": "* * * * *"
  }]
}
```

### 6. 이메일 템플릿

#### 리드 유입 알림 이메일
**제목**: `[Funnely] 새로운 상담 신청 - {고객명}`

**본문 (HTML)**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .info-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; margin-top: 4px; }
    .button { background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 새로운 상담 신청이 도착했습니다!</h1>
      <p>랜딩페이지를 통해 신규 리드가 유입되었습니다.</p>
    </div>

    <div class="content">
      <div class="info-row">
        <div class="label">👤 고객명</div>
        <div class="value">{고객명}</div>
      </div>

      <div class="info-row">
        <div class="label">📞 연락처</div>
        <div class="value">{전화번호}</div>
      </div>

      <div class="info-row">
        <div class="label">📄 랜딩페이지</div>
        <div class="value">{랜딩페이지_제목}</div>
      </div>

      <div class="info-row">
        <div class="label">⏰ 신청 시간</div>
        <div class="value">{신청_시간}</div>
      </div>

      <div class="info-row">
        <div class="label">📱 디바이스</div>
        <div class="value">{디바이스_타입}</div>
      </div>

      <a href="{대시보드_URL}" class="button">
        대시보드에서 확인하기 →
      </a>
    </div>

    <div class="footer">
      <p>이 이메일은 Funnely 알림 설정에 따라 자동 발송되었습니다.</p>
      <p>알림 설정은 <a href="{설정_URL}">여기</a>에서 변경할 수 있습니다.</p>
    </div>
  </div>
</body>
</html>
```

## 구현 순서

### Phase 1: 데이터베이스 및 기본 설정 (30분)
1. ✅ companies 테이블에 notification_emails 컬럼 추가
2. ✅ lead_notification_queue 테이블 생성
3. ✅ Database trigger 생성 (notify_new_lead)

### Phase 2: UI 구현 (1시간)
1. ✅ NotificationEmailSettings 컴포넌트 생성
2. ✅ /dashboard/settings/notifications 페이지 생성
3. ✅ /dashboard/settings 페이지에 링크 추가

### Phase 3: API 엔드포인트 (1시간)
1. ✅ GET/POST/DELETE `/api/settings/notification-emails`
2. ✅ POST `/api/notifications/test-lead-email`
3. ✅ Resend 이메일 서비스 통합

### Phase 4: 이메일 전송 시스템 (1시간)
1. ✅ `/api/cron/send-lead-notifications` Cron Job 구현
2. ✅ 이메일 템플릿 작성 (HTML/Plain Text)
3. ✅ 재시도 로직 구현

### Phase 5: 테스트 및 배포 (30분)
1. ✅ 테스트 이메일 전송 확인
2. ✅ 실제 리드 유입 시나리오 테스트
3. ✅ Vercel Cron 설정 및 배포

## 환경 변수

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_DOMAIN=https://funnely.co.kr
```

## 보안 고려사항

1. **이메일 주소 유효성 검증**
   - 정규식으로 이메일 형식 체크
   - DNS MX 레코드 검증 (선택사항)

2. **스팸 방지**
   - 회사당 최대 5개 이메일 주소 제한
   - Rate limiting: 1분당 최대 1회 테스트 이메일

3. **권한 관리**
   - company_owner, company_admin만 수정 가능
   - RLS 정책으로 접근 제어

4. **개인정보 보호**
   - 이메일 내용에 최소한의 개인정보만 포함
   - HTTPS로 모든 통신 암호화

## 모니터링 및 로깅

1. **전송 성공률 추적**
   - lead_notification_queue 테이블의 sent 비율
   - 재시도 횟수 통계

2. **에러 로깅**
   - 전송 실패 이유 기록
   - Vercel 로그 모니터링

3. **알림 대시보드 (향후 구현)**
   - 전송 성공/실패 통계
   - 평균 전송 시간
   - 이메일별 오픈율

## 비용 예측

**Resend 무료 플랜**: 3,000통/월
- 회사당 평균 리드: 10건/일
- 회사당 이메일 수신자: 2명
- 월간 이메일: 10 × 2 × 30 = 600통/회사
- 최대 지원 회사 수: 5개 회사 (3,000 ÷ 600)

**확장 시 비용**:
- Resend Pro: $20/월 (50,000통)
- Enterprise: 커스텀 가격

## 향후 개선사항

1. **알림 채널 확장**
   - SMS 알림 (Twilio, Aligo)
   - Slack/Discord 웹훅
   - 카카오톡 알림톡

2. **알림 설정 고도화**
   - 알림 조건 필터링 (특정 랜딩페이지만)
   - 알림 시간대 설정 (영업시간 only)
   - 일간/주간 요약 이메일

3. **이메일 템플릿 커스터마이징**
   - 회사별 로고 삽입
   - 커스텀 메시지 추가
   - 브랜딩 컬러 적용

4. **분석 기능**
   - 이메일 오픈율 추적
   - 클릭율 분석 (UTM 파라미터)
   - A/B 테스트

## 참고 문서

- [Resend API Documentation](https://resend.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase Database Triggers](https://supabase.com/docs/guides/database/triggers)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
