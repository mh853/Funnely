# 타이머 종료 시 랜딩페이지 자동 비활성화 설계

## 📋 요구사항

스크린샷에 표시된 경고 문구:
> ⚠️ 설정하신 마감 날짜가 지나면 신청 접수가 비활성됩니다. 반드시 마감 날짜를 확인하시기 바랍니다.

**목표**: 타이머 마감 시간이 지나면 해당 랜딩페이지를 자동으로 비활성화하여 더 이상 신청을 받지 않도록 함

## 🎯 설계 개요

### 1. 현재 상태 분석

**데이터베이스 필드 (landing_pages 테이블)**:
- `timer_enabled`: boolean - 타이머 사용 여부
- `timer_deadline`: timestamp - 마감 날짜/시간
- `timer_auto_update`: boolean - 자동 업데이트 여부
- `timer_auto_update_days`: integer - 자동 업데이트 주기 (일)
- `is_active`: boolean - 랜딩페이지 활성화 상태

**현재 동작**:
- 타이머가 화면에 표시되고 카운트다운됨
- 마감 시간 경과 후에도 페이지는 계속 활성 상태 유지
- 자동 업데이트 옵션이 있으면 마감일이 자동 연장

## 🏗️ 아키텍처 설계

### 옵션 1: Cron Job 방식 (권장)

```
┌─────────────────────┐
│   Cron Job          │
│   (매시간 실행)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check Expired      │
│  Landing Pages      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  timer_enabled &&   │
│  !timer_auto_update │
│  && deadline < now  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update             │
│  is_active = false  │
└─────────────────────┘
```

**장점**:
- 서버 측에서 안정적으로 처리
- 클라이언트 접속 여부와 무관
- 일관된 비활성화 시점 보장

**단점**:
- Cron job 설정 필요
- 최대 1시간의 지연 가능 (매시간 실행 시)

### 옵션 2: Client-Side 체크 방식

```
┌─────────────────────┐
│  User Visits        │
│  Landing Page       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check Timer        │
│  Deadline           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  If Expired         │
│  Show Closed Notice │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Disable Form       │
│  Submission         │
└─────────────────────┘
```

**장점**:
- 즉각적인 반응
- 추가 인프라 불필요

**단점**:
- 사용자가 접속해야 동작
- 일관성 보장 어려움

### ✅ 선택: 하이브리드 방식

**Cron Job (Primary)** + **Client-Side Check (Fallback)**

## 📝 상세 설계

### 1. 데이터베이스 스키마 확인

```sql
-- 필요한 컬럼 확인
landing_pages:
  - id (uuid)
  - company_id (uuid)
  - timer_enabled (boolean)
  - timer_deadline (timestamp with time zone)
  - timer_auto_update (boolean)
  - timer_auto_update_days (integer)
  - is_active (boolean)
  - updated_at (timestamp)
```

### 2. Cron Job API 엔드포인트

**파일**: `src/app/api/cron/disable-expired-timers/route.ts`

```typescript
/**
 * 타이머 마감 시간이 지난 랜딩페이지 자동 비활성화
 *
 * 실행 주기: 매시간
 *
 * 로직:
 * 1. timer_enabled = true
 * 2. timer_auto_update = false (자동 업데이트 비활성화)
 * 3. timer_deadline < 현재 시간
 * 4. is_active = true (현재 활성화 상태)
 *
 * 위 조건을 만족하는 랜딩페이지를 찾아 is_active = false로 업데이트
 */

export async function GET(request: Request) {
  // 1. Cron 인증 확인 (Vercel Cron Secret)
  // 2. Supabase 클라이언트 생성
  // 3. 만료된 랜딩페이지 조회
  // 4. 일괄 비활성화 처리
  // 5. 결과 반환
}
```

### 3. vercel.json Cron 설정

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/lead-digest",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/cron/disable-expired-timers",
      "schedule": "0 * * * *"
    }
  ]
}
```

**스케줄**: `0 * * * *` (매시간 정각)

### 4. 클라이언트 측 Fallback

**파일**: `src/app/[companyShortId]/landing/[slug]/page.tsx`

```typescript
// 랜딩페이지 로드 시 타이머 체크
useEffect(() => {
  if (landingPage.timer_enabled &&
      landingPage.timer_deadline &&
      !landingPage.timer_auto_update) {

    const deadline = new Date(landingPage.timer_deadline).getTime()
    const now = Date.now()

    if (now > deadline) {
      // 타이머 만료됨 - 폼 비활성화 UI 표시
      setIsExpired(true)
    }
  }
}, [landingPage])
```

### 5. UI 업데이트

**타이머 만료 시 표시할 메시지**:

```tsx
{isExpired && (
  <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-8 text-center">
    <div className="text-gray-500 text-lg mb-2">⏰ 마감되었습니다</div>
    <p className="text-gray-600">
      신청 기간이 종료되어 더 이상 접수를 받지 않습니다.
    </p>
  </div>
)}

{!isExpired && (
  <form onSubmit={handleSubmit}>
    {/* 기존 폼 내용 */}
  </form>
)}
```

## 🔄 동작 흐름

### Case 1: 자동 업데이트 비활성화 (timer_auto_update = false)

```
1. 타이머 마감 시간 도래
2. Cron Job 실행 (매시간)
3. 조건 체크:
   - timer_enabled = true ✓
   - timer_auto_update = false ✓
   - deadline < now ✓
   - is_active = true ✓
