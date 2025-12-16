# Phase 2: 고객 성공 관리 (Customer Success Management) 설계

## 📋 개요

Phase 2는 **고객사의 건강도를 측정하고**, **온보딩 진행 상황을 추적**하며, **기능 사용 패턴을 분석**하여 고객 성공을 극대화하는 시스템을 구축하는 단계입니다.

---

## 🎯 주요 목표

1. **건강도 점수 시스템**: 고객사의 전반적인 상태를 수치화
2. **건강도 대시보드**: 건강도 지표를 시각화하여 위험 고객 조기 발견
3. **온보딩 추적**: 신규 고객의 온보딩 단계별 진행 상황 모니터링
4. **기능 사용 분석**: 각 고객사의 기능 활용도 분석 및 개선 권장사항 제공

---

## 🏗️ 시스템 아키텍처

### 데이터 흐름

```
고객사 활동 데이터
    ↓
[건강도 계산 엔진]
    ↓
health_scores 테이블 (일일 스냅샷)
    ↓
[API 레이어]
    ↓
[건강도 대시보드 UI]
```

### 계산 주기

- **실시간**: 온보딩 단계 업데이트
- **일일**: 건강도 점수 재계산 (매일 자정)
- **주간**: 트렌드 분석 및 알림

---

## 🗄️ 데이터베이스 스키마

### 1. `health_scores` 테이블

고객사의 건강도 점수를 일일 단위로 저장합니다.

```sql
CREATE TABLE health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 건강도 점수 (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- 세부 점수 (각 0-100)
  engagement_score INTEGER NOT NULL,      -- 참여도 (로그인 빈도, 활동량)
  product_usage_score INTEGER NOT NULL,   -- 제품 사용도 (기능 활용도)
  support_score INTEGER NOT NULL,         -- 지원 상태 (티켓 해결율, 만족도)
  payment_score INTEGER NOT NULL,         -- 결제 상태 (정상 결제, 지연 없음)

  -- 건강도 등급
  health_status TEXT NOT NULL CHECK (health_status IN ('critical', 'at_risk', 'healthy', 'excellent')),

  -- 위험 요인
  risk_factors JSONB DEFAULT '[]'::jsonb,
  -- 예: [{"factor": "low_engagement", "severity": "high"}, {"factor": "payment_issue", "severity": "medium"}]

  -- 개선 권장사항
  recommendations JSONB DEFAULT '[]'::jsonb,
  -- 예: [{"action": "schedule_check_in", "priority": "high"}, {"action": "feature_training", "priority": "medium"}]

  -- 메타데이터
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 인덱스
  UNIQUE(company_id, calculated_at::date)
);

CREATE INDEX idx_health_scores_company_id ON health_scores(company_id);
CREATE INDEX idx_health_scores_calculated_at ON health_scores(calculated_at DESC);
CREATE INDEX idx_health_scores_status ON health_scores(health_status);
CREATE INDEX idx_health_scores_overall ON health_scores(overall_score);
```

### 2. `onboarding_progress` 테이블

고객사의 온보딩 단계별 진행 상황을 추적합니다.

```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 현재 단계
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'signup',
    'profile_setup',
    'first_landing_page',
    'first_lead',
    'team_invite',
    'completed'
  )),

  -- 완료율 (0-100)
  completion_rate INTEGER NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),

  -- 단계별 완료 정보
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 예: [
  --   {"stage": "signup", "completed": true, "completedAt": "2024-01-01T00:00:00Z", "daysToComplete": 0},
  --   {"stage": "profile_setup", "completed": true, "completedAt": "2024-01-02T10:30:00Z", "daysToComplete": 1},
  --   {"stage": "first_landing_page", "completed": false}
  -- ]

  -- Time to Value (첫 리드 생성까지 걸린 일수)
  time_to_value INTEGER,

  -- 정체 여부 (7일 이상 진행 없음)
  is_stalled BOOLEAN NOT NULL DEFAULT false,
  stalled_since TIMESTAMPTZ,

  -- 메타데이터
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id)
);

CREATE INDEX idx_onboarding_company_id ON onboarding_progress(company_id);
CREATE INDEX idx_onboarding_current_stage ON onboarding_progress(current_stage);
CREATE INDEX idx_onboarding_is_stalled ON onboarding_progress(is_stalled) WHERE is_stalled = true;
```

