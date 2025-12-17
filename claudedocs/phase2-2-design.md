# Phase 2.2: 건강도 대시보드 UI 설계

## 개요
고객사 건강도 점수를 시각화하고 관리할 수 있는 대시보드 UI를 구현합니다.

---

## 1. 페이지 구조

### 1.1 Health Dashboard 메인 페이지
**경로**: `/admin/health`

**기능**:
- 전체 고객사 건강도 점수 목록
- 건강 상태별 필터링 (critical/at_risk/healthy/excellent)
- 검색 및 정렬
- 페이지네이션

**레이아웃**:
```
┌─────────────────────────────────────────────────────────────┐
│ Health Dashboard                                     [Filters]│
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Critical │ │ At Risk  │ │ Healthy  │ │Excellent │        │
│ │    5     │ │    12    │ │    28    │ │    15    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Search: [__________]  Status: [All ▼]  Sort: [Score ▼]     │
├─────────────────────────────────────────────────────────────┤
│ Company List                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Acme Corp              Score: 45  ⚠️ AT RISK            │ │
│ │ ┌──────────────────────────────────────────────────┐   │ │
│ │ │ Engagement: 35  Product: 42  Support: 100  Pay: 15│   │ │
│ │ └──────────────────────────────────────────────────┘   │ │
│ │ 🚨 2 Critical Issues  💡 3 Recommendations          │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ...more companies...                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Company Health Detail 페이지
**경로**: `/admin/health/[companyId]`

**기능**:
- 회사별 상세 건강도 점수
- 30일 추세 그래프
- 위험 요소 및 권장사항
- 컴포넌트 점수 분해

**레이아웃**:
```
┌─────────────────────────────────────────────────────────────┐
│ Acme Corp - Health Score Detail              [Back to List] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────────────┐  │
│ │   Overall Score      │ │   Status: AT RISK ⚠️         │  │
│ │        45            │ │   Last Calculated: 2 hrs ago │  │
│ │  ████░░░░░░ (45%)   │ │   [Recalculate Now]         │  │
│ └──────────────────────┘ └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Component Scores                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Engagement (35%)     35  ████░░░░░░                 │   │
│ │ Product Usage (30%)  42  █████░░░░░                 │   │
│ │ Support (20%)       100  ██████████                 │   │
│ │ Payment (15%)        15  ██░░░░░░░░                 │   │
│ └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ 30-Day Trend                                                │
│ ┌──────────────────────────────────────────────────────┐   │
│ │    Score                                              │   │
│ │ 100│                                ┌─┐               │   │
│ │  80│                        ┌─┐     │ │               │   │
│ │  60│                ┌─┐     │ │ ┌─┐ │ │               │   │
│ │  40│        ┌─┐     │ │ ┌─┐ │ │ │ │ │ │     ┌─┐       │   │
│ │  20│    ┌─┐ │ │ ┌─┐ │ │ │ │ │ │ │ │ │ │ ┌─┐ │ │       │   │
│ │   0└────┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴──      │   │
│ │     Dec 1    Dec 8   Dec 15   Dec 22   Dec 29        │   │
│ └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Risk Factors (2)                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🔴 CRITICAL: No activity for 14 days                 │   │
│ │    Impact: High churn risk                           │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 🟡 MEDIUM: Low login frequency (3 logins in 7 days) │   │
│ │    Impact: Low engagement with platform              │   │
│ └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Recommendations (3)                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🔥 HIGH: Immediate outreach to company admin         │   │
│ │    Rationale: Extended inactivity suggests abandon   │   │
│ │    Expected Impact: Prevent churn through re-engage │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 🟡 MEDIUM: Review landing page performance          │   │
│ │    Rationale: No leads = no value realization        │   │
│ │    Expected Impact: Generate first leads and ROI     │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 설계

### 2.1 HealthScoreCard Component
**파일**: `src/components/health/HealthScoreCard.tsx`

