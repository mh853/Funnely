# Phase 3.4: 성장 기회 식별 시스템 - 상세 설계

## 개요

고객의 사용 패턴을 분석하여 업셀(Upsell) 기회와 다운셀(Downsell) 위험을 자동으로 식별하는 시스템

## 목표

1. **업셀 기회 발견**: 상위 플랜으로 전환할 가능성이 높은 고객 식별
2. **다운셀 위험 감지**: 하위 플랜으로 이동하거나 이탈할 위험이 있는 고객 조기 발견
3. **매출 최적화**: 적절한 타이밍에 플랜 변경 제안으로 MRR 극대화

---

## 1. 데이터베이스 스키마

### 1.1 growth_opportunities 테이블

```sql
CREATE TABLE growth_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- 기회 유형
  opportunity_type TEXT NOT NULL, -- 'upsell' | 'downsell_risk' | 'expansion'

  -- 현재 상태
  current_plan TEXT NOT NULL,
  recommended_plan TEXT,

  -- 신호 정보
  signals JSONB NOT NULL, -- 감지된 신호 배열
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),

  -- 재무 영향
  estimated_additional_mrr DECIMAL(10,2), -- 업셀 시 추가 MRR
  potential_lost_mrr DECIMAL(10,2),       -- 다운셀 시 손실 MRR

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'contacted' | 'converted' | 'dismissed'
  contacted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes TEXT,

  -- 메타데이터
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 중복 방지: 같은 회사에 대해 같은 타입의 활성 기회는 하나만
  UNIQUE(company_id, opportunity_type) WHERE status = 'active'
);

-- 인덱스
CREATE INDEX idx_growth_opportunities_company ON growth_opportunities(company_id);
CREATE INDEX idx_growth_opportunities_status ON growth_opportunities(status);
CREATE INDEX idx_growth_opportunities_type ON growth_opportunities(opportunity_type);
CREATE INDEX idx_growth_opportunities_detected ON growth_opportunities(detected_at DESC);
```

### 1.2 usage_metrics 테이블

사용량 추적을 위한 테이블 (이미 존재할 수 있음)

```sql
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- 사용량 데이터
  total_leads INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_landing_pages INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,

  -- 활동 지표
  active_days_count INTEGER DEFAULT 0,  -- 해당 월의 활동 일수
  last_activity_at TIMESTAMPTZ,

  -- 기간
  metric_month DATE NOT NULL, -- 월별 집계 (매월 1일)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, metric_month)
);

CREATE INDEX idx_usage_metrics_company_month ON usage_metrics(company_id, metric_month DESC);
```

---

## 2. 신호 감지 로직

### 2.1 업셀 신호 (Upsell Signals)

#### Signal 1: Usage Limit Approaching
- **조건**: 플랜 제한의 90% 이상 사용
- **체크 항목**:
  - 리드 수: `current_leads >= plan_limit * 0.9`
  - 사용자 수: `current_users >= plan_limit * 0.9`
  - 랜딩페이지 수: `current_pages >= plan_limit * 0.9`

```typescript
interface UsageLimitSignal {
  type: 'usage_limit'
  resource: 'leads' | 'users' | 'landing_pages'
  current: number
  limit: number
  percentage: number // 90-100%
  message: string // "리드 수 95% 사용 중 (950/1000)"
}
```

#### Signal 2: Premium Feature Attempts
- **조건**: 현재 플랜에 없는 기능 사용 시도
- **예시**:
  - Basic 플랜에서 API 연동 시도
  - Standard 플랜에서 Advanced Analytics 접근 시도

```typescript
interface FeatureAttemptSignal {
  type: 'feature_attempt'
  feature: string
  required_plan: string
  attempt_count: number
  last_attempt: string
  message: string // "API 연동 시도 3회 (Pro 플랜 필요)"
}
```

#### Signal 3: High Activity Growth
- **조건**: 지난 달 대비 활동량 30% 이상 증가
- **측정 지표**:
  - 리드 생성 증가
  - 로그인 빈도 증가
  - 기능 사용 증가