### 3. `feature_usage` 테이블

고객사의 기능별 사용 통계를 저장합니다.

```sql
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 기능 식별자
  feature_name TEXT NOT NULL,
  -- 예: 'landing_page_create', 'lead_export', 'team_invite', 'api_integration'

  -- 사용 통계
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 해당 기능을 사용하는 사용자 수
  unique_users INTEGER NOT NULL DEFAULT 0,

  -- 사용자별 활용도 (회사 내 사용자 대비 비율)
  adoption_rate DECIMAL(5,2) DEFAULT 0.0 CHECK (adoption_rate >= 0 AND adoption_rate <= 100),

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, feature_name)
);

CREATE INDEX idx_feature_usage_company_id ON feature_usage(company_id);
CREATE INDEX idx_feature_usage_feature_name ON feature_usage(feature_name);
CREATE INDEX idx_feature_usage_last_used ON feature_usage(last_used_at DESC NULLS LAST);
```

---

## 📐 건강도 점수 계산 로직

### 1. 참여도 점수 (Engagement Score)

**계산 요소** (지난 30일 기준):
- 로그인 빈도 (30점): 일일 로그인 = 30점, 주 1회 = 15점, 월 1회 = 5점
- 활동량 (30점): 리드 생성, 페이지 수정 등 주요 작업 횟수
- 세션 지속 시간 (20점): 평균 세션 시간
- 활성 사용자 비율 (20점): 초대된 사용자 중 로그인한 비율

**계산 공식**:
```typescript
engagementScore = min(100, (
  loginFrequencyScore * 0.3 +
  activityScore * 0.3 +
  sessionDurationScore * 0.2 +
  activeUserRatioScore * 0.2
))
```

### 2. 제품 사용도 점수 (Product Usage Score)

**계산 요소**:
- 핵심 기능 사용률 (40점): 랜딩페이지 생성, 리드 수집 등 핵심 기능 사용 여부
- 기능 다양성 (30점): 사용 중인 기능의 다양성 (전체 기능 대비 비율)
- 고급 기능 활용 (30점): API 연동, 자동화, 팀 협업 등 고급 기능 사용

**계산 공식**:
```typescript
productUsageScore = min(100, (
  coreFeatureUsageScore * 0.4 +
  featureDiversityScore * 0.3 +
  advancedFeatureScore * 0.3
))
```

### 3. 지원 상태 점수 (Support Score)

**계산 요소**:
- 오픈 티켓 수 (음수 요소): 오픈 티켓이 많을수록 점수 감소
- 티켓 해결 속도: 빠르게 해결될수록 높은 점수
- 고객 만족도 (CSAT): 티켓 해결 후 만족도 평가

**계산 공식**:
```typescript
supportScore = max(0, min(100,
  100 - (openTicketsCount * 10) +
  resolutionSpeedBonus +
  csatScore * 0.3
))
```

### 4. 결제 상태 점수 (Payment Score)

**계산 요소**:
- 결제 상태 (50점): 정상 결제 = 50점, 결제 실패 = 0점
- 결제 이력 (30점): 결제 지연 이력이 없을수록 높은 점수
- 구독 기간 (20점): 장기 구독일수록 높은 점수

**계산 공식**:
```typescript
paymentScore = min(100, (
  paymentStatusScore * 0.5 +
  paymentHistoryScore * 0.3 +
  subscriptionTenureScore * 0.2
))
```

### 5. 전체 건강도 점수 (Overall Score)

**가중치 적용**:
```typescript
overallScore = (
  engagementScore * 0.35 +      // 35% - 참여도가 가장 중요
  productUsageScore * 0.30 +    // 30% - 제품 사용도
  supportScore * 0.20 +         // 20% - 지원 상태
  paymentScore * 0.15           // 15% - 결제 상태
)
```

### 6. 건강도 등급 분류

