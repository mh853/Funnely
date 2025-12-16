# 어드민 시스템 고도화 설계 문서

## 🎯 목표
SaaS 고객사 관리를 위한 5대 핵심 영역 통합:
1. 고객 성공 관리 (Customer Success)
2. 재무 및 수익 관리
3. 운영 효율화
4. 보안 및 컴플라이언스
5. 커뮤니케이션

---

## 📐 1. 고객 성공 관리 (Customer Success)

### 1.1 고객 건강도 대시보드
**위치**: `/admin/customer-health`

**주요 지표**:
```typescript
interface CustomerHealthMetrics {
  companyId: string
  healthScore: number // 0-100 점수
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  metrics: {
    loginFrequency: number        // 최근 30일 로그인 횟수
    featureUsage: number          // 활용 중인 기능 비율
    leadGenerationRate: number    // 월평균 리드 생성 수
    supportTicketCount: number    // 미해결 티켓 수
    lastActivityDate: string      // 마지막 활동 일시
    paymentStatus: 'current' | 'overdue' | 'failed'
  }
  trends: {
    scoreChange30d: number        // 30일 점수 변화
    activityTrend: 'increasing' | 'stable' | 'decreasing'
  }
}
```

**건강도 점수 계산 로직**:
```typescript
function calculateHealthScore(metrics: CompanyMetrics): number {
  const weights = {
    loginFrequency: 0.2,      // 20%
    featureUsage: 0.25,       // 25%
    leadGeneration: 0.25,     // 25%
    supportTickets: 0.15,     // 15% (역산)
    paymentStatus: 0.15       // 15%
  }

  const scores = {
    login: Math.min(metrics.loginFrequency / 30 * 100, 100),
    features: metrics.featureUsage * 100,
    leads: Math.min(metrics.leadGenerationRate / 100 * 100, 100),
    tickets: Math.max(0, 100 - (metrics.supportTicketCount * 10)),
    payment: metrics.paymentStatus === 'current' ? 100 : 0
  }

  return (
    scores.login * weights.loginFrequency +
    scores.features * weights.featureUsage +
    scores.leads * weights.leadGeneration +
    scores.tickets * weights.supportTickets +
    scores.payment * weights.paymentStatus
  )
}
```

**UI 컴포넌트**:
- 건강도 점수 게이지 차트
- 위험 고객사 목록 (점수 < 60)
- 세부 지표 상세 보기
- 시계열 추이 그래프

### 1.2 온보딩 추적
**위치**: `/admin/onboarding-tracker`

**추적 단계**:
```typescript
interface OnboardingStage {
  stage: 'signup' | 'profile_setup' | 'first_landing_page' | 'first_lead' | 'team_invite' | 'completed'
  completedAt?: string
  daysToComplete?: number
}

interface OnboardingMetrics {
  companyId: string
  currentStage: OnboardingStage['stage']
  completionRate: number  // 완료된 단계 비율
  stages: OnboardingStage[]
  timeToValue: number     // 첫 리드 생성까지 걸린 일수
  isStalled: boolean      // 7일 이상 진행 없음
}
```

**대시보드 요소**:
- 단계별 완료율 퍼널 차트
- 정체된 고객사 알림
- 평균 완료 시간 벤치마크
- 자동 리마인더 설정

### 1.3 기능 사용 분석
**위치**: `/admin/companies/[id]` - 새 탭 추가

**추적 데이터**:
```typescript
interface FeatureUsageData {
  feature: string
  usageCount: number
  lastUsedAt: string
  adoptionRate: number    // 해당 기능을 사용하는 사용자 비율
}

interface CompanyFeatureAnalysis {
  companyId: string
  totalFeatures: number
  usedFeatures: number
  adoptionRate: number
  featureUsage: FeatureUsageData[]
  recommendations: string[]  // 사용하지 않는 유용한 기능 추천
}
```

---

## 💰 2. 재무 및 수익 관리

### 2.1 수익 대시보드
**위치**: `/admin/revenue`