4. is_active를 false로 업데이트
5. 다음 접속 시 "마감되었습니다" 메시지 표시
```

### Case 2: 자동 업데이트 활성화 (timer_auto_update = true)

```
1. 타이머 마감 시간 도래
2. Cron Job 실행
3. 조건 체크:
   - timer_enabled = true ✓
   - timer_auto_update = true ✗ (조건 불만족)
4. 비활성화하지 않음
5. 자동 업데이트 로직에 의해 마감일 연장
```

### Case 3: 클라이언트 측 Fallback

```
1. 사용자가 랜딩페이지 방문
2. 타이머 만료 체크 (클라이언트)
3. 만료됨 → 폼 비활성화 UI 표시
4. 폼 제출 시도 시 에러 메시지
```

## 🛡️ 보안 고려사항

### 1. Cron Job 인증

```typescript
// Vercel Cron Secret 검증
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### 2. 클라이언트 측 검증

```typescript
// API에서도 타이머 만료 체크
export async function POST(request: Request) {
  // ... 랜딩페이지 조회

  if (landingPage.timer_enabled &&
      landingPage.timer_deadline &&
      !landingPage.timer_auto_update) {

    const deadline = new Date(landingPage.timer_deadline)
    if (new Date() > deadline) {
      return NextResponse.json(
        { error: '신청 기간이 종료되었습니다.' },
        { status: 403 }
      )
    }
  }

  // ... 리드 생성 로직
}
```

## 📊 로깅 및 모니터링

### Cron Job 실행 로그

```typescript
const result = {
  timestamp: new Date().toISOString(),
  checked: totalCount,
  disabled: disabledCount,
  landingPages: disabledIds
}

console.log('[CRON] Disable Expired Timers:', result)
```

### Supabase Edge Function 활용 (선택적)

더 정밀한 제어가 필요한 경우 Supabase Edge Function 사용 고려

## 🧪 테스트 시나리오

### 1. 기본 동작 테스트

```typescript
// 테스트 데이터 생성
const expiredLandingPage = {
  timer_enabled: true,
  timer_auto_update: false,
  timer_deadline: '2026-01-22T00:00:00Z', // 과거 시간
  is_active: true
}

// Cron Job 실행
// 결과: is_active = false

// 검증
expect(landingPage.is_active).toBe(false)
```

### 2. 자동 업데이트 예외 테스트

```typescript
const autoUpdateLandingPage = {
  timer_enabled: true,
  timer_auto_update: true, // 자동 업데이트 활성화
  timer_deadline: '2026-01-22T00:00:00Z',
  is_active: true
}

// Cron Job 실행
// 결과: is_active = true (변경 없음)

expect(landingPage.is_active).toBe(true)
```

### 3. 클라이언트 Fallback 테스트

```typescript
// 컴포넌트 렌더링
render(<LandingPage landingPage={expiredLandingPage} />)

// 검증
expect(screen.getByText('마감되었습니다')).toBeInTheDocument()
expect(screen.queryByRole('form')).not.toBeInTheDocument()
```

## 🚀 구현 순서

1. ✅ **설계 문서 작성** (현재 단계)
2. 🔄 **데이터베이스 스키마 확인**
3. 🔄 **Cron Job API 구현**
4. 🔄 **vercel.json 업데이트**
5. 🔄 **클라이언트 Fallback 구현**
6. 🔄 **API 제출 검증 추가**
7. 🔄 **테스트 및 검증**

## 📌 추가 고려사항

### 1. 관리자 알림

마감 전 24시간에 관리자에게 알림 이메일 발송:

```typescript
// 별도 Cron Job
if (deadline - now < 24 * 60 * 60 * 1000) {
  await sendEmail({
    to: adminEmail,
    subject: `[알림] 랜딩페이지 "${title}" 24시간 내 마감`,
    body: `...`
  })
}
```

### 2. 재활성화 기능

관리자가 마감 후에도 수동으로 재활성화할 수 있는 UI 제공

### 3. 타임존 처리

모든 시간은 KST (Asia/Seoul) 기준으로 처리

```typescript
const deadline = new Date(landingPage.timer_deadline)
// Supabase는 UTC로 저장, 클라이언트에서 로컬 시간으로 변환
```

## 🔗 관련 파일

- `/src/app/api/cron/disable-expired-timers/route.ts` (신규)
- `/src/app/[companyShortId]/landing/[slug]/page.tsx` (수정)
- `/src/app/api/public-landing/[slug]/submit/route.ts` (수정)
- `/vercel.json` (수정)
- `/src/components/landing-pages/LandingPageNewForm.tsx` (참고)

---

## 💡 결론

이 설계는 타이머 만료 시 랜딩페이지를 자동으로 비활성화하여 사용자 경험과 데이터 정합성을 보장합니다.

**핵심 원칙**:
1. 서버 측 Cron Job으로 안정적인 비활성화
2. 클라이언트 측 Fallback으로 즉각적인 UI 반응
3. API 레벨 검증으로 보안 강화
4. 자동 업데이트 옵션 존중
