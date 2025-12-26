# 기능 비교표 페이지 재설계

## 문제점
현재 `/features/comparison` 페이지는 단순히 Free와 Pro 두 개의 플랜만 비교하고 있지만, 실제 데이터베이스에는 **6개의 플랜**이 존재합니다.

## 현재 데이터베이스 플랜 구조

### 최신 플랜 (20251224 migration 기준)
database에는 5개 플랜 + Free 플랜 = 총 6개:

1. **Free 플랜** (암묵적 - 가격 0원)
   - 기본 기능만 제공
   - 랜딩페이지 제한, DB 관리만 가능

2. **개인 사용자를 위한 플랜**
   - 월 ₩19,000 / 연 ₩205,200
   - max_users: 1
   - max_landing_pages: 1
   - Features: dashboard, db_status

3. **개인 사용자를 위한 플랜 + 스케줄 관리 기능**
   - 월 ₩66,000 / 연 ₩712,800
   - max_users: 1
   - max_landing_pages: 1
   - Features: dashboard, db_status, db_schedule, reservation_schedule, advanced_schedule, analytics, reports

4. **소규모 기업을 위한 플랜**
   - 월 ₩200,000 / 연 ₩2,160,000
   - max_users: 3
   - max_landing_pages: 3
   - Features: 플랜3과 동일

5. **성장하는 기업을 위한 플랜**
   - 월 ₩490,000 / 연 ₩5,292,000
   - max_users: 20
   - max_landing_pages: 20
   - Features: 플랜3 + priority_support

6. **대규모 조직을 위한 플랜**
   - 가격 협의 (₩0)
   - max_users: NULL (무제한)
   - max_landing_pages: NULL (무제한)
   - Features: 모든 기능 + customization, custom_integration

### 이전 플랜 구조 (20251221 migration - user_type/tier 기반)
6개 플랜 (2×3 매트릭스):

**개인(Personal) × 3 등급:**
1. Personal Free (₩0)
2. Personal Basic (월 ₩15,900 / 연 ₩159,000)
3. Personal Pro (월 ₩39,900 / 연 ₩399,000)

**기업(Business) × 3 등급:**
4. Business Free (₩0)
5. Business Basic (월 ₩49,900 / 연 ₩499,000)
6. Business Pro (월 ₩149,900 / 연 ₩1,499,000)

## 설계 방향

### Option 1: 6개 플랜 전체 비교 (권장)
**장점:**
- 데이터베이스 실제 구조 반영
- 사용자가 모든 선택지를 한눈에 비교
- 정확한 가격 정보 제공

**단점:**
- 테이블이 넓어져 모바일에서 스크롤 필요
- 너무 많은 정보로 선택 피로감 증가

**구현 방식:**
```tsx
<ComparisonTable>
  <thead>
    <tr>
      <th>기능</th>
      <th>Free</th>
      <th>개인 Basic (₩19K)</th>
      <th>개인 Pro (₩66K)</th>
      <th>소규모 기업 (₩200K)</th>
      <th>성장 기업 (₩490K)</th>
      <th>대규모 조직 (협의)</th>
    </tr>
  </thead>
</ComparisonTable>
```

### Option 2: 3단계 플랜 표시 + 드롭다운
**장점:**
- 깔끔한 UI
- 선택적으로 더 많은 정보 제공

**단점:**
- 추가 인터랙션 필요
- 모든 플랜 비교가 직관적이지 않음

**구현 방식:**
```tsx
<select onChange={handlePlanTypeChange}>
  <option>개인 사용자 플랜</option>
  <option>기업 플랜</option>
</select>

<ComparisonTable plans={filteredPlans} />
```

### Option 3: 핵심 3개 플랜만 표시 + "더 많은 플랜 보기"
**장점:**
- 핵심 선택지만 강조
- 점진적 정보 공개

**단점:**
- 모든 플랜을 즉시 비교하기 어려움

## 권장 설계: 동적 플랜 비교 (Option 1 개선)

### 1. 데이터베이스에서 플랜 동적 로딩

**파일**: `/src/app/(marketing)/features/comparison/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ComparisonPage() {
  const supabase = await createClient()

  // 활성화된 모든 플랜 조회
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Free 플랜 추가 (DB에 없는 경우)
  const allPlans = [
    {
      id: 'free',
      name: 'Free',
      price_monthly: 0,
      price_yearly: 0,
      max_users: 1,
      max_landing_pages: 1,
      features: {
        dashboard: true,
        db_status: true,
      }
    },
    ...(plans || [])
  ]

  return (
    <main>
      <ComparisonHero />
      <ComparisonTable plans={allPlans} />
      <PlanRecommendation plans={allPlans} />
      <ComparisonFAQ />
      <FinalCTASection />
    </main>
  )
}
```

### 2. ComparisonTable 컴포넌트 개선

