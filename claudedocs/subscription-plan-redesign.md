# 구독 플랜 재설계 - 개인/기업 분리

## 변경 사항 요약

기존 3-Tier 플랜(Free, Pro, Enterprise)에서 **개인/기업 구분**을 추가하여 총 6개 플랜으로 확장합니다.

### 기존 구조
```
Free → Pro → Enterprise
(단일 가격 체계, 월간/연간 선택)
```

### 신규 구조
```
개인 (Individual):
  Free → Starter → Pro

기업 (Business):
  Free → Starter → Enterprise
```

## 데이터베이스 스키마 변경

### 1. subscription_plans 테이블에 `plan_type` 컬럼 추가

```sql
ALTER TABLE subscription_plans
ADD COLUMN plan_type VARCHAR(20) NOT NULL DEFAULT 'individual'
CHECK (plan_type IN ('individual', 'business'));

CREATE INDEX idx_subscription_plans_type ON subscription_plans(plan_type);
```

### 2. 기존 플랜 데이터 정리

```sql
-- 기존 플랜 비활성화
UPDATE subscription_plans SET is_active = false;
```

### 3. 신규 플랜 데이터 삽입

```sql
-- 개인 플랜
INSERT INTO subscription_plans (name, description, plan_type, price_monthly, price_yearly, features, max_users, max_leads, max_campaigns)
VALUES
  -- 개인 Free
  (
    'Free',
    '개인 사용자를 위한 무료 플랜',
    'individual',
    0,
    0,
    '{"basic_analytics": true, "email_support": true}'::jsonb,
    1,  -- 계정 1개
    50,  -- 월 리드 50명
    3    -- 캠페인 3개
  ),
  -- 개인 Starter
  (
    'Starter',
    '개인 전문가를 위한 시작 플랜',
    'individual',
    15900,
    159000,  -- 연간 결제 시 약 16.7% 할인 (월 13,250원)
    '{"basic_analytics": true, "advanced_analytics": true, "email_support": true, "priority_support": false}'::jsonb,
    1,    -- 계정 1개
    500,  -- 월 리드 500명
    10    -- 캠페인 10개
  ),
  -- 개인 Pro
  (
    'Pro',
    '개인 파워 유저를 위한 프로 플랜',
    'individual',
    35900,
    359000,  -- 연간 결제 시 약 16.7% 할인 (월 29,917원)
    '{"basic_analytics": true, "advanced_analytics": true, "email_support": true, "priority_support": true, "custom_reports": true, "api_access": true}'::jsonb,
    3,     -- 계정 3개
    2000,  -- 월 리드 2,000명
    30     -- 캠페인 30개
  ),

-- 기업 플랜
  -- 기업 Free
  (
    'Free',
    '소규모 팀을 위한 무료 플랜',
    'business',
    0,
    0,
    '{"basic_analytics": true, "email_support": true}'::jsonb,
    3,    -- 계정 3개
    100,  -- 월 리드 100명
    5     -- 캠페인 5개
  ),
  -- 기업 Starter
  (
    'Starter',
    '성장하는 팀을 위한 시작 플랜',
    'business',
    159000,
    1590000,  -- 연간 결제 시 약 16.7% 할인 (월 132,500원)
    '{"basic_analytics": true, "advanced_analytics": true, "email_support": true, "priority_support": true, "custom_reports": true, "api_access": true, "team_collaboration": true}'::jsonb,
    5,     -- 계정 5개
    5000,  -- 월 리드 5,000명
    50     -- 캠페인 50개
  ),
  -- 기업 Enterprise
  (
    'Enterprise',
    '대규모 조직을 위한 엔터프라이즈 플랜',
    'business',
    259000,
    2590000,  -- 연간 결제 시 약 16.7% 할인 (월 215,833원)
    '{"basic_analytics": true, "advanced_analytics": true, "enterprise_analytics": true, "email_support": true, "priority_support": true, "dedicated_support": true, "custom_reports": true, "api_access": true, "team_collaboration": true, "custom_integration": true, "sla": true, "white_label": true}'::jsonb,
    10,    -- 계정 10개
    NULL,  -- 무제한 리드
    NULL   -- 무제한 캠페인
  );
```

## UI 변경사항

### 1. 플랜 선택 화면 구조

```
┌─────────────────────────────────────────────┐
│  플랜 타입 선택 (Tab 또는 Toggle)           │
│  [ 개인 ]  [ 기업 ]                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  결제 주기 선택                             │
│  ( 월간 결제 )  ( 연간 결제 - 최대 17% 할인) │
└─────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┐
│   Free   │ Starter  │   Pro    │  (개인 선택 시)
│          │          │          │
│   0원    │ 15,900원 │ 35,900원 │
│  /월     │  /월     │  /월     │
│          │          │          │
│ 계정 1개 │ 계정 1개 │ 계정 3개 │
│ 리드 50  │ 리드 500 │리드 2,000│
│          │          │          │
└──────────┴──────────┴──────────┘

또는

┌──────────┬───────────┬──────────────┐
│   Free   │  Starter  │ Enterprise   │  (기업 선택 시)
│          │           │              │
│   0원    │ 159,000원 │  259,000원   │
│  /월     │   /월     │    /월       │
│          │           │              │
│ 계정 3개 │ 계정 5개  │  계정 10개   │
│리드 100  │리드 5,000 │  무제한      │
│          │           │              │
└──────────┴───────────┴──────────────┘
```