```typescript
if (overallScore >= 80) return 'excellent'      // 우수
else if (overallScore >= 60) return 'healthy'   // 양호
else if (overallScore >= 40) return 'at_risk'   // 위험
else return 'critical'                          // 심각
```

---

## 🔧 구현 범위

### Phase 2.1: 건강도 계산 로직

**작업 내용**:
1. 데이터베이스 스키마 마이그레이션
2. 건강도 계산 함수 구현
3. 일일 배치 작업 설정 (Supabase Edge Functions 또는 Cron)
4. 건강도 조회 API 구현

**파일 구조**:
```
src/
├── lib/
│   └── health/
│       ├── calculate-score.ts          # 점수 계산 로직
│       ├── engagement.ts               # 참여도 점수
│       ├── product-usage.ts            # 제품 사용도 점수
│       ├── support.ts                  # 지원 상태 점수
│       └── payment.ts                  # 결제 상태 점수
├── app/api/admin/
│   └── health/
│       ├── route.ts                    # GET: 건강도 목록 조회
│       ├── [companyId]/
│       │   └── route.ts                # GET: 특정 회사 건강도 조회
│       └── calculate/
│           └── route.ts                # POST: 건강도 수동 재계산
```

---

### Phase 2.2: 건강도 대시보드 UI

**작업 내용**:
1. 건강도 대시보드 페이지 구현
2. 건강도 트렌드 차트
3. 위험 고객사 목록 및 알림
4. 필터링 및 정렬 기능

**파일 구조**:
```
src/app/admin/
├── health/
│   ├── page.tsx                        # 건강도 대시보드
│   └── components/
│       ├── HealthScoreCard.tsx         # 건강도 점수 카드
│       ├── HealthTrendChart.tsx        # 건강도 추이 차트
│       ├── RiskCompaniesTable.tsx      # 위험 고객사 테이블
│       └── HealthFilters.tsx           # 필터 컴포넌트
```

**UI 요소**:
- 전체 건강도 평균 및 분포
- 건강도 등급별 고객사 수 (Excellent/Healthy/At Risk/Critical)
- 건강도 추세 라인 차트 (지난 30일)
- 위험 고객사 목록 (At Risk + Critical)
- 권장 조치사항

---

### Phase 2.3: 온보딩 추적 시스템

**작업 내용**:
1. 온보딩 단계 업데이트 로직
2. 온보딩 진행 상황 API
3. 온보딩 대시보드 UI
4. 정체된 고객사 자동 알림

**파일 구조**:
```
src/
├── lib/
│   └── onboarding/
│       ├── update-stage.ts             # 단계 업데이트
│       ├── check-completion.ts         # 완료 여부 체크
│       └── detect-stall.ts             # 정체 감지
├── app/api/admin/
│   └── onboarding/
│       ├── route.ts                    # GET: 온보딩 목록
│       └── [companyId]/
│           └── route.ts                # GET/PUT: 온보딩 진행 상황
├── app/admin/
│   └── onboarding/
│       ├── page.tsx                    # 온보딩 대시보드
│       └── components/
│           ├── OnboardingFunnel.tsx    # 퍼널 차트
│           ├── StalledCompaniesList.tsx # 정체 고객사
│           └── OnboardingTimeline.tsx  # 타임라인 시각화
```

**온보딩 단계**:
1. **Signup**: 회원가입 완료
2. **Profile Setup**: 프로필 및 회사 정보 설정
3. **First Landing Page**: 첫 랜딩페이지 생성
4. **First Lead**: 첫 리드 수집
5. **Team Invite**: 팀원 초대 (선택)
6. **Completed**: 온보딩 완료

---

### Phase 2.4: 기능 사용 분석

**작업 내용**:
1. 기능 사용 추적 로직
2. 기능 사용 분석 API
3. 회사 상세 페이지에 "기능 사용" 탭 추가
4. 미사용 기능 추천 시스템