**주요 지표**:
```typescript
interface RevenueMetrics {
  mrr: number              // Monthly Recurring Revenue
  arr: number              // Annual Recurring Revenue
  mrrGrowth: number        // MoM 성장률 (%)
  arrGrowth: number        // YoY 성장률 (%)

  breakdown: {
    byPlan: {
      planName: string
      count: number
      revenue: number
    }[]
    bySegment: {
      segment: 'enterprise' | 'mid-market' | 'smb'
      count: number
      revenue: number
    }[]
  }

  projections: {
    nextMonth: number
    nextQuarter: number
    yearEnd: number
  }
}
```

**차트 및 시각화**:
- MRR/ARR 추이 라인 차트
- 플랜별 수익 분포 파이 차트
- 신규/업그레이드/다운그레이드/취소 워터폴 차트
- 연간 수익 예측 그래프

### 2.2 Churn 분석
**위치**: `/admin/churn-analysis`

**분석 데이터**:
```typescript
interface ChurnAnalysis {
  period: 'monthly' | 'quarterly' | 'yearly'
  churnRate: number           // 이탈률 (%)
  churnedCompanies: number    // 이탈 고객사 수
  churnedRevenue: number      // 손실 수익

  reasons: {
    reason: string
    count: number
    percentage: number
  }[]

  patterns: {
    averageTenure: number     // 평균 사용 기간
    riskFactors: string[]     // 주요 위험 요인
    preventableChurn: number  // 예방 가능한 이탈 비율
  }

  cohortAnalysis: {
    cohort: string            // 가입 월
    retentionRate: number[]   // 월별 유지율
  }[]
}
```

**UI 요소**:
- 이탈률 추이 그래프
- 이탈 사유 분석 차트
- 코호트 리텐션 매트릭스
- 위험 고객사 조기 경보

### 2.3 업셀/크로스셀 기회
**위치**: `/admin/growth-opportunities`

**기회 식별**:
```typescript
interface GrowthOpportunity {
  companyId: string
  currentPlan: string
  opportunity: {
    type: 'upsell' | 'cross-sell' | 'expansion'
    targetPlan?: string
    targetFeature?: string
    estimatedRevenue: number
    confidence: number        // 성공 가능성 (0-100)
  }
  signals: {
    signal: string
    strength: 'weak' | 'moderate' | 'strong'
  }[]
  recommendedAction: string
}
```

**식별 신호**:
- 사용량 한계 근접 (리드 수, 사용자 수 등)
- 프리미엄 기능 시도 횟수
- 지원 문의 내용 분석
- 동종 업계 평균 대비 활용도

---

## ⚙️ 3. 운영 효율화

### 3.1 자동화 워크플로우
**위치**: `/admin/automation/workflows`

**워크플로우 예시**:
```typescript
interface AutomationWorkflow {
  id: string
  name: string
  trigger: {
    type: 'event' | 'schedule' | 'condition'
    config: {
      event?: 'payment_failed' | 'trial_ending' | 'usage_threshold' | 'inactivity'
      schedule?: string         // Cron 표현식
      condition?: {
        field: string
        operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
        value: any
      }
    }
  }
  actions: {
    type: 'email' | 'notification' | 'webhook' | 'status_change' | 'ticket'
    config: any
  }[]
  isActive: boolean
  executionCount: number
  lastExecutedAt?: string
}
```

**기본 제공 워크플로우**:
1. **결제 실패 처리**:
   - 트리거: 결제 실패 이벤트
   - 액션: 자동 이메일 발송 + 계정 상태 변경 + 지원 티켓 생성

2. **무료 체험 종료 알림**:
   - 트리거: 체험 종료 7일 전
   - 액션: 이메일 시퀀스 시작 (D-7, D-3, D-1)

3. **비활성 고객 재참여**:
   - 트리거: 30일간 로그인 없음
   - 액션: 재참여 이메일 + 성공 매니저 알림

