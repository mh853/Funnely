# Phase 3: 재무 및 수익 관리 - 설계

## 목표
SaaS 비즈니스의 재무 건강도를 측정하고, 수익 성장 및 이탈 방지 전략을 수립

## 📊 Phase 3.1: 수익 지표 계산 (MRR/ARR)

### 데이터베이스 스키마
이미 생성됨: `revenue_metrics` 테이블 (Phase 1.1에서 생성)

```sql
-- Phase 1.1에서 이미 생성됨
CREATE TABLE revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),

  -- 수익 지표
  mrr DECIMAL(12,2) NOT NULL,           -- Monthly Recurring Revenue
  arr DECIMAL(12,2) NOT NULL,           -- Annual Recurring Revenue

  -- 성장률
  mrr_growth_rate DECIMAL(5,2),         -- MoM 성장률 (%)
  arr_growth_rate DECIMAL(5,2),         -- YoY 성장률 (%)

  -- 세그먼트 정보
  plan_type TEXT,
  billing_cycle TEXT,

  -- 메타데이터
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, calculated_at::date)
);
```

### 계산 로직

**MRR (Monthly Recurring Revenue)**:
```typescript
function calculateMRR(subscription: Subscription): number {
  const { amount, billing_cycle } = subscription

  switch (billing_cycle) {
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
    case 'quarterly':
      return amount / 3
    default:
      return 0
  }
}
```

**ARR (Annual Recurring Revenue)**:
```typescript
function calculateARR(mrr: number): number {
  return mrr * 12
}
```

**성장률 계산**:
```typescript
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
```

### API 엔드포인트

#### GET /api/admin/revenue/metrics
전체 수익 지표 조회

**Response**:
```typescript
{
  current: {
    mrr: 50000,
    arr: 600000,
    mrr_growth: 5.2,     // %
    arr_growth: 15.8     // %
  },
  breakdown: {
    by_plan: [{
      plan_name: 'Pro',
      companies: 25,
      mrr: 30000
    }],
    by_billing_cycle: [{
      cycle: 'yearly',
      companies: 10,
      mrr: 20000
    }]
  },
  trends: {
    last_6_months: [{
      month: '2025-07',
      mrr: 48000,
      arr: 576000
    }]
  }
}
```

---

## 💰 Phase 3.2: 수익 대시보드

### UI 컴포넌트

**위치**: `/admin/revenue`

**주요 위젯**:
1. **MRR/ARR 카드**: 현재 값 + 성장률 표시
2. **수익 추이 차트**: 지난 6개월 MRR/ARR 라인 차트
3. **플랜별 분포**: 파이 차트
4. **결제 주기별 분포**: 바 차트

**컴포넌트 구조**:
```
src/app/admin/revenue/
├── page.tsx                      # 메인 대시보드
└── components/
    ├── RevenueMetricsCard.tsx    # MRR/ARR 카드
    ├── RevenueTrendChart.tsx     # 추이 차트
    ├── PlanBreakdownChart.tsx    # 플랜별 분포
    └── BillingCycleChart.tsx     # 결제 주기 분포
```

---

## 📉 Phase 3.3: 이탈 분석 시스템

### 데이터베이스 스키마
이미 생성됨: `churn_records` 테이블 (Phase 1.1에서 생성)

```sql
-- Phase 1.1에서 이미 생성됨
CREATE TABLE churn_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),

  -- 이탈 정보
  churned_at TIMESTAMPTZ NOT NULL,
  churn_reason TEXT,
  churn_category TEXT,              -- 'pricing', 'feature', 'support', 'other'

  -- 재무 영향
  lost_mrr DECIMAL(10,2),
  lost_arr DECIMAL(10,2),

  -- 고객 정보
  tenure_days INTEGER,               -- 사용 기간 (일)
  lifetime_value DECIMAL(12,2),     -- 총 결제 금액

  -- 예방 가능성
  was_preventable BOOLEAN,
  risk_score_at_churn INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 이탈률 계산

```typescript
interface ChurnMetrics {
  period: 'monthly' | 'quarterly' | 'yearly'
  churn_rate: number              // %
  churned_companies: number
  lost_mrr: number
  lost_arr: number
  average_tenure: number          // 평균 사용 기간 (일)
}

