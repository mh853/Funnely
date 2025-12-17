# Phase 3.3: 이탈 분석 시스템 (Churn Analysis) - 상세 설계

## 목표
구독 취소/만료 이벤트를 자동으로 추적하고, 이탈 패턴을 분석하여 예방 가능한 이탈을 사전에 감지

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                   이탈 분석 시스템                           │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐      ┌───────▼────────┐   ┌─────▼─────┐
   │ 이탈     │      │ 이탈 메트릭     │   │ 이탈      │
   │ 이벤트   │      │ 계산 엔진       │   │ 대시보드  │
   │ 수집기   │      │                │   │ UI        │
   └─────────┘      └────────────────┘   └───────────┘
        │                   │                   │
        │                   │                   │
   ┌────▼────┐      ┌───────▼────────┐   ┌─────▼─────┐
   │ Trigger │      │ Cron Job       │   │ API       │
   │ Function│      │ (Daily)        │   │ Endpoint  │
   └─────────┘      └────────────────┘   └───────────┘
```

---

## 1. 데이터베이스 스키마

### 기존 테이블 활용: `churn_records`

**위치**: `supabase/migrations/20251216000000_admin_enhancement_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS churn_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE SET NULL,

  -- 이탈 정보
  churned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tenure_days INTEGER NOT NULL,              -- 사용 기간 (일)
  last_mrr DECIMAL(10,2),                    -- 이탈 직전 MRR

  -- 이탈 사유
  reason TEXT,                               -- 상세 사유
  reason_category TEXT,                      -- 카테고리: pricing, features, support, competition, other
  feedback TEXT,                             -- 추가 피드백

  -- 예방 분석
  was_preventable BOOLEAN DEFAULT FALSE,     -- 예방 가능 여부

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**인덱스**:
- `idx_churn_churned_at`: 시간순 조회 최적화
- `idx_churn_reason_category`: 카테고리별 집계 최적화
- `idx_churn_preventable`: 예방 가능 이탈 필터링
- `idx_churn_company`: 회사별 이탈 이력 조회

---

## 2. 이탈 데이터 수집 시스템

### 2.1 자동 이탈 감지 트리거

**파일**: `supabase/migrations/20251217000010_churn_detection_trigger.sql`

```sql
-- 이탈 감지 및 기록 함수
CREATE OR REPLACE FUNCTION detect_and_record_churn()
RETURNS TRIGGER AS $$
DECLARE
  v_tenure_days INTEGER;
  v_last_mrr DECIMAL(10,2);
  v_signup_date TIMESTAMPTZ;
BEGIN
  -- 상태가 'canceled' 또는 'expired'로 변경된 경우에만 처리
  IF (OLD.status IN ('active', 'trial', 'past_due') AND
      NEW.status IN ('canceled', 'expired')) THEN

    -- 회사 가입일 조회
    SELECT created_at INTO v_signup_date
    FROM companies
    WHERE id = NEW.company_id;

    -- 사용 기간 계산 (일)
    v_tenure_days := EXTRACT(DAY FROM (NEW.canceled_at - v_signup_date));

    -- 마지막 MRR 계산
    SELECT
      CASE NEW.billing_cycle
        WHEN 'monthly' THEN sp.monthly_price
        WHEN 'yearly' THEN sp.yearly_price / 12
        ELSE 0
      END INTO v_last_mrr
    FROM subscription_plans sp
    WHERE sp.id = NEW.plan_id;

    -- churn_records에 기록
    INSERT INTO churn_records (
      company_id,
      churned_at,
      tenure_days,
      last_mrr,
      reason,
      reason_category
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.canceled_at, NOW()),
      v_tenure_days,
      v_last_mrr,
      NEW.cancel_reason,
      'other'  -- 기본값, API로 업데이트 가능
    );

    RAISE NOTICE 'Churn recorded for company_id: %, tenure: % days, MRR: %',
                  NEW.company_id, v_tenure_days, v_last_mrr;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_detect_churn ON company_subscriptions;
CREATE TRIGGER trigger_detect_churn
  AFTER UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION detect_and_record_churn();
```

### 2.2 이탈 사유 업데이트 API