4. **사용량 임계값 알림**:
   - 트리거: 플랜 한도의 80% 도달
   - 액션: 업그레이드 제안 이메일

### 3.2 일괄 작업 도구
**위치**: `/admin/bulk-operations`

**지원 작업**:
```typescript
interface BulkOperation {
  id: string
  type: 'status_change' | 'plan_change' | 'notification' | 'feature_toggle' | 'export'
  targetCompanies: string[]   // 회사 ID 배열
  parameters: {
    newStatus?: string
    newPlan?: string
    message?: string
    featureFlags?: Record<string, boolean>
  }
  progress: {
    total: number
    completed: number
    failed: number
    status: 'pending' | 'running' | 'completed' | 'failed'
  }
  createdBy: string
  createdAt: string
  completedAt?: string
}
```

**UI 플로우**:
1. 조건으로 고객사 필터링
2. 작업 유형 선택
3. 매개변수 설정
4. 미리보기 및 확인
5. 실행 및 진행상황 추적

### 3.3 고급 데이터 내보내기
**위치**: 기존 페이지들에 내보내기 옵션 추가

**내보내기 옵션**:
```typescript
interface ExportConfig {
  source: 'companies' | 'users' | 'leads' | 'subscriptions' | 'revenue'
  format: 'csv' | 'excel' | 'json' | 'pdf'
  filters: Record<string, any>
  columns: string[]
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number
    dayOfMonth?: number
    time: string
    recipients: string[]
  }
}
```

**기능**:
- 필터링된 데이터 즉시 내보내기
- 사용자 정의 컬럼 선택
- 예약 내보내기 (자동 이메일 발송)
- 내보내기 히스토리 및 재다운로드

---

## 🔒 4. 보안 및 컴플라이언스

### 4.1 감사 로그 시스템
**위치**: `/admin/audit-logs`

**로그 스키마**:
```typescript
interface AuditLog {
  id: string
  timestamp: string
  actor: {
    userId: string
    email: string
    role: string
    ipAddress: string
  }
  action: string              // 'view', 'create', 'update', 'delete', 'export'
  resource: {
    type: 'company' | 'user' | 'subscription' | 'settings' | 'data'
    id: string
    name?: string
  }
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  metadata: {
    userAgent: string
    sessionId: string
    requestDuration?: number
  }
  severity: 'info' | 'warning' | 'critical'
}
```

**필터 및 검색**:
- 날짜 범위
- 작업자
- 액션 유형
- 리소스 타입
- 심각도

**자동 알림**:
- 민감한 데이터 접근
- 대량 작업 실행
- 권한 변경
- 의심스러운 활동 패턴

### 4.2 역할 기반 접근 제어 (RBAC)
**위치**: `/admin/settings/roles`

**역할 정의**:
```typescript
interface AdminRole {
  id: string
  name: string
  description: string
  permissions: {
    resource: string
    actions: ('read' | 'create' | 'update' | 'delete' | 'export')[]
  }[]
  users: string[]
}

// 기본 역할 예시
const defaultRoles: AdminRole[] = [
  {
    id: 'super_admin',
    name: '슈퍼 관리자',
    description: '모든 권한',
    permissions: [{ resource: '*', actions: ['read', 'create', 'update', 'delete', 'export'] }]
  },
  {
    id: 'cs_manager',
    name: '고객 성공 매니저',
    description: '고객사 관리 및 지원',
    permissions: [
      { resource: 'companies', actions: ['read', 'update'] },
      { resource: 'users', actions: ['read'] },
      { resource: 'support', actions: ['read', 'create', 'update'] },
      { resource: 'health', actions: ['read'] }
    ]
  },
  {
    id: 'finance',
    name: '재무 담당자',
    description: '결제 및 수익 관리',
    permissions: [
      { resource: 'subscriptions', actions: ['read', 'update'] },
      { resource: 'billing', actions: ['read', 'create', 'update'] },
      { resource: 'revenue', actions: ['read', 'export'] }
    ]
  },
  {
    id: 'analyst',
    name: '데이터 분석가',
    description: '읽기 및 내보내기만 가능',
    permissions: [
      { resource: '*', actions: ['read', 'export'] }
    ]
  }
]
```