```typescript
interface ActivityGrowthSignal {
  type: 'activity_growth'
  metric: 'leads' | 'logins' | 'features'
  growth_rate: number // 30-200%
  previous_value: number
  current_value: number
  message: string // "리드 생성 50% 증가 (지난달 200 → 이번달 300)"
}
```

#### Signal 4: Team Expansion
- **조건**: 사용자 추가가 빈번함
- **체크**: 최근 30일 내 3명 이상 사용자 추가

```typescript
interface TeamExpansionSignal {
  type: 'team_expansion'
  new_users_count: number
  period_days: number
  message: string // "최근 30일간 5명 사용자 추가"
}
```

### 2.2 다운셀 위험 신호 (Downsell Risk Signals)

#### Signal 1: Low Usage
- **조건**: 지난 달 대비 활동량 50% 이상 감소
- **측정 지표**: 리드 생성, 로그인 빈도, 기능 사용

```typescript
interface LowUsageSignal {
  type: 'low_usage'
  metric: 'leads' | 'logins' | 'features'
  decline_rate: number // -50% 이하
  previous_value: number
  current_value: number
  message: string // "리드 생성 60% 감소 (지난달 500 → 이번달 200)"
}
```

#### Signal 2: Under-Utilizing Plan
- **조건**: 플랜 제한의 30% 미만 사용
- **지속 기간**: 3개월 연속

```typescript
interface UnderUtilizationSignal {
  type: 'under_utilization'
  resource: 'leads' | 'users' | 'landing_pages'
  usage_percentage: number // 0-30%
  consecutive_months: number
  message: string // "3개월 연속 리드 수 20% 미만 사용 (200/1000)"
}
```

#### Signal 3: Decreased Health Score
- **조건**: Customer Health Score가 60점 미만으로 하락

```typescript
interface HealthScoreSignal {
  type: 'health_score_decline'
  current_score: number
  previous_score: number
  decline: number
  message: string // "고객 건강도 55점으로 하락 (이전 75점)"
}
```

### 2.3 Confidence Score 계산

```typescript
function calculateConfidenceScore(signals: Signal[]): number {
  const weights = {
    usage_limit: 30,           // 사용량 한계 근접
    feature_attempt: 25,        // 프리미엄 기능 시도
    activity_growth: 20,        // 활동 증가
    team_expansion: 15,         // 팀 확장
    low_usage: 30,              // 낮은 사용량
    under_utilization: 25,      // 플랜 미활용
    health_score_decline: 20    // 건강도 하락
  }

  let totalScore = 0
  signals.forEach(signal => {
    totalScore += weights[signal.type] || 0
  })

  return Math.min(totalScore, 100)
}
```

---

## 3. API 설계

### 3.1 GET /api/admin/growth-opportunities

성장 기회 목록 조회

**Query Parameters**:
- `type`: 'upsell' | 'downsell_risk' | 'all' (default: 'all')
- `status`: 'active' | 'contacted' | 'converted' | 'dismissed' | 'all' (default: 'active')
- `min_confidence`: 0-100 (default: 50)
- `limit`: 10-100 (default: 20)

**Response**:
```typescript
{
  opportunities: [
    {
      id: 'uuid',
      company: {
        id: 'uuid',
        name: 'ABC Corp',
        current_plan: 'Basic',
        current_mrr: 50
      },
      opportunity_type: 'upsell',
      recommended_plan: 'Pro',
      signals: [
        {
          type: 'usage_limit',
          resource: 'leads',
          current: 950,
          limit: 1000,
          percentage: 95,
          message: '리드 수 95% 사용 중 (950/1000)'
        },
        {
          type: 'feature_attempt',
          feature: 'API Integration',
          required_plan: 'Pro',
          attempt_count: 3,
          message: 'API 연동 시도 3회 (Pro 플랜 필요)'
        }
      ],
      confidence_score: 85,
      estimated_additional_mrr: 200,
      status: 'active',
      detected_at: '2025-12-15T10:00:00Z',
      contacted_at: null
    }
  ],
  summary: {
    total_opportunities: 15,
    upsell_count: 10,
    downsell_risk_count: 5,
    total_potential_mrr: 2500,
    total_at_risk_mrr: 800
  }
}
```