**파일**: `src/app/api/admin/churn/record/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_CHURN_ANALYSIS)

    // 3. 요청 본문 파싱
    const body = await request.json()
    const {
      churn_record_id,
      reason_category,
      feedback,
      was_preventable,
    } = body

    // 4. 이탈 기록 업데이트
    const { data, error } = await supabase
      .from('churn_records')
      .update({
        reason_category,
        feedback,
        was_preventable,
      })
      .eq('id', churn_record_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating churn record:', error)
    return NextResponse.json(
      { error: 'Failed to update churn record' },
      { status: 500 }
    )
  }
}
```

---

## 3. 이탈 메트릭 계산 로직

### 3.1 타입 정의

**파일**: `src/types/churn.ts`

```typescript
export interface ChurnRecord {
  id: string
  company_id: string
  churned_at: string
  tenure_days: number
  last_mrr: number
  reason: string | null
  reason_category: string | null
  feedback: string | null
  was_preventable: boolean
  created_at: string
}

export interface ChurnMetrics {
  // 기본 메트릭
  period: 'monthly' | 'quarterly' | 'yearly'
  churn_rate: number // %
  churned_count: number
  total_companies_at_start: number

  // 재무 영향
  lost_mrr: number
  lost_arr: number

  // 이탈 분석
  average_tenure_days: number
  median_tenure_days: number

  // 카테고리별 분포
  reasons: ChurnReasonBreakdown[]

  // 예방 가능성
  preventable_analysis: {
    preventable_count: number
    preventable_percentage: number
    potential_saved_mrr: number
  }
}

export interface ChurnReasonBreakdown {
  category: string
  count: number
  percentage: number
  lost_mrr: number
}

export interface ChurnTrend {
  period: string // '2025-07' for monthly, '2025-Q3' for quarterly
  churn_rate: number
  churned_count: number
  lost_mrr: number
}

export interface ChurnAnalysisResponse {
  current: ChurnMetrics
  trends: {
    last_12_months: ChurnTrend[]
  }
  at_risk_companies: AtRiskCompany[]
}

export interface AtRiskCompany {
  company_id: string
  company_name: string
  risk_score: number
  risk_factors: string[]
  current_mrr: number
  tenure_days: number
  last_login: string
}
```

### 3.2 계산 함수

**파일**: `src/lib/churn/calculations.ts`

```typescript
import type { ChurnRecord, ChurnMetrics, ChurnReasonBreakdown } from '@/types/churn'

/**
 * 이탈률 계산
 * Churn Rate = (이탈 회사 수 / 기간 시작 시점 총 회사 수) * 100
 */
export function calculateChurnRate(
  churnedCount: number,
  totalAtStart: number
): number {
  if (totalAtStart === 0) return 0
  return (churnedCount / totalAtStart) * 100
}

/**
 * 평균 사용 기간 계산
 */
export function calculateAverageTenure(records: ChurnRecord[]): number {
  if (records.length === 0) return 0
  const sum = records.reduce((acc, r) => acc + r.tenure_days, 0)
  return Math.round(sum / records.length)
}

/**
 * 중앙값 사용 기간 계산
 */
export function calculateMedianTenure(records: ChurnRecord[]): number {
  if (records.length === 0) return 0

  const sorted = [...records].sort((a, b) => a.tenure_days - b.tenure_days)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1].tenure_days + sorted[mid].tenure_days) / 2)
  } else {
    return sorted[mid].tenure_days
  }
}

/**
 * 이탈 사유 카테고리별 분석
 */
export function analyzeChurnReasons(records: ChurnRecord[]): ChurnReasonBreakdown[] {
  const categoryMap = new Map<string, { count: number; lost_mrr: number }>()

  records.forEach(record => {
    const category = record.reason_category || 'unknown'
    const existing = categoryMap.get(category) || { count: 0, lost_mrr: 0 }

    categoryMap.set(category, {
      count: existing.count + 1,
      lost_mrr: existing.lost_mrr + (record.last_mrr || 0),
    })
  })

  const total = records.length
  const breakdown: ChurnReasonBreakdown[] = []

  categoryMap.forEach((value, category) => {
    breakdown.push({
      category,
      count: value.count,
      percentage: total > 0 ? (value.count / total) * 100 : 0,
      lost_mrr: value.lost_mrr,
    })
  })

  // 비율 높은 순으로 정렬
  return breakdown.sort((a, b) => b.percentage - a.percentage)
}

/**
 * 예방 가능 이탈 분석
 */
export function analyzePreventableChurn(records: ChurnRecord[]) {
  const preventable = records.filter(r => r.was_preventable)
  const preventableCount = preventable.length
  const preventablePercentage = records.length > 0
    ? (preventableCount / records.length) * 100
    : 0

  const potentialSavedMrr = preventable.reduce(
    (sum, r) => sum + (r.last_mrr || 0),
    0
  )

  return {
    preventable_count: preventableCount,
    preventable_percentage: preventablePercentage,
    potential_saved_mrr: potentialSavedMrr,
  }
}

/**
 * 총 손실 MRR/ARR 계산
 */
export function calculateLostRevenue(records: ChurnRecord[]) {
  const lostMrr = records.reduce((sum, r) => sum + (r.last_mrr || 0), 0)
  const lostArr = lostMrr * 12

  return { lost_mrr: lostMrr, lost_arr: lostArr }
}
```