**파일**: `/src/components/features/comparison/ComparisonTable.tsx`

**변경 사항:**
- 하드코딩된 2개 컬럼(Free, Pro) → 동적으로 N개 플랜 컬럼 생성
- 가격 정보 동적 표시
- Features 객체 파싱하여 각 기능별 포함 여부 표시

**개선된 구조:**
```tsx
interface ComparisonTableProps {
  plans: Plan[]
}

export default function ComparisonTable({ plans }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>기능</th>
            {plans.map(plan => (
              <th key={plan.id}>
                <div>{plan.name}</div>
                <div className="text-sm">
                  {plan.price_monthly > 0
                    ? `₩${plan.price_monthly.toLocaleString()}/월`
                    : '무료'
                  }
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureCategories.map(category => (
            <FeatureCategoryRow
              key={category.name}
              category={category}
              plans={plans}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 3. 기능 매핑 로직

각 플랜의 `features` JSONB 객체를 파싱하여 표시:

```tsx
const FEATURE_MATRIX = {
  '랜딩페이지 빌더': {
    key: 'dashboard',
    getValue: (plan) => plan.features?.dashboard ? '✓' : '✗'
  },
  'DB 관리': {
    key: 'db_status',
    getValue: (plan) => plan.features?.db_status ? '✓' : '✗'
  },
  'DB 스케줄': {
    key: 'db_schedule',
    getValue: (plan) => plan.features?.db_schedule ? '✓' : '✗'
  },
  '예약 스케줄': {
    key: 'reservation_schedule',
    getValue: (plan) => plan.features?.reservation_schedule ? '✓' : '✗'
  },
  '고급 스케줄 관리': {
    key: 'advanced_schedule',
    getValue: (plan) => plan.features?.advanced_schedule ? '✓' : '✗'
  },
  '분석': {
    key: 'analytics',
    getValue: (plan) => plan.features?.analytics ? '✓' : '✗'
  },
  '리포트': {
    key: 'reports',
    getValue: (plan) => plan.features?.reports ? '✓' : '✗'
  },
  '우선 지원': {
    key: 'priority_support',
    getValue: (plan) => plan.features?.priority_support ? '✓' : '✗'
  },
  '커스터마이징': {
    key: 'customization',
    getValue: (plan) => plan.features?.customization ? '✓' : '✗'
  },
  '커스텀 통합': {
    key: 'custom_integration',
    getValue: (plan) => plan.features?.custom_integration ? '✓' : '✗'
  },
  '랜딩페이지 수': {
    key: 'max_landing_pages',
    getValue: (plan) => plan.max_landing_pages || '무제한'
  },
  '팀원 수': {
    key: 'max_users',
    getValue: (plan) => plan.max_users || '무제한'
  },
}
```

### 4. 반응형 디자인

**모바일 (<768px):**
- 가로 스크롤 가능한 테이블
- Sticky 첫 번째 컬럼 (기능명)
- 플랜 선택 탭으로 한 번에 하나씩 비교

**태블릿 (768px - 1024px):**
- 3-4개 플랜 표시
- 나머지는 스크롤

**데스크톱 (>1024px):**
- 모든 플랜 한 화면에 표시

### 5. PlanRecommendation 컴포넌트 업데이트

하드코딩된 Free/Pro 대신 동적 추천:

```tsx
interface PlanRecommendationProps {
  plans: Plan[]
}

export default function PlanRecommendation({ plans }: PlanRecommendationProps) {
  // 추천 로직:
  // 1. 개인 사용자 → 가장 저렴한 개인 플랜
  // 2. 성장하는 비즈니스 → 중간 가격대 기업 플랜
  // 3. 대규모 조직 → 최상위 플랜

  const recommendedForIndividual = plans.find(p =>
    p.max_users === 1 && p.price_monthly > 0
  )

  const recommendedForBusiness = plans.find(p =>
    p.max_users && p.max_users > 3 && p.max_users < 20
  )

  const recommendedForEnterprise = plans.find(p =>
    p.max_users === null || p.max_users >= 20
  )

  return (
    <section>
      {/* 3가지 추천 카드 표시 */}
    </section>
  )
}
```

## 구현 계획

### Phase 1: 데이터 구조 개선
1. ✅ ComparisonTable을 동적 플랜 배열 받도록 수정
2. ✅ 하드코딩된 categories 제거
3. ✅ FEATURE_MATRIX 기반으로 features 파싱

### Phase 2: 서버 사이드 데이터 로딩
1. ✅ `/features/comparison/page.tsx`를 Server Component로 유지
2. ✅ Supabase에서 subscription_plans 조회
3. ✅ Free 플랜 추가 (명시적 정의)

### Phase 3: UI 개선
1. ✅ 6개 플랜 테이블 레이아웃
2. ✅ 반응형 디자인 (모바일 스크롤)
3. ✅ 플랜 강조 (인기, 추천 배지)

### Phase 4: PlanRecommendation 업데이트
1. ✅ 동적 추천 로직
2. ✅ 플랜별 특성 강조

## 데이터 매핑

### 기존 비교표 → 새 구조

**현재 (하드코딩):**
```typescript
const comparisonCategories = [
  {
    name: '랜딩페이지 기능',
    features: [
      { name: '비주얼 에디터', free: true, pro: true },
      { name: '전문 템플릿', free: '10개', pro: '30개 이상' },
      // ...
    ]
  },
  // ...
]
```

**개선 후 (동적):**
```typescript
// Server Component에서 조회
const plans = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('is_active', true)
  .order('sort_order')