### 3.2 POST /api/admin/growth-opportunities/[id]/update

기회 상태 업데이트

**Request Body**:
```typescript
{
  status: 'contacted' | 'converted' | 'dismissed',
  notes?: string
}
```

**Response**:
```typescript
{
  success: true,
  opportunity: { /* updated opportunity */ }
}
```

### 3.3 POST /api/admin/growth-opportunities/detect

수동으로 기회 재감지 트리거

**Response**:
```typescript
{
  success: true,
  detected: 8,
  updated: 3,
  dismissed: 2
}
```

---

## 4. 자동 감지 로직

### 4.1 배치 작업 (Cron Job)

**실행 주기**: 매주 월요일 오전 2시 (주간 분석)

**처리 흐름**:
```typescript
async function detectGrowthOpportunities() {
  // 1. 모든 활성 회사 조회
  const companies = await getActiveCompanies()

  for (const company of companies) {
    // 2. 사용량 데이터 수집
    const usage = await getUsageMetrics(company.id)
    const health = await getHealthScore(company.id)

    // 3. 신호 감지
    const signals = []

    // 업셀 신호 체크
    signals.push(...detectUsageLimitSignals(company, usage))
    signals.push(...detectFeatureAttemptSignals(company))
    signals.push(...detectActivityGrowthSignals(company, usage))
    signals.push(...detectTeamExpansionSignals(company))

    // 다운셀 위험 신호 체크
    signals.push(...detectLowUsageSignals(company, usage))
    signals.push(...detectUnderUtilizationSignals(company, usage))
    signals.push(...detectHealthScoreDeclineSignals(company, health))

    // 4. 신호가 있으면 기회 생성/업데이트
    if (signals.length > 0) {
      const opportunityType = determineOpportunityType(signals)
      const confidence = calculateConfidenceScore(signals)

      await upsertGrowthOpportunity({
        company_id: company.id,
        opportunity_type: opportunityType,
        signals,
        confidence_score: confidence,
        // ... 기타 필드
      })
    }
  }
}
```

### 4.2 실시간 감지 (이벤트 기반)

특정 이벤트 발생 시 즉시 감지:

**트리거 이벤트**:
- 사용량 한계 90% 도달
- 프리미엄 기능 접근 시도
- 사용자 3명 이상 추가
- Health Score 60점 미만 하락

```typescript
// 이벤트 핸들러 예시
async function onUsageLimitReached(companyId: string, resource: string) {
  const signal: UsageLimitSignal = {
    type: 'usage_limit',
    resource,
    // ... 신호 데이터
  }

  await createOrUpdateOpportunity(companyId, [signal])
}
```

---

## 5. UI 컴포넌트

### 5.1 페이지 구조

**위치**: `/admin/growth-opportunities`

**레이아웃**:
```
┌─────────────────────────────────────────────┐
│  성장 기회 대시보드                           │
├─────────────────────────────────────────────┤
│  📊 요약 카드 (총 기회, 잠재 MRR 등)          │
├──────────────────┬──────────────────────────┤
│  필터 & 검색      │  기회 목록               │
│  - 타입           │  ┌──────────────────┐   │
│  - 상태           │  │ ABC Corp         │   │
│  - 신뢰도         │  │ Basic → Pro      │   │
│                  │  │ 신뢰도: 85%      │   │
│                  │  │ +200 MRR         │   │
│                  │  │ [연락함] [무시]   │   │
│                  │  └──────────────────┘   │
└──────────────────┴──────────────────────────┘
```

### 5.2 주요 컴포넌트

#### OpportunitySummaryCards.tsx
```typescript
// 총 기회 수, 잠재 MRR, 위험 MRR 표시
<OpportunitySummaryCards summary={summary} />
```