### 4.3 개인정보 관리
**위치**: `/admin/privacy-compliance`

**GDPR/개인정보보호법 기능**:
```typescript
interface PrivacyRequest {
  id: string
  companyId: string
  type: 'data_access' | 'data_export' | 'data_deletion' | 'consent_withdrawal'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  requestedAt: string
  completedAt?: string
  processedBy?: string
  notes?: string
}

interface DataRetentionPolicy {
  dataType: 'leads' | 'users' | 'audit_logs' | 'analytics'
  retentionPeriod: number     // 일 수
  autoDeleteEnabled: boolean
  lastCleanupAt?: string
}
```

**개인정보 도구**:
- 데이터 주체 요청 처리 (DSR)
- 개인정보 내보내기 (구조화된 형식)
- 계정 및 데이터 완전 삭제
- 동의 기록 추적
- 데이터 보존 정책 자동화

---

## 📢 5. 커뮤니케이션

### 5.1 공지사항 관리
**위치**: `/admin/announcements`

**공지사항 시스템**:
```typescript
interface Announcement {
  id: string
  title: string
  content: string           // Markdown 지원
  type: 'info' | 'feature' | 'maintenance' | 'urgent'
  target: {
    scope: 'all' | 'segment' | 'specific'
    planTypes?: string[]
    companyIds?: string[]
    segments?: string[]
  }
  delivery: {
    channels: ('dashboard' | 'email' | 'in_app')[]
    scheduleAt?: string
  }
  visibility: {
    startDate: string
    endDate?: string
    dismissible: boolean
  }
  status: 'draft' | 'scheduled' | 'published' | 'archived'
  stats: {
    sent: number
    viewed: number
    clicked?: number
  }
  createdBy: string
  createdAt: string
  publishedAt?: string
}
```

**기능**:
- 리치 텍스트 에디터
- 타겟팅 규칙 설정
- 예약 발송
- A/B 테스트 지원
- 성과 추적 (열람률, 클릭률)

### 5.2 인앱 메시징
**위치**: 고객사 대시보드에 표시

**메시지 유형**:
```typescript
interface InAppMessage {
  id: string
  type: 'banner' | 'modal' | 'toast' | 'tooltip'
  content: {
    title?: string
    message: string
    cta?: {
      text: string
      action: 'link' | 'dismiss' | 'custom'
      url?: string
    }
  }
  targeting: {
    companyIds?: string[]
    conditions?: {
      field: string
      operator: string
      value: any
    }[]
  }
  display: {
    position: 'top' | 'bottom' | 'center'
    frequency: 'once' | 'session' | 'always'
    priority: number
  }
  schedule: {
    startDate: string
    endDate?: string
  }
}
```

**표시 위치**:
- 대시보드 상단 배너
- 모달 팝업
- 우측 하단 토스트
- 기능별 툴팁

### 5.3 이메일 자동화
**위치**: `/admin/email-templates`

**템플릿 시스템**:
```typescript
interface EmailTemplate {
  id: string
  name: string
  category: 'onboarding' | 'billing' | 'engagement' | 'support' | 'marketing'
  trigger: {
    type: 'event' | 'workflow' | 'manual'
    event?: string
  }
  content: {
    subject: string
    htmlBody: string        // Handlebars 템플릿
    textBody: string
    variables: string[]     // {{company_name}}, {{user_name}} 등
  }
  settings: {
    fromName: string
    fromEmail: string
    replyTo?: string
    cc?: string[]
    bcc?: string[]
  }
  schedule?: {
    delay?: number          // 트리거 후 지연 시간 (분)
    sendAt?: string         // 특정 시각
  }
  isActive: boolean
  stats: {
    sent: number
    opened: number
    clicked: number
    bounced: number
  }
}
```

