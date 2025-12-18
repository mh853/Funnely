# Admin Subscriptions API - 구현 완료

## 🎯 문제 원인

**API 엔드포인트 미구현** - `/api/admin/subscriptions` API 파일이 존재하지 않아 404 에러 발생

## 🔍 문제 상세

### 에러 로그
```
GET /api/admin/subscriptions?page=1&limit=20 404 in 31ms
Failed to load resource: the server responded with a status of 404 (Not Found)
```

### 원인 분석
1. 프론트엔드 페이지: `/app/admin/subscriptions/page.tsx` ✅ 존재
2. **API 엔드포인트**: `/app/api/admin/subscriptions/route.ts` ❌ **존재하지 않음**
3. 데이터베이스 테이블: `company_subscriptions` ✅ 존재 (마이그레이션 완료)

**결론**: 알림센터와 동일한 패턴 - API 파일만 없어서 404 에러 발생

## ✅ 해결 방법

### 구현된 API 엔드포인트

**1. GET /api/admin/subscriptions**
[src/app/api/admin/subscriptions/route.ts](src/app/api/admin/subscriptions/route.ts)

기능:
- 구독 목록 조회 (페이지네이션)
- 상태별 필터링 (`status` 파라미터)
- 회사 정보 및 플랜 정보 조인
- Super Admin 권한 체크

쿼리 파라미터:
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 개수 (기본값: 20, 최대: 100)
- `status`: 구독 상태 필터 (all|active|trial|expired|cancelled|suspended)

응답 형식:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "status": "active",
      "billing_cycle": "monthly",
      "current_period_start": "2025-01-01T00:00:00Z",
      "current_period_end": "2025-02-01T00:00:00Z",
      "trial_end": null,
      "cancelled_at": null,
      "company": {
        "id": "uuid",
        "name": "퍼널리",
        "business_number": "123-45-67890",
        "phone": "02-1234-5678"
      },
      "plan": {
        "id": "uuid",
        "name": "Pro",
        "price_monthly": 49000,
        "price_yearly": 490000,
        "max_users": 10,
        "max_leads": 5000
      },
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**2. PATCH /api/admin/subscriptions/[id]**
[src/app/api/admin/subscriptions/[id]/route.ts](src/app/api/admin/subscriptions/[id]/route.ts)

기능:
- 구독 상태 업데이트
- 취소 시 `cancelled_at` 자동 설정
- 상태 유효성 검증

요청 형식:
```json
{
  "status": "active"
}
```

유효한 상태값:
- `active`: 활성
- `trial`: 체험
- `expired`: 만료
- `cancelled`: 취소
- `suspended`: 정지

응답 형식:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "status": "active",
    "cancelled_at": null,
    ...
  }
}
```

### 데이터베이스 스키마

[supabase/migrations/20251213000012_create_subscription_tables.sql](supabase/migrations/20251213000012_create_subscription_tables.sql)

**주요 테이블**:

1. **subscription_plans** (구독 플랜)
   - `id`, `name`, `description`
   - `price_monthly`, `price_yearly`
   - `max_users`, `max_leads`, `max_campaigns`
   - `features` (JSONB)
   - `is_active`

2. **company_subscriptions** (회사 구독)
   - `id`, `company_id`, `plan_id`
   - `status` (active, trial, expired, cancelled, suspended)
   - `billing_cycle` (monthly, yearly)
   - `current_period_start`, `current_period_end`
   - `trial_end`, `cancelled_at`

3. **payments** (결제 내역)
   - `id`, `company_id`, `subscription_id`
   - `amount`, `status`
   - `payment_method`, `payment_provider`
   - `paid_at`, `refunded_at`

4. **invoices** (청구서)
   - `id`, `company_id`, `subscription_id`
   - `invoice_number`, `amount`, `total_amount`
   - `status` (draft, issued, paid, overdue, void)
   - `due_date`, `paid_at`

5. **usage_logs** (사용량 추적)
   - `id`, `company_id`
   - `resource_type` (leads, users, api_calls, storage)
   - `quantity`, `period_start`, `period_end`

**기본 플랜 데이터**:
- Free: ₩0 (월), 사용자 2명, 리드 100개
- Pro: ₩49,000 (월), 사용자 10명, 리드 5,000개
- Enterprise: ₩199,000 (월), 무제한

## 📊 테스트 결과

### 데이터베이스 상태 (초기)
```
Total subscriptions: 0
```

### 테스트 데이터 생성
```bash
node scripts/create-test-subscriptions.mjs
```

생성된 테스트 구독 (3개):
1. ✅ ACTIVE - monthly (퍼널리)
2. ✅ TRIAL - yearly (홍란의 병원)
3. ✅ ACTIVE - monthly (최문호의 병원)

### 최종 상태
```
📊 Summary:
   Active subscriptions: 2
   Trial subscriptions: 1