function calculateChurnRate(
  churnedCompanies: number,
  totalCompaniesAtStart: number
): number {
  if (totalCompaniesAtStart === 0) return 0
  return (churnedCompanies / totalCompaniesAtStart) * 100
}
```

### API 엔드포인트

#### GET /api/admin/churn/analysis
이탈 분석 데이터 조회

**Query Parameters**:
- `period`: monthly | quarterly | yearly

**Response**:
```typescript
{
  period: 'monthly',
  churn_rate: 2.5,              // %
  churned_companies: 3,
  lost_mrr: 1500,
  lost_arr: 18000,

  reasons: [{
    category: 'pricing',
    count: 2,
    percentage: 66.7
  }],

  trends: {
    last_12_months: [{
      month: '2025-07',
      churn_rate: 2.5,
      churned_count: 3
    }]
  },

  preventable_analysis: {
    preventable_count: 2,
    preventable_percentage: 66.7,
    avg_risk_score: 75
  }
}
```

---

## 🚀 Phase 3.4: 성장 기회 식별

### 업셀/다운셀 신호 감지

**신호 종류**:
1. **사용량 한계 근접**: 리드 수, 사용자 수 90% 이상
2. **고급 기능 미사용**: Pro 플랜 필요 기능 사용 시도
3. **활성도 증가**: 지난 달 대비 사용량 30% 이상 증가
4. **활성도 감소**: 지난 달 대비 사용량 50% 이상 감소 (다운셀 위험)

### API 엔드포인트

#### GET /api/admin/growth-opportunities
성장 기회 목록 조회

**Response**:
```typescript
{
  upsell_opportunities: [{
    company_id: 'xxx',
    company_name: 'ABC Corp',
    current_plan: 'Basic',
    recommended_plan: 'Pro',
    signals: [
      { type: 'usage_limit', message: '리드 수 95% 사용 중' },
      { type: 'feature_attempt', message: 'API 연동 시도 3회' }
    ],
    estimated_additional_mrr: 200,
    confidence: 85
  }],

  downsell_risks: [{
    company_id: 'yyy',
    company_name: 'XYZ Inc',
    current_plan: 'Pro',
    signals: [
      { type: 'low_usage', message: '활성도 60% 감소' }
    ],
    potential_lost_mrr: 150,
    risk_level: 'high'
  }]
}
```

---

## 구현 체크리스트

### Phase 3.1: 수익 지표 계산
- [ ] MRR/ARR 계산 함수 구현
- [ ] 성장률 계산 로직
- [ ] API 엔드포인트 (GET /api/admin/revenue/metrics)
- [ ] 일일 배치 작업 (Vercel Cron)

### Phase 3.2: 수익 대시보드
- [ ] RevenueMetricsCard 컴포넌트
- [ ] RevenueTrendChart 컴포넌트
- [ ] PlanBreakdownChart 컴포넌트
- [ ] 메인 대시보드 페이지 (/admin/revenue)
- [ ] Admin 네비게이션 메뉴 추가

### Phase 3.3: 이탈 분석
- [ ] 이탈률 계산 함수
- [ ] API 엔드포인트 (GET /api/admin/churn/analysis)
- [ ] 이탈 기록 API (POST /api/admin/churn/record)
- [ ] 이탈 분석 대시보드 UI

### Phase 3.4: 성장 기회 식별
- [ ] 업셀 신호 감지 로직
- [ ] 다운셀 위험 감지 로직
- [ ] API 엔드포인트 (GET /api/admin/growth-opportunities)
- [ ] 성장 기회 대시보드 UI

---

## RBAC 권한

새 권한 추가 필요:
```typescript
PERMISSIONS.VIEW_REVENUE = 'view_revenue'
PERMISSIONS.MANAGE_REVENUE = 'manage_revenue'
PERMISSIONS.VIEW_CHURN_ANALYSIS = 'view_churn_analysis'
```

**권한 매핑**:
- `finance` 역할: VIEW_REVENUE, VIEW_CHURN_ANALYSIS
- `super_admin` 역할: 모든 권한

---

## 예상 소요 시간
- Phase 3.1: 1일
- Phase 3.2: 1.5일
- Phase 3.3: 1.5일
- Phase 3.4: 1일

**총 예상**: 5일 (1주)