**기본 템플릿**:
1. **환영 이메일** (신규 가입 시)
2. **온보딩 시퀀스** (D+1, D+3, D+7)
3. **결제 영수증** (결제 완료 시)
4. **결제 실패 알림** (결제 실패 시)
5. **체험 종료 알림** (D-7, D-3, D-1)
6. **구독 갱신 알림** (D-30, D-7)
7. **비활성 재참여** (30일 미사용)
8. **업그레이드 제안** (사용량 80% 도달)
9. **NPS 설문조사** (분기별)
10. **릴리스 노트** (신규 기능 출시)

---

## 🗄️ 데이터베이스 스키마 확장

### 새로운 테이블

#### customer_health_scores
```sql
CREATE TABLE customer_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  metrics JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_company ON customer_health_scores(company_id);
CREATE INDEX idx_health_risk ON customer_health_scores(risk_level);
CREATE INDEX idx_health_calculated ON customer_health_scores(calculated_at);
```

#### onboarding_progress
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  current_stage TEXT,
  stages JSONB,
  completion_rate INTEGER,
  time_to_value INTEGER, -- 일 수
  is_stalled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_onboarding_company ON onboarding_progress(company_id);
```

#### feature_usage_tracking
```sql
CREATE TABLE feature_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_feature_company ON feature_usage_tracking(company_id);
CREATE INDEX idx_feature_name ON feature_usage_tracking(feature_name);
CREATE INDEX idx_feature_used_at ON feature_usage_tracking(used_at);
```

#### revenue_metrics
```sql
CREATE TABLE revenue_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),
  mrr_growth DECIMAL(5,2),
  arr_growth DECIMAL(5,2),
  breakdown JSONB,
  projections JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revenue_period ON revenue_metrics(period_start, period_end);
```

#### churn_records
```sql
CREATE TABLE churn_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  churned_at TIMESTAMP NOT NULL,
  tenure_days INTEGER,
  last_mrr DECIMAL(10,2),
  reason TEXT,
  reason_category TEXT,
  feedback TEXT,
  was_preventable BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_churn_churned_at ON churn_records(churned_at);
CREATE INDEX idx_churn_reason_cat ON churn_records(reason_category);
```

#### automation_workflows
```sql
CREATE TABLE automation_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### bulk_operations
```sql
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  target_companies UUID[],
  parameters JSONB,
  progress JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP DEFAULT NOW(),
  actor_id UUID REFERENCES users(id),
  actor_email TEXT,
  actor_role TEXT,
  ip_address INET,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  changes JSONB,
  metadata JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

#### admin_roles
```sql
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_role_assignments (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);
```

#### privacy_requests
```sql
CREATE TABLE privacy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  type TEXT CHECK (type IN ('data_access', 'data_export', 'data_deletion', 'consent_withdrawal')),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id),
  notes TEXT
);
```

#### announcements
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'feature', 'maintenance', 'urgent')),
  target JSONB,
  delivery JSONB,
  visibility JSONB,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  stats JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);
```