---

## 4. 이탈 분석 API

**파일**: `src/app/api/admin/churn/analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import {
  calculateChurnRate,
  calculateAverageTenure,
  calculateMedianTenure,
  analyzeChurnReasons,
  analyzePreventableChurn,
  calculateLostRevenue,
} from '@/lib/churn/calculations'
import type { ChurnAnalysisResponse } from '@/types/churn'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_CHURN_ANALYSIS)

    // 3. 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'monthly') as 'monthly' | 'quarterly' | 'yearly'

    // 4. 기간 설정
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'yearly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
    }

    // 5. 기간 시작 시점 총 회사 수 계산
    const { count: totalAtStart } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', startDate.toISOString())

    // 6. 해당 기간 이탈 기록 조회
    const { data: churnRecords, error: churnError } = await supabase
      .from('churn_records')
      .select('*')
      .gte('churned_at', startDate.toISOString())
      .lte('churned_at', now.toISOString())
      .order('churned_at', { ascending: false })

    if (churnError) throw churnError

    // 7. 메트릭 계산
    const churnedCount = churnRecords?.length || 0
    const churnRate = calculateChurnRate(churnedCount, totalAtStart || 0)
    const { lost_mrr, lost_arr } = calculateLostRevenue(churnRecords || [])
    const averageTenure = calculateAverageTenure(churnRecords || [])
    const medianTenure = calculateMedianTenure(churnRecords || [])
    const reasons = analyzeChurnReasons(churnRecords || [])
    const preventableAnalysis = analyzePreventableChurn(churnRecords || [])

    // 8. 12개월 트렌드 계산
    const trends = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const { data: monthRecords } = await supabase
        .from('churn_records')
        .select('*')
        .gte('churned_at', monthStart.toISOString())
        .lte('churned_at', monthEnd.toISOString())

      const monthChurnedCount = monthRecords?.length || 0
      const monthLostMrr = (monthRecords || []).reduce(
        (sum, r) => sum + (r.last_mrr || 0),
        0
      )

      // 해당 월 시작 시점 총 회사 수
      const { count: monthTotalAtStart } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', monthStart.toISOString())

      trends.push({
        period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        churn_rate: calculateChurnRate(monthChurnedCount, monthTotalAtStart || 0),
        churned_count: monthChurnedCount,
        lost_mrr: monthLostMrr,
      })
    }

    // 9. 고위험 회사 식별 (customer_health_scores 활용)
    const { data: atRiskCompanies } = await supabase
      .from('customer_health_scores')
      .select(`
        company_id,
        score,
        risk_level,
        metrics,
        companies:company_id (
          name,
          created_at
        )
      `)
      .in('risk_level', ['high', 'critical'])
      .order('score', { ascending: true })
      .limit(10)

    const atRisk = (atRiskCompanies || []).map((item: any) => {
      const tenureDays = Math.floor(
        (now.getTime() - new Date(item.companies.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
      )

      return {
        company_id: item.company_id,
        company_name: item.companies.name,
        risk_score: item.score,
        risk_factors: [], // TODO: Extract from metrics
        current_mrr: 0, // TODO: Calculate from subscription
        tenure_days: tenureDays,
        last_login: item.metrics?.lastLoginAt || null,
      }
    })

    // 10. 응답 구성
    const response: ChurnAnalysisResponse = {
      current: {
        period,
        churn_rate: churnRate,
        churned_count: churnedCount,
        total_companies_at_start: totalAtStart || 0,
        lost_mrr,
        lost_arr,
        average_tenure_days: averageTenure,
        median_tenure_days: medianTenure,
        reasons,
        preventable_analysis: preventableAnalysis,
      },
      trends: {
        last_12_months: trends,
      },
      at_risk_companies: atRisk,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching churn analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch churn analysis' },
      { status: 500 }
    )
  }
}
```