**Props**:
```typescript
interface HealthScoreCardProps {
  companyId: string
  companyName: string
  overallScore: number
  healthStatus: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  componentScores: {
    engagement: number
    productUsage: number
    support: number
    payment: number
  }
  riskFactorCount: number
  recommendationCount: number
  calculatedAt: string
  onClick?: () => void
}
```

**기능**:
- 회사 건강도 점수 카드 표시
- 상태별 색상 코딩 (critical=red, at_risk=yellow, healthy=green, excellent=blue)
- 컴포넌트 점수 미니 바 차트
- 위험 요소 및 권장사항 카운트

**스타일**:
```tsx
// Status color mapping
const statusColors = {
  critical: 'bg-red-100 border-red-500 text-red-900',
  at_risk: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  healthy: 'bg-green-100 border-green-500 text-green-900',
  excellent: 'bg-blue-100 border-blue-500 text-blue-900',
}
```

### 2.2 HealthScoreTrend Component
**파일**: `src/components/health/HealthScoreTrend.tsx`

**Props**:
```typescript
interface HealthScoreTrendProps {
  history: Array<{
    calculated_at: string
    overall_score: number
    health_status: string
  }>
  height?: number
}
```

**기능**:
- 30일 건강도 추세 라인 차트
- Recharts 라이브러리 사용
- 상태 변화 색상 표시