#### in_app_messages
```sql
CREATE TABLE in_app_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('banner', 'modal', 'toast', 'tooltip')),
  content JSONB NOT NULL,
  targeting JSONB,
  display JSONB,
  schedule JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### email_templates
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  trigger JSONB,
  content JSONB NOT NULL,
  settings JSONB,
  schedule JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  stats JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API 엔드포인트 설계

### Customer Health
```
GET  /admin/api/customer-health          # 전체 건강도 요약
GET  /admin/api/customer-health/:id      # 특정 고객사 건강도
POST /admin/api/customer-health/calculate # 건강도 재계산
GET  /admin/api/customer-health/at-risk  # 위험 고객사 목록
```

### Onboarding
```
GET  /admin/api/onboarding               # 온보딩 현황 요약
GET  /admin/api/onboarding/:companyId    # 특정 고객사 온보딩 진행상황
POST /admin/api/onboarding/nudge         # 리마인더 발송
```

### Revenue
```
GET  /admin/api/revenue/metrics          # 수익 지표
GET  /admin/api/revenue/breakdown        # 수익 분석
GET  /admin/api/revenue/projections      # 수익 예측
```

### Churn
```
GET  /admin/api/churn/analysis           # 이탈 분석
GET  /admin/api/churn/cohorts            # 코호트 분석
POST /admin/api/churn/record             # 이탈 기록
```

### Automation
```
GET    /admin/api/workflows              # 워크플로우 목록
POST   /admin/api/workflows              # 워크플로우 생성
PUT    /admin/api/workflows/:id          # 워크플로우 수정
DELETE /admin/api/workflows/:id          # 워크플로우 삭제
POST   /admin/api/workflows/:id/execute  # 수동 실행
```

### Bulk Operations
```
POST /admin/api/bulk/operations          # 일괄 작업 시작
GET  /admin/api/bulk/operations/:id      # 진행상황 조회
DELETE /admin/api/bulk/operations/:id    # 작업 취소
```

### Audit
```
GET /admin/api/audit-logs                # 감사 로그 조회
GET /admin/api/audit-logs/export         # 로그 내보내기
```

### Roles
```
GET    /admin/api/roles                  # 역할 목록
POST   /admin/api/roles                  # 역할 생성
PUT    /admin/api/roles/:id              # 역할 수정
DELETE /admin/api/roles/:id              # 역할 삭제
POST   /admin/api/roles/:id/assign       # 역할 할당
```

### Privacy
```
POST /admin/api/privacy/request          # 개인정보 요청 생성
GET  /admin/api/privacy/requests         # 요청 목록
PUT  /admin/api/privacy/requests/:id     # 요청 처리
POST /admin/api/privacy/export           # 데이터 내보내기
POST /admin/api/privacy/delete           # 데이터 삭제
```

### Communication
```
GET    /admin/api/announcements          # 공지사항 목록
POST   /admin/api/announcements          # 공지사항 생성
PUT    /admin/api/announcements/:id      # 공지사항 수정
POST   /admin/api/announcements/:id/publish # 공지사항 발행

GET    /admin/api/in-app-messages        # 인앱 메시지 목록
POST   /admin/api/in-app-messages        # 메시지 생성
PUT    /admin/api/in-app-messages/:id    # 메시지 수정