### 2. TypeScript 인터페이스 업데이트

```typescript
interface Plan {
  id: string
  name: string
  description: string
  plan_type: 'individual' | 'business'  // 추가
  price_monthly: number
  price_yearly: number
  features: any
  max_users: number | null
  max_leads: number | null
  max_campaigns: number | null
}
```

### 3. 컴포넌트 변경사항

#### SubscriptionClient.tsx
- `planType` state 추가 (individual/business)
- 플랜 타입 선택 UI 추가 (Tab 또는 Toggle)
- 플랜 필터링 로직 추가: `plans.filter(p => p.plan_type === planType)`
- 플랜 카드 레이아웃 조정 (계정 수 강조 표시)

#### admin/subscriptions/page.tsx
- 플랜 타입 표시 추가
- 필터에 개인/기업 구분 추가 (선택사항)

## 마이그레이션 전략

### 1. 기존 구독 사용자 처리

```sql
-- 기존 Pro 구독자 → 개인 Pro로 자동 매핑
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND plan_type = 'individual'
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND plan_type IS NULL
);

-- 기존 Enterprise 구독자 → 기업 Enterprise로 자동 매핑
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND plan_type = 'business'
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND plan_type IS NULL
);
```

### 2. 마이그레이션 단계

1. **스테이지 1**: DB 스키마 변경 (plan_type 추가)
2. **스테이지 2**: 신규 플랜 데이터 삽입
3. **스테이지 3**: 기존 구독 매핑
4. **스테이지 4**: 프론트엔드 배포
5. **스테이지 5**: 기존 플랜 비활성화

## 가격 전략

### 개인 플랜
| 플랜 | 월간 | 연간 | 연간 할인율 | 계정 수 | 리드 수 |
|------|------|------|-------------|---------|---------|
| Free | 무료 | 무료 | - | 1 | 50 |
| Starter | 15,900원 | 159,000원 | ~16.7% | 1 | 500 |
| Pro | 35,900원 | 359,000원 | ~16.7% | 3 | 2,000 |

### 기업 플랜
| 플랜 | 월간 | 연간 | 연간 할인율 | 계정 수 | 리드 수 |
|------|------|------|-------------|---------|---------|
| Free | 무료 | 무료 | - | 3 | 100 |
| Starter | 159,000원 | 1,590,000원 | ~16.7% | 5 | 5,000 |
| Enterprise | 259,000원 | 2,590,000원 | ~16.7% | 10 | 무제한 |

### 가격 정책 특징
- **연간 결제 할인**: 모든 유료 플랜에 16.7% 할인 적용
- **가격 비율**: 개인/기업 Starter는 정확히 10배 차이
- **계정 수 기반**: 기업 플랜은 더 많은 팀 멤버 지원

## 구현 파일 목록

### 1. 데이터베이스 마이그레이션
- `supabase/migrations/20251219000000_add_plan_type_to_subscriptions.sql`

### 2. 프론트엔드 컴포넌트
- `src/components/subscription/SubscriptionClient.tsx` (수정)
- `src/app/admin/subscriptions/page.tsx` (수정)

### 3. API 엔드포인트
- `src/app/api/admin/subscriptions/route.ts` (수정 불필요, 자동 반영)
- `src/app/dashboard/subscription/page.tsx` (수정 불필요, 서버 컴포넌트)

## 테스트 체크리스트

- [ ] 신규 플랜 생성 확인
- [ ] 개인 → 개인 플랜 변경
- [ ] 개인 → 기업 플랜 변경
- [ ] 기업 → 개인 플랜 변경
- [ ] 기업 → 기업 플랜 변경
- [ ] 월간 → 연간 변경
- [ ] 연간 → 월간 변경
- [ ] 기존 구독 유지 확인
- [ ] 알림 시스템 작동 확인 (플랜 변경 시 알림 생성)
- [ ] Admin 페이지에서 플랜 타입 표시 확인

## UI/UX 개선사항

### 1. 플랜 선택 UX
- 개인/기업 토글을 상단에 명확히 배치
- 현재 선택된 플랜 타입 강조 표시
- 각 플랜 카드에 "추천" 배지 (개인: Pro, 기업: Starter)

### 2. 계정 수 강조
- 플랜 카드 상단에 "최대 N개 계정" 명확히 표시
- 무제한 리드/캠페인은 "무제한" 텍스트로 표시

### 3. 비교 테이블 (선택사항)
- 전체 플랜 비교 테이블 제공
- 개인/기업 나란히 비교 가능

## 향후 확장 계획

### 1. 사용량 기반 요금제
- 리드 수 초과 시 종량제 옵션
- 추가 계정 구매 옵션

### 2. 커스텀 Enterprise 플랜
- 개별 협상 가능한 커스텀 플랜
- 계정 수, 리드 수 커스터마이징

### 3. Add-on 기능
- 추가 스토리지
- 추가 API 호출
- 전담 매니저 서비스