**구현 예시**:
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function HealthScoreTrend({ history, height = 300 }: HealthScoreTrendProps) {
  const chartData = history.map(h => ({
    date: new Date(h.calculated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    score: h.overall_score,
    status: h.health_status,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ fill: '#8884d8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### 2.3 ComponentScoreBreakdown Component
**파일**: `src/components/health/ComponentScoreBreakdown.tsx`

**Props**:
```typescript
interface ComponentScoreBreakdownProps {
  scores: {
    engagement: number
    productUsage: number
    support: number
    payment: number
  }
  weights: {
    engagement: number // 0.35
    productUsage: number // 0.30
    support: number // 0.20
    payment: number // 0.15
  }
}
```

**기능**:
- 각 컴포넌트 점수를 수평 바 차트로 표시
- 가중치 표시
- 점수별 색상 코딩 (0-40: red, 41-60: yellow, 61-80: green, 81-100: blue)

### 2.4 RiskFactorList Component
**파일**: `src/components/health/RiskFactorList.tsx`

**Props**:
```typescript
interface RiskFactor {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
}

interface RiskFactorListProps {
  riskFactors: RiskFactor[]
  maxVisible?: number
  showAll?: boolean
}
```

**기능**:
- 위험 요소 목록 표시
- 심각도별 아이콘 및 색상
- 접기/펼치기 기능

### 2.5 RecommendationList Component
**파일**: `src/components/health/RecommendationList.tsx`

**Props**:
```typescript
interface Recommendation {
  priority: 'low' | 'medium' | 'high'
  action: string
  rationale: string
  expected_impact: string
}

interface RecommendationListProps {
  recommendations: Recommendation[]
  maxVisible?: number
  showAll?: boolean
}
```

**기능**:
- 권장사항 목록 표시
- 우선순위별 정렬 및 표시
- 액션 아이템으로 체크리스트 형태

### 2.6 HealthStatusBadge Component
**파일**: `src/components/health/HealthStatusBadge.tsx`

**Props**:
```typescript
interface HealthStatusBadgeProps {
  status: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  size?: 'sm' | 'md' | 'lg'
}
```

**기능**:
- 건강 상태 뱃지 표시
- 아이콘 + 텍스트 조합
- 크기 조절 가능

---

## 3. 페이지 구현

### 3.1 Health Dashboard Page
**파일**: `src/app/admin/health/page.tsx`

**State Management**:
```typescript
interface HealthDashboardState {
  healthScores: HealthScore[]
  loading: boolean
  error: string | null
  filters: {
    status: 'all' | 'critical' | 'at_risk' | 'healthy' | 'excellent'
    search: string
    sortBy: 'score' | 'name' | 'calculated_at'
    sortOrder: 'asc' | 'desc'
  }
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
```

**Fetch Function**:
```typescript
async function fetchHealthScores() {
  const params = new URLSearchParams({
    limit: pagination.limit.toString(),
    offset: pagination.offset.toString(),
    healthStatus: filters.status !== 'all' ? filters.status : '',
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  })

  const response = await fetch(`/api/admin/health?${params}`)
  const data = await response.json()

  if (data.success) {
    setHealthScores(data.health_scores)
    setPagination(data.pagination)
  }
}
```

**Summary Statistics**:
```typescript
const stats = {
  critical: healthScores.filter(s => s.health_status === 'critical').length,
  at_risk: healthScores.filter(s => s.health_status === 'at_risk').length,
  healthy: healthScores.filter(s => s.health_status === 'healthy').length,
  excellent: healthScores.filter(s => s.health_status === 'excellent').length,
}
```

### 3.2 Health Detail Page
**파일**: `src/app/admin/health/[companyId]/page.tsx`

**State Management**:
```typescript
interface HealthDetailState {
  company: {
    id: string
    name: string
    slug: string
    status: string
  }
  currentScore: {
    id: string
    overall_score: number
    engagement_score: number
    product_usage_score: number
    support_score: number
    payment_score: number
    health_status: string
    risk_factors: RiskFactor[]
    recommendations: Recommendation[]
    calculated_at: string
  }
  history: Array<{
    calculated_at: string
    overall_score: number
    health_status: string
  }>
  loading: boolean
  error: string | null
}
```

**Fetch Function**:
```typescript
async function fetchHealthDetail(companyId: string) {
  const response = await fetch(`/api/admin/health/${companyId}`)
  const data = await response.json()

  if (data.success) {
    setCompany(data.company)
    setCurrentScore(data.current_score)
    setHistory(data.history)
  }
}
```

**Recalculate Function**:
```typescript
async function recalculateHealthScore() {
  setRecalculating(true)

  const response = await fetch('/api/admin/health/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId: company.id }),
  })

  if (response.ok) {
    // Refresh data
    await fetchHealthDetail(company.id)
  }

  setRecalculating(false)
}
```

---

## 4. 스타일링 가이드

### 4.1 Color Palette
```typescript
const healthColors = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-800',
  },
  at_risk: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  healthy: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    icon: 'text-green-500',
    badge: 'bg-green-100 text-green-800',
  },
  excellent: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-800',
  },
}
```

### 4.2 Icons
```typescript
import {
  ExclamationTriangleIcon, // Critical
  ExclamationCircleIcon,   // At Risk
  CheckCircleIcon,         // Healthy
  StarIcon,                // Excellent
} from '@heroicons/react/24/outline'

const statusIcons = {
  critical: ExclamationTriangleIcon,
  at_risk: ExclamationCircleIcon,
  healthy: CheckCircleIcon,
  excellent: StarIcon,
}
```

### 4.3 Typography
```typescript
const typography = {
  scoreDisplay: 'text-6xl font-bold',
  componentLabel: 'text-sm font-medium text-gray-700',
  componentScore: 'text-2xl font-semibold',
  riskTitle: 'text-base font-semibold',
  riskDescription: 'text-sm text-gray-600',
  recommendationAction: 'text-base font-medium',
  recommendationRationale: 'text-sm text-gray-500',
}
```

---

## 5. Navigation 통합

### 5.1 Admin Sidebar 업데이트
**파일**: `src/components/admin/AdminSidebar.tsx`

**새 메뉴 항목 추가**:
```typescript
{
  name: 'Customer Health',
  href: '/admin/health',
  icon: HeartIcon,
  permission: 'view_health_scores',
}
```

### 5.2 Company Detail 탭 추가
**파일**: `src/app/admin/companies/[id]/page.tsx`

**Health 탭 추가**:
```typescript
const tabs = [
  { name: 'Overview', href: '#overview' },
  { name: 'Users', href: '#users' },
  { name: 'Activity', href: '#activity' },
  { name: 'Health Score', href: '#health' }, // NEW
]
```

**Health Tab Component**:
```typescript
function HealthTab({ companyId }: { companyId: string }) {
  const [healthScore, setHealthScore] = useState(null)

  useEffect(() => {
    fetch(`/api/admin/health/${companyId}`)
      .then(res => res.json())
      .then(data => setHealthScore(data.current_score))
  }, [companyId])

  return (
    <div className="space-y-6">
      <HealthScoreCard {...healthScore} />
      <ComponentScoreBreakdown scores={healthScore.componentScores} />
      <HealthScoreTrend history={healthScore.history} />
    </div>
  )
}
```

---

## 6. Dependencies

### 6.1 Chart Library
```bash
npm install recharts
npm install --save-dev @types/recharts
```

### 6.2 Icons
```bash
# Already installed
@heroicons/react
```

---

## 7. 구현 체크리스트

### Phase 2.2.1: Core Components (1-2일)
- [ ] HealthScoreCard component
- [ ] HealthStatusBadge component
- [ ] ComponentScoreBreakdown component
- [ ] RiskFactorList component
- [ ] RecommendationList component

### Phase 2.2.2: Chart Components (1일)
- [ ] Install Recharts
- [ ] HealthScoreTrend component
- [ ] Responsive chart configuration

### Phase 2.2.3: Dashboard Page (2일)
- [ ] Health Dashboard layout
- [ ] Summary statistics
- [ ] Filters and search
- [ ] Pagination
- [ ] API integration

### Phase 2.2.4: Detail Page (2일)
- [ ] Health Detail layout
- [ ] Score recalculation feature
- [ ] 30-day trend display
- [ ] Risk factors and recommendations
- [ ] API integration

### Phase 2.2.5: Navigation & Integration (1일)
- [ ] Admin sidebar menu item
- [ ] Company detail health tab
- [ ] Breadcrumbs
- [ ] Permission checks

### Phase 2.2.6: Testing & Polish (1일)
- [ ] Component testing
- [ ] Responsive design verification
- [ ] Loading states
- [ ] Error handling
- [ ] Documentation

---

## 8. API Usage Examples

### 8.1 Fetch Health Scores List
```typescript
const response = await fetch('/api/admin/health?limit=50&offset=0&healthStatus=at_risk&sortBy=overall_score&sortOrder=desc')
const data = await response.json()
// Returns: { success: true, health_scores: [...], pagination: {...} }
```

### 8.2 Fetch Company Health Detail
```typescript
const response = await fetch('/api/admin/health/company-uuid-123')
const data = await response.json()
// Returns: { success: true, company: {...}, current_score: {...}, history: [...] }
```

### 8.3 Recalculate Health Score
```typescript
const response = await fetch('/api/admin/health/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ companyId: 'company-uuid-123' })
})
const data = await response.json()
// Returns: { success: true, calculated: 1, results: [...] }
```

---

## 9. Performance Considerations

### 9.1 Data Caching
- Cache health scores in React state
- Implement SWR or React Query for automatic refetch
- Debounce search input (300ms)

### 9.2 Lazy Loading
- Lazy load chart library (Recharts)
- Virtualize long lists if needed
- Paginate recommendations and risk factors

### 9.3 Optimistic UI Updates
- Show loading state during recalculation
- Optimistically update UI before API response
- Rollback on error

---

## 10. Next Steps

After Phase 2.2 completion:
1. **Phase 2.3**: 온보딩 추적 시스템 UI
2. **Phase 2.4**: 기능 사용 분석 UI
3. **Integration**: Health alerts and notifications
4. **Automation**: Scheduled reports and email digests