**파일 구조**:
```
src/
├── lib/
│   └── analytics/
│       ├── track-feature-usage.ts      # 기능 사용 추적
│       ├── calculate-adoption.ts       # 활용도 계산
│       └── recommend-features.ts       # 추천 로직
├── app/api/admin/
│   └── companies/
│       └── [id]/
│           └── features/
│               └── route.ts            # GET: 기능 사용 분석
├── app/admin/companies/[id]/
│   └── components/
│       ├── FeaturesTab.tsx             # 기능 사용 탭
│       ├── FeatureUsageChart.tsx       # 기능 사용 차트
│       └── FeatureRecommendations.tsx  # 추천 기능
```

**추적 기능 목록**:
- `landing_page_create`: 랜딩페이지 생성
- `landing_page_publish`: 랜딩페이지 발행
- `lead_export`: 리드 내보내기
- `team_invite`: 팀원 초대
- `api_integration`: API 연동
- `custom_domain`: 커스텀 도메인 설정
- `ab_testing`: A/B 테스팅
- `analytics_view`: 분석 대시보드 조회

---

## 📊 API 스펙

### 1. 건강도 조회 API

#### GET /api/admin/health

**권한**: `VIEW_HEALTH_SCORES`

**Query Parameters**:
- `status`: 건강도 등급 필터 (`critical`, `at_risk`, `healthy`, `excellent`)
- `sortBy`: 정렬 기준 (`overall_score`, `engagement_score`, `calculated_at`)
- `sortOrder`: 정렬 방향 (`asc`, `desc`)
- `limit`, `offset`: 페이지네이션

**Response**:
```typescript
{
  success: true,
  scores: [
    {
      id: string,
      company_id: string,
      company_name: string,
      overall_score: number,
      engagement_score: number,
      product_usage_score: number,
      support_score: number,
      payment_score: number,
      health_status: 'critical' | 'at_risk' | 'healthy' | 'excellent',
      risk_factors: {
        factor: string,
        severity: 'low' | 'medium' | 'high'
      }[],
      recommendations: {
        action: string,
        priority: 'low' | 'medium' | 'high'
      }[],
      calculated_at: string
    }
  ],
  statistics: {
    total: number,
    byStatus: {
      critical: number,
      at_risk: number,
      healthy: number,
      excellent: number
    },
    averageScore: number
  }
}
```

---

#### GET /api/admin/health/[companyId]

**권한**: `VIEW_HEALTH_SCORES`

**Query Parameters**:
- `days`: 조회 기간 (기본: 30일)

**Response**:
```typescript
{
  success: true,
  company: {
    id: string,
    name: string
  },
  current: {
    overall_score: number,
    health_status: string,
    scores: {
      engagement: number,
      product_usage: number,
      support: number,
      payment: number
    },
    risk_factors: Array,
    recommendations: Array,
    calculated_at: string
  },
  history: [
    {
      date: string,
      overall_score: number,
      health_status: string
    }
  ],
  trends: {
    score_change: number,      // 지난 기간 대비 변화
    trend: 'improving' | 'stable' | 'declining'
  }
}
```

---

### 2. 온보딩 진행 API

#### GET /api/admin/onboarding

**권한**: `VIEW_COMPANIES`

**Query Parameters**:
- `stage`: 현재 단계 필터
- `stalled`: 정체된 고객사만 조회 (`true`/`false`)
- `limit`, `offset`: 페이지네이션

**Response**:
```typescript
{
  success: true,
  progress: [
    {
      company_id: string,
      company_name: string,
      current_stage: string,
      completion_rate: number,
      stages: [
        {
          stage: string,
          completed: boolean,
          completed_at: string | null,
          days_to_complete: number | null
        }
      ],
      time_to_value: number | null,
      is_stalled: boolean,
      stalled_since: string | null,
      started_at: string
    }
  ],
  statistics: {
    total: number,
    by_stage: {
      signup: number,
      profile_setup: number,
      first_landing_page: number,
      first_lead: number,
      team_invite: number,
      completed: number
    },
    average_completion_rate: number,
    average_time_to_value: number,
    stalled_count: number
  }
}
```

---

### 3. 기능 사용 분석 API

#### GET /api/admin/companies/[id]/features

**권한**: `VIEW_COMPANIES`