---

## 5. 이탈 대시보드 UI

### 컴포넌트 구조

```
src/app/admin/churn/
├── page.tsx                           # 메인 이탈 분석 페이지
└── components/
    ├── ChurnMetricsCard.tsx           # 이탈률/손실 MRR 카드
    ├── ChurnTrendChart.tsx            # 12개월 이탈률 추이 차트
    ├── ChurnReasonChart.tsx           # 이탈 사유 분포 파이 차트
    ├── PreventableChurnCard.tsx       # 예방 가능 이탈 분석
    └── AtRiskCompaniesTable.tsx       # 고위험 회사 테이블
```

### 5.1 메인 페이지

**파일**: `src/app/admin/churn/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { ChurnAnalysisResponse } from '@/types/churn'
import ChurnMetricsCard from './components/ChurnMetricsCard'
import ChurnTrendChart from './components/ChurnTrendChart'
import ChurnReasonChart from './components/ChurnReasonChart'
import PreventableChurnCard from './components/PreventableChurnCard'
import AtRiskCompaniesTable from './components/AtRiskCompaniesTable'

export default function ChurnAnalysisPage() {
  const [data, setData] = useState<ChurnAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchChurnAnalysis()
  }, [period])

  async function fetchChurnAnalysis() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/churn/analysis?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const analysisData = await response.json()
      setData(analysisData)
    } catch (error) {
      console.error('Error fetching churn analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">이탈 분석 로딩 중...</p>
      </div>
    </div>
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">데이터를 불러올 수 없습니다</p>
    </div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이탈 분석</h1>
          <p className="mt-1 text-sm text-gray-500">
            구독 취소 패턴을 분석하고 예방 가능한 이탈을 식별합니다
          </p>
        </div>

        {/* 기간 선택 */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="monthly">월간</option>
          <option value="quarterly">분기</option>
          <option value="yearly">연간</option>
        </select>
      </div>

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <ChurnMetricsCard
          title="이탈률"
          value={data.current.churn_rate}
          unit="%"
          description={`${data.current.churned_count}개 회사 이탈`}
        />
        <ChurnMetricsCard
          title="손실 MRR"
          value={data.current.lost_mrr}
          unit="원"
          isCurrency
        />
        <ChurnMetricsCard
          title="평균 사용 기간"
          value={data.current.average_tenure_days}
          unit="일"
        />
      </div>

      {/* 트렌드 차트 */}
      {data.trends.last_12_months.length > 0 && (
        <div className="mb-6">
          <ChurnTrendChart data={data.trends.last_12_months} />
        </div>
      )}

      {/* 이탈 사유 & 예방 가능 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChurnReasonChart reasons={data.current.reasons} />
        <PreventableChurnCard analysis={data.current.preventable_analysis} />
      </div>

      {/* 고위험 회사 테이블 */}
      {data.at_risk_companies.length > 0 && (
        <AtRiskCompaniesTable companies={data.at_risk_companies} />
      )}
    </div>
  )
}
```

---

## 6. 구현 체크리스트

### 6.1 데이터 수집
- [ ] 이탈 감지 트리거 함수 생성
- [ ] `company_subscriptions` 테이블에 트리거 연결
- [ ] 이탈 사유 업데이트 API (POST /api/admin/churn/record)