```

## 📝 관련 파일

### 새로 생성된 파일
1. [src/app/api/admin/subscriptions/route.ts](src/app/api/admin/subscriptions/route.ts)
   - GET 엔드포인트: 구독 목록 조회

2. [src/app/api/admin/subscriptions/[id]/route.ts](src/app/api/admin/subscriptions/[id]/route.ts)
   - PATCH 엔드포인트: 구독 상태 업데이트

3. [scripts/create-test-subscriptions.mjs](scripts/create-test-subscriptions.mjs)
   - 테스트 구독 생성 스크립트

### 기존 파일 (수정 없음)
- [src/app/admin/subscriptions/page.tsx](src/app/admin/subscriptions/page.tsx) - 프론트엔드 페이지
- [supabase/migrations/20251213000012_create_subscription_tables.sql](supabase/migrations/20251213000012_create_subscription_tables.sql) - DB 스키마

## 🔧 구현 패턴

### Companies, Notifications API와 동일한 패턴
1. **인증**: `getSuperAdminUser()` 사용
2. **페이지네이션**: page/limit/offset 구조
3. **필터링**: 쿼리 파라미터로 조건 제어
4. **에러 처리**: try-catch 및 적절한 HTTP 상태 코드
5. **Service Role Key**: RLS 우회하여 모든 데이터 접근

### 프론트엔드 - API 계약
프론트엔드는 다음 구조를 기대:
```typescript
interface Subscription {
  id: string
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancelled_at: string | null
  company: {
    id: string
    name: string
    business_number: string
    phone: string
  }
  plan: {
    id: string
    name: string
    price_monthly: number
    price_yearly: number
    max_users: number | null
    max_leads: number | null
  }
  created_at: string
}
```

## 🧪 테스트 방법

### 1. 브라우저 테스트
```
http://localhost:3001/admin/subscriptions
```

확인 사항:
- ✅ 구독 목록이 3개 표시되는지
- ✅ 회사명, 플랜명이 정확히 표시되는지
- ✅ 상태 필터 (전체/활성/체험/만료/취소/정지) 동작 확인
- ✅ "상태 변경" 버튼 클릭 후 업데이트 확인
- ✅ 페이지네이션 동작 확인

### 2. API 직접 테스트
```bash
# 구독 목록 조회 (브라우저에서 로그인 필요)
curl http://localhost:3001/api/admin/subscriptions?page=1&limit=20

# 활성 구독만 조회
curl http://localhost:3001/api/admin/subscriptions?status=active

# 체험 구독만 조회
curl http://localhost:3001/api/admin/subscriptions?status=trial
```

## 🔄 다음 단계 (선택사항)

### 결제 내역 연동
- 결제 내역 (payments) 테이블 데이터 표시
- 청구서 (invoices) 생성 및 조회
- 결제 통계 대시보드

### 구독 관리 기능
- 플랜 변경 기능 (업그레이드/다운그레이드)
- 결제 정보 관리
- 자동 갱신 설정

### 사용량 추적
- 사용량 로그 (usage_logs) 시각화
- 제한 초과 알림
- 사용량 기반 과금

## 💡 패턴 일관성

이번 구현으로 Admin 페이지 API 패턴이 확립되었습니다:

1. **Companies** (✅ 완료)
   - GET /api/admin/companies
   - 회사 목록, 구독 정보 표시

2. **Notifications** (✅ 완료)
   - GET /api/admin/notifications
   - POST /api/admin/notifications/mark-read
   - Realtime 구독 적용

3. **Subscriptions** (✅ 완료)
   - GET /api/admin/subscriptions
   - PATCH /api/admin/subscriptions/[id]

### 공통 패턴
```typescript
// 1. 인증
const adminUser = await getSuperAdminUser()
if (!adminUser) return 401

// 2. 파라미터 파싱
const { searchParams } = new URL(request.url)
const page = parseInt(searchParams.get('page') || '1')

// 3. Service Role 사용
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 4. Count + Data 쿼리
const { count } = await countQuery
const { data } = await dataQuery

// 5. 상세 정보 조인
const withDetails = await Promise.all(
  data.map(async (item) => {
    // Join related tables
  })
)

// 6. 페이지네이션 응답
return NextResponse.json({
  items: withDetails,
  pagination: { total, page, limit, totalPages, hasNext, hasPrev }
})
```

## ✨ 구현 완료 기능

이번 작업으로 완성된 기능:
1. ✅ 구독 목록 조회 (페이지네이션)
2. ✅ 상태별 필터링 (활성/체험/만료/취소/정지)
3. ✅ 구독 상태 업데이트
4. ✅ 회사 정보 및 플랜 정보 표시
5. ✅ 구독 기간 (시작일, 종료일) 표시
6. ✅ 체험 종료일 표시
7. ✅ 취소일 표시
8. ✅ 테스트 데이터 생성 스크립트

브라우저를 새로고침하면 구독 목록이 정상적으로 표시됩니다! 🎉