#### OpportunityList.tsx
```typescript
// 기회 목록 테이블
<OpportunityList
  opportunities={opportunities}
  onUpdateStatus={handleUpdateStatus}
/>
```

#### OpportunityCard.tsx
```typescript
// 개별 기회 카드 (회사 정보, 신호, 액션 버튼)
<OpportunityCard
  opportunity={opportunity}
  onContact={handleContact}
  onDismiss={handleDismiss}
/>
```

#### SignalBadge.tsx
```typescript
// 신호 뱃지 (사용량 한계, 기능 시도 등)
<SignalBadge signal={signal} />
```

---

## 6. 알림 시스템 통합

### 6.1 Admin 알림

높은 신뢰도(80% 이상) 기회 발견 시 관리자에게 알림:

```typescript
await createNotification({
  user_id: adminUserId,
  type: 'growth_opportunity',
  title: '새로운 업셀 기회',
  message: `ABC Corp - Basic → Pro 전환 가능성 85%`,
  data: { opportunity_id: opportunity.id },
  priority: 'high'
})
```

### 6.2 주간 요약 이메일

매주 월요일 성장 기회 요약 이메일 발송

---

## 7. 테스트 시나리오

### 7.1 업셀 감지 테스트

1. **사용량 한계 테스트**
   - Basic 플랜 회사의 리드를 950개로 설정
   - 기회 감지 실행
   - usage_limit 신호 확인

2. **기능 시도 테스트**
   - Basic 플랜 회사에서 API 연동 페이지 접근
   - feature_attempt 신호 기록 확인
   - 기회 생성 확인

### 7.2 다운셀 위험 감지 테스트

1. **낮은 사용량 테스트**
   - Pro 플랜 회사의 리드 생성을 50% 감소
   - low_usage 신호 확인
   - 다운셀 위험 기회 생성 확인

2. **플랜 미활용 테스트**
   - 3개월 연속 20% 미만 사용 데이터 설정
   - under_utilization 신호 확인

---

## 8. 권한 설정

### 8.1 새 권한 추가

```typescript
export const PERMISSIONS = {
  // ... 기존 권한
  VIEW_GROWTH_OPPORTUNITIES: 'view_growth_opportunities',
  MANAGE_GROWTH_OPPORTUNITIES: 'manage_growth_opportunities'
}
```

### 8.2 역할별 권한

- **finance**: VIEW_GROWTH_OPPORTUNITIES
- **super_admin**: 모든 권한

---

## 9. 구현 순서

### Step 1: 데이터베이스 설정
1. growth_opportunities 테이블 마이그레이션
2. usage_metrics 테이블 확인/생성

### Step 2: 신호 감지 로직
1. 각 신호 타입별 감지 함수 구현
2. Confidence score 계산 함수
3. 기회 생성/업데이트 로직

### Step 3: API 엔드포인트
1. GET /api/admin/growth-opportunities
2. POST /api/admin/growth-opportunities/[id]/update
3. POST /api/admin/growth-opportunities/detect

### Step 4: 배치 작업
1. 주간 자동 감지 Cron 추가
2. 실시간 이벤트 핸들러 (optional)

### Step 5: UI 컴포넌트
1. 요약 카드 컴포넌트
2. 기회 목록 컴포넌트
3. 기회 상세 카드
4. 메인 대시보드 페이지

### Step 6: 알림 통합
1. Admin 알림 생성
2. 주간 요약 이메일 (optional)

---

## 10. 예상 소요 시간

- **데이터베이스 설정**: 0.5일
- **신호 감지 로직**: 1.5일
- **API 구현**: 1일
- **UI 컴포넌트**: 1.5일
- **테스트 및 통합**: 0.5일

**총 예상**: 5일

---

## 11. 성공 지표

- 기회 감지 정확도: 70% 이상
- 업셀 전환율: 15% 이상
- 다운셀 예방율: 30% 이상
- 관리자 응답 시간: 평균 24시간 이내