### 6.2 메트릭 계산
- [ ] 이탈률 계산 함수
- [ ] 평균/중앙값 사용 기간 계산
- [ ] 이탈 사유 카테고리별 분석
- [ ] 예방 가능 이탈 분석
- [ ] 손실 MRR/ARR 계산

### 6.3 API 엔드포인트
- [ ] GET /api/admin/churn/analysis (이탈 분석 조회)
- [ ] POST /api/admin/churn/record (이탈 사유 업데이트)

### 6.4 대시보드 UI
- [ ] ChurnMetricsCard 컴포넌트
- [ ] ChurnTrendChart 컴포넌트 (Recharts LineChart)
- [ ] ChurnReasonChart 컴포넌트 (Recharts PieChart)
- [ ] PreventableChurnCard 컴포넌트
- [ ] AtRiskCompaniesTable 컴포넌트
- [ ] 메인 페이지 (/admin/churn)
- [ ] Admin 네비게이션 메뉴 추가

### 6.5 권한 및 보안
- [ ] PERMISSIONS.VIEW_CHURN_ANALYSIS 권한 추가
- [ ] finance 역할에 권한 부여
- [ ] API 엔드포인트에 권한 체크 적용

---

## 7. 테스트 시나리오

### 7.1 이탈 감지 테스트
1. 활성 구독의 status를 'canceled'로 변경
2. churn_records 테이블에 자동으로 레코드 생성 확인
3. tenure_days, last_mrr 값이 올바르게 계산되었는지 확인

### 7.2 이탈 분석 API 테스트
1. 월간/분기/연간 각 기간별 이탈률 조회
2. 이탈 사유 카테고리별 분포 확인
3. 12개월 트렌드 데이터 검증
4. 고위험 회사 목록 조회

### 7.3 UI 테스트
1. 이탈 분석 대시보드 로딩 및 데이터 표시
2. 기간 선택 시 데이터 재조회
3. 차트 및 테이블 인터랙션

---

## 8. 성능 최적화

### 8.1 데이터베이스 인덱스
- `idx_churn_churned_at`: 시간 범위 쿼리 최적화
- `idx_churn_reason_category`: 카테고리별 집계 최적화
- `idx_churn_company`: 회사별 조회 최적화

### 8.2 쿼리 최적화
- 12개월 트렌드 계산 시 병렬 쿼리 고려
- 고위험 회사 조회 시 LIMIT 10 적용
- 불필요한 JOIN 제거

### 8.3 캐싱 전략
- 이탈 분석 결과를 Redis에 1시간 캐싱
- 기간별 캐시 키 분리 (`churn:analysis:monthly`, `churn:analysis:quarterly`)

---

## 9. 모니터링 및 알림

### 9.1 이탈률 임계값 알림
- 월간 이탈률 > 5%: 경고 알림
- 월간 이탈률 > 10%: 위험 알림
- 예방 가능 이탈 > 3건: 즉시 검토 필요

### 9.2 Slack 통합
```typescript
// 이탈 발생 시 Slack 알림
async function notifyChurnToSlack(churnRecord: ChurnRecord) {
  const message = `
🚨 고객사 이탈 발생
회사: ${churnRecord.company_name}
사용 기간: ${churnRecord.tenure_days}일
손실 MRR: ₩${churnRecord.last_mrr}
사유: ${churnRecord.reason || '미입력'}
  `
  // Send to Slack webhook
}
```

---

## 10. 예상 소요 시간
- **데이터 수집 시스템**: 0.5일
- **메트릭 계산 로직**: 0.5일
- **API 엔드포인트**: 0.5일
- **대시보드 UI**: 1일
- **테스트 및 최적화**: 0.5일

**총 예상**: 3일

---

## 11. 다음 단계 (Phase 3.4)
Phase 3.4에서는 **성장 기회 식별** 시스템을 구현:
- 업셀 신호 감지 (사용량 한계, 고급 기능 시도)
- 다운셀 위험 감지 (활성도 급감)
- 성장 기회 대시보드 UI