// 기능 카테고리는 유지하되, 각 플랜의 features를 파싱
const enhancedCategories = FEATURE_CATEGORIES.map(category => ({
  ...category,
  features: category.features.map(feature => ({
    name: feature.name,
    values: plans.map(plan =>
      evaluateFeature(plan, feature.key)
    )
  }))
}))
```

## 타입 정의

```typescript
// src/types/subscription.ts
export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: {
    dashboard?: boolean
    db_status?: boolean
    db_schedule?: boolean
    reservation_schedule?: boolean
    advanced_schedule?: boolean
    analytics?: boolean
    reports?: boolean
    priority_support?: boolean
    customization?: boolean
    custom_integration?: boolean
  }
  max_users: number | null
  max_landing_pages: number | null
  max_leads?: number | null
  max_campaigns?: number | null
  is_active: boolean
  sort_order: number
  user_type?: 'personal' | 'business'
  tier?: 'free' | 'basic' | 'pro'
}

export interface ComparisonFeature {
  name: string
  key: string
  category: string
  getValue: (plan: SubscriptionPlan) => boolean | string | number
}

export interface ComparisonCategory {
  name: string
  features: ComparisonFeature[]
}
```

## 예상 결과

### 비교표 화면 (Desktop)
```
┌─────────────────────┬──────┬───────┬───────┬──────┬──────┬──────┐
│ 기능                │ Free │ ₩19K  │ ₩66K  │₩200K │₩490K │ 협의 │
├─────────────────────┼──────┼───────┼───────┼──────┼──────┼──────┤
│ 랜딩페이지 빌더      │  ✓   │   ✓   │   ✓   │  ✓   │  ✓   │  ✓   │
│ DB 관리             │  ✓   │   ✓   │   ✓   │  ✓   │  ✓   │  ✓   │
│ DB 스케줄           │  ✗   │   ✗   │   ✓   │  ✓   │  ✓   │  ✓   │
│ 예약 스케줄         │  ✗   │   ✗   │   ✓   │  ✓   │  ✓   │  ✓   │
│ 분석               │  ✗   │   ✗   │   ✓   │  ✓   │  ✓   │  ✓   │
│ 리포트             │  ✗   │   ✗   │   ✓   │  ✓   │  ✓   │  ✓   │
│ 우선 지원          │  ✗   │   ✗   │   ✗   │  ✗   │  ✓   │  ✓   │
│ 커스텀 통합        │  ✗   │   ✗   │   ✗   │  ✗   │  ✗   │  ✓   │
│ 랜딩페이지 수      │  1   │   1   │   1   │  3   │  20  │ 무제한│
│ 팀원 수            │  1   │   1   │   1   │  3   │  20  │ 무제한│
└─────────────────────┴──────┴───────┴───────┴──────┴──────┴──────┘
```

## 마이그레이션 체크리스트

- [ ] subscription_plans 테이블 데이터 확인
- [ ] Free 플랜 존재 여부 확인 (없으면 명시적 추가)
- [ ] 모든 플랜이 sort_order를 가지는지 확인
- [ ] features JSONB 구조 일관성 확인
- [ ] ComparisonTable 컴포넌트 리팩토링
- [ ] PlanRecommendation 동적 로직 추가
- [ ] 반응형 테스트 (모바일/태블릿/데스크톱)
- [ ] 타입 정의 추가
- [ ] 가격 표시 형식 일관성 확인

## 주의사항

1. **데이터베이스 마이그레이션 충돌:**
   - 20251221 (user_type/tier) vs 20251224 (단순 5개 플랜)
   - 어느 것이 최신인지 확인 필요
   - 현재 production에 어떤 구조가 적용되어 있는지 확인

2. **Free 플랜 처리:**
   - DB에 명시적으로 존재하는지 확인
   - 없다면 프론트엔드에서 추가하거나 DB에 INSERT

3. **가격 표시:**
   - 0원 플랜: "무료" 또는 "가격 협의"
   - 연간 할인율 계산 및 표시

4. **기능 매핑:**
   - features JSONB 키가 일관적인지 확인
   - 누락된 기능 처리 로직