GET    /admin/api/email-templates        # 템플릿 목록
POST   /admin/api/email-templates        # 템플릿 생성
PUT    /admin/api/email-templates/:id    # 템플릿 수정
POST   /admin/api/email-templates/:id/send # 템플릿 발송
```

---

## 🎨 UI/UX 통합 방안

### 기존 네비게이션 확장

**사이드바 메뉴 구조**:
```
퍼널리 어드민
├─ 📊 대시보드 (기존)
├─ 🏢 회사 관리 (기존)
│  └─ [회사 상세]
│     ├─ 개요 (기존)
│     ├─ 사용자 (기존)
│     ├─ 활동 (기존)
│     ├─ 📈 건강도 (신규)
│     └─ 🎯 기능 사용 분석 (신규)
├─ 👥 사용자 관리 (기존)
├─ 📋 리드 관리 (기존)
├─ 💰 재무 (확장)
│  ├─ 구독 관리 (기존)
│  ├─ 청구 (기존)
│  ├─ 💵 수익 대시보드 (신규)
│  └─ 📉 이탈 분석 (신규)
├─ 🎯 고객 성공 (신규)
│  ├─ 건강도 대시보드
│  ├─ 온보딩 추적
│  └─ 성장 기회
├─ ⚙️ 운영 (신규)
│  ├─ 자동화 워크플로우
│  ├─ 일괄 작업
│  └─ 데이터 내보내기
├─ 📢 커뮤니케이션 (신규)
│  ├─ 공지사항
│  ├─ 인앱 메시지
│  └─ 이메일 템플릿
├─ 🔒 보안 & 컴플라이언스 (신규)
│  ├─ 감사 로그
│  ├─ 역할 관리
│  └─ 개인정보 요청
├─ 📊 분석 (기존)
├─ 🎯 목표 (기존)
├─ 📝 리포트 (기존)
├─ 🔔 알림 (기존)
├─ 🛠️ 모니터링 (기존)
├─ 💬 지원 (기존)
└─ ⚙️ 설정 (기존)
```

### 대시보드 위젯 추가

**메인 대시보드에 추가할 위젯**:
1. **건강도 요약** - 위험/주의/양호 고객사 수
2. **MRR 추이** - 월별 수익 그래프
3. **온보딩 진행률** - 단계별 완료율
4. **이탈 경고** - 이탈 위험 고객사 알림
5. **자동화 실행 현황** - 오늘 실행된 워크플로우
6. **미처리 개인정보 요청** - 대응 필요 건수

---

## 📱 구현 우선순위

### Phase 1: 기초 인프라 (1-2주)
- [ ] 데이터베이스 스키마 마이그레이션
- [ ] 감사 로그 시스템 구축
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] 기본 API 엔드포인트

### Phase 2: 고객 성공 관리 (2-3주)
- [ ] 고객 건강도 계산 로직
- [ ] 건강도 대시보드 UI
- [ ] 온보딩 추적 시스템
- [ ] 기능 사용 분석

### Phase 3: 재무 관리 (2주)
- [ ] 수익 지표 계산 (MRR/ARR)
- [ ] 수익 대시보드
- [ ] 이탈 분석 시스템
- [ ] 성장 기회 식별

### Phase 4: 운영 효율화 (2-3주)
- [ ] 자동화 워크플로우 엔진
- [ ] 일괄 작업 도구
- [ ] 고급 내보내기 기능
- [ ] 이메일 템플릿 시스템

### Phase 5: 커뮤니케이션 (1-2주)
- [ ] 공지사항 관리
- [ ] 인앱 메시징
- [ ] 이메일 자동화 통합

### Phase 6: 마무리 및 최적화 (1주)
- [ ] 성능 최적화
- [ ] UI/UX 개선
- [ ] 문서화
- [ ] 테스트 및 QA

**총 예상 기간**: 9-13주

---

## 🔧 기술 스택

### Frontend
- **React 18** - UI 컴포넌트
- **Next.js 14** - 서버 사이드 렌더링
- **TailwindCSS** - 스타일링
- **Recharts/Chart.js** - 데이터 시각화
- **React Hook Form** - 폼 관리
- **Zod** - 스키마 검증

### Backend
- **Next.js API Routes** - API 엔드포인트
- **Supabase** - 데이터베이스 및 인증
- **PostgreSQL** - 메인 데이터베이스
- **Redis** (선택) - 캐싱 및 세션

### 외부 서비스
- **Resend/SendGrid** - 이메일 발송
- **Sentry** - 에러 트래킹
- **PostHog** (선택) - 제품 분석

---

## 📈 성공 지표 (KPI)

### 시스템 채택률
- 어드민 활성 사용자 수
- 주요 기능별 사용률
- 자동화 워크플로우 활용도

### 고객 성공 개선
- 위험 고객사 조기 발견율
- 건강도 점수 평균 향상
- 온보딩 완료율 증가

### 운영 효율성
- 수동 작업 시간 감소
- 티켓 응답 시간 단축
- 데이터 기반 의사결정 증가

### 재무 성과
- MRR 성장률
- Churn 감소율
- 업셀/크로스셀 성공률

---

## 🎓 교육 및 문서화

### 사용자 가이드
- 각 기능별 사용 매뉴얼
- 동영상 튜토리얼
- FAQ 문서

### API 문서
- OpenAPI 스펙
- 엔드포인트별 상세 설명
- 예제 코드

### 운영 가이드
- 데이터베이스 관리
- 백업 및 복구
- 모니터링 및 알림 설정

---

이 설계 문서를 기반으로 단계별로 구현을 진행할 수 있습니다. 어느 부분부터 시작하시겠습니까?