**Response**:
```typescript
{
  success: true,
  company: {
    id: string,
    name: string
  },
  analysis: {
    total_features: number,
    used_features: number,
    adoption_rate: number,     // 전체 기능 대비 사용 중인 기능 비율
    feature_usage: [
      {
        feature_name: string,
        display_name: string,
        usage_count: number,
        last_used_at: string | null,
        unique_users: number,
        adoption_rate: number   // 회사 내 사용자 대비
      }
    ],
    recommendations: [
      {
        feature_name: string,
        reason: string,
        benefit: string,
        priority: 'low' | 'medium' | 'high'
      }
    ]
  }
}
```

---

## 🔐 권한 매핑

| Endpoint | Method | Permission |
|----------|--------|------------|
| /api/admin/health | GET | `VIEW_HEALTH_SCORES` |
| /api/admin/health/[companyId] | GET | `VIEW_HEALTH_SCORES` |
| /api/admin/health/calculate | POST | `MANAGE_SYSTEM_SETTINGS` |
| /api/admin/onboarding | GET | `VIEW_COMPANIES` |
| /api/admin/onboarding/[companyId] | GET/PUT | `VIEW_COMPANIES` |
| /api/admin/companies/[id]/features | GET | `VIEW_COMPANIES` |

**새 권한 추가 필요**:
```typescript
PERMISSIONS.VIEW_HEALTH_SCORES = 'view_health_scores'
```

---

## 📝 구현 체크리스트

### Phase 2.1: 건강도 계산 로직
- [ ] 데이터베이스 마이그레이션 (health_scores, feature_usage 테이블)
- [ ] 건강도 계산 함수 구현
  - [ ] 참여도 점수 계산
  - [ ] 제품 사용도 점수 계산
  - [ ] 지원 상태 점수 계산
  - [ ] 결제 상태 점수 계산
  - [ ] 전체 점수 및 등급 계산
- [ ] 건강도 조회 API (GET /api/admin/health, GET /api/admin/health/[companyId])
- [ ] 건강도 재계산 API (POST /api/admin/health/calculate)
- [ ] 일일 배치 작업 설정

### Phase 2.2: 건강도 대시보드 UI
- [ ] 건강도 대시보드 페이지 (`/admin/health`)
- [ ] 건강도 카드 컴포넌트
- [ ] 건강도 추이 차트
- [ ] 위험 고객사 테이블
- [ ] 필터 및 정렬 기능
- [ ] Admin 네비게이션 메뉴 추가

### Phase 2.3: 온보딩 추적 시스템
- [ ] 데이터베이스 마이그레이션 (onboarding_progress 테이블)
- [ ] 온보딩 단계 업데이트 로직
- [ ] 정체 감지 로직
- [ ] 온보딩 API (GET /api/admin/onboarding, GET/PUT /api/admin/onboarding/[companyId])
- [ ] 온보딩 대시보드 페이지
- [ ] 퍼널 차트 컴포넌트
- [ ] 정체 고객사 알림

### Phase 2.4: 기능 사용 분석
- [ ] 기능 사용 추적 로직
- [ ] 기능 사용 분석 API
- [ ] 회사 상세 페이지에 "기능 사용" 탭 추가
- [ ] 기능 사용 차트 컴포넌트
- [ ] 미사용 기능 추천 시스템

### Documentation
- [ ] Phase 2 사용 가이드 작성
- [ ] 건강도 점수 계산 로직 문서화
- [ ] API 사용 예제

---

## 🎯 완료 기준

- ✅ 건강도 점수가 정확하게 계산되고 저장됨
- ✅ 건강도 대시보드에서 모든 고객사의 건강 상태를 한눈에 파악 가능
- ✅ 위험 고객사를 조기에 발견하고 조치사항 제공
- ✅ 온보딩 진행 상황을 실시간으로 추적 가능
- ✅ 정체된 고객사를 자동으로 감지하고 알림
- ✅ 각 고객사의 기능 사용 패턴 분석 가능
- ✅ 미사용 기능 추천으로 활용도 개선 지원

---

## 🔄 다음 단계

Phase 2 완료 후:
- **Phase 3**: 재무 및 수익 관리 (MRR/ARR 계산, 수익 대시보드, 이탈 분석)
