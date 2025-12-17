# Admin Companies Page - Payment Information Design

## Requirement
회사 관리 페이지에 각 회사의 **결제금액**과 **결제 횟수(결제일)** 정보를 추가하여 표시.

## Current Data Analysis

### Available Payment Data Sources

#### 1. Lead Payments (`lead_payments` table)
**Purpose**: 리드별 결제 내역 추적

**Schema**:
```sql
CREATE TABLE lead_payments (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  company_id UUID REFERENCES companies(id),
  amount INTEGER NOT NULL,           -- 결제 금액
  payment_date TIMESTAMPTZ NOT NULL, -- 결제 날짜
  notes TEXT,                        -- 비고
  created_at TIMESTAMPTZ,
  created_by UUID
);
```

**Current Data** (as of 2025-12-17):
- **퍼널리**: 1,100,000원, 4회 결제
  - 2025-12-13: 200,000원 (테스트)
  - 2025-12-13: 400,000원
  - 2025-12-08: 300,000원
  - (1 more payment)
- **홍란의 병원**: 결제 기록 없음
- **최문호의 병원**: 결제 기록 없음

#### 2. Company Subscriptions (`company_subscriptions` table)
**Purpose**: 회사별 구독 플랜 및 상태

**Schema**:
```sql
CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL,              -- 'trial', 'active', 'past_due', 'canceled', 'expired'
  billing_cycle TEXT NOT NULL,       -- 'monthly', 'yearly'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  ...
);
```

**Current Data**: No subscriptions exist for any company

#### 3. Subscription Plans (`subscription_plans` table)
**Purpose**: 구독 플랜 정의 (베이직, 프로, 엔터프라이즈)

**Available Plans**:
- 베이직: 29,000원/월, 290,000원/년
- 프로: 99,000원/월, 990,000원/년
- 엔터프라이즈: 299,000원/월, 2,990,000원/년

## Design Solution

### UI Design: Admin Companies Table Enhancement

**Current Columns** ([src/app/admin/companies/page.tsx:200-221](src/app/admin/companies/page.tsx#L200-L221)):
1. 회사명
2. 담당자
3. 사용자
4. 리드
5. 페이지
6. 상태
7. 가입일

**Proposed New Columns**:
8. **총 결제금액** - 모든 lead_payments의 합계
9. **결제 횟수** - lead_payments 레코드 수
10. **최근 결제일** - 가장 최근 payment_date

**Alternative Design** (더 간결한 버전):
- 결제 정보를 하나의 컬럼으로 통합: "1,100,000원 (4회)"
- 호버 시 최근 결제 내역 표시 (툴팁)

### Data Structure Design

#### Type Definition Update

**File**: [src/types/admin.ts](src/types/admin.ts)

**Add to `CompanyListItem` interface**:
```typescript
export interface CompanyListItem {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string

  admin_user: {
    id: string
    full_name: string
    email: string
  }

  stats: {
    total_users: number
    total_leads: number
    landing_pages_count: number
  }

  // NEW: Payment information
  payment_info: {
    total_amount: number       // 총 결제금액 (원)
    payment_count: number      // 결제 횟수
    last_payment_date: string | null  // 최근 결제일 (ISO 8601)
    recent_payments: Array<{   // 최근 5건 (optional, for tooltip)
      amount: number
      payment_date: string
      notes: string | null
    }>
  }

  // OPTIONAL: Subscription information (Phase 2)
  subscription?: {
    plan_name: string          // 'basic', 'pro', 'enterprise'
    display_name: string       // '베이직', '프로', '엔터프라이즈'
    status: string             // 'trial', 'active', 'past_due', 'canceled', 'expired'
    billing_cycle: string      // 'monthly', 'yearly'
    next_payment_date: string | null
    monthly_amount: number     // MRR (Monthly Recurring Revenue)
  }
}
```

#### API Response Format

**File**: [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts)

**Add payment query** (lines 95-125):
```typescript
const companiesWithDetails = await Promise.all(
  (companies || []).map(async (company) => {
    // ... existing queries (admin_user, stats) ...

    // Payment information query
    const { data: payments } = await supabase
      .from('lead_payments')
      .select('amount, payment_date, notes')
      .eq('company_id', company.id)
      .order('payment_date', { ascending: false });

    const totalAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const paymentCount = payments?.length || 0;
    const lastPaymentDate = payments?.[0]?.payment_date || null;
    const recentPayments = payments?.slice(0, 5) || [];

    // Subscription information query (optional)
    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select(`
        status,
        billing_cycle,
        current_period_end,
        subscription_plans(plan_name, display_name, monthly_price, yearly_price)
      `)
      .eq('company_id', company.id)
      .eq('status', 'active')
      .single();

    return {
      id: company.id,
      name: company.name,
      slug: company.short_id,
      is_active: company.is_active,
      created_at: company.created_at,
      admin_user: { ... },
      stats: { ... },
      payment_info: {
        total_amount: totalAmount,
        payment_count: paymentCount,
        last_payment_date: lastPaymentDate,
        recent_payments: recentPayments
      },
      subscription: subscription ? {
        plan_name: subscription.subscription_plans.plan_name,
        display_name: subscription.subscription_plans.display_name,
        status: subscription.status,
        billing_cycle: subscription.billing_cycle,
        next_payment_date: subscription.current_period_end,
        monthly_amount: subscription.billing_cycle === 'monthly'
          ? subscription.subscription_plans.monthly_price
          : Math.round(subscription.subscription_plans.yearly_price / 12)
      } : undefined
    };
  })
);
```

### Frontend Implementation

#### Table Header Update

**File**: [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx)

**Add columns** (after line 214):
```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  결제 정보
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  최근 결제
</th>
```

#### Table Body Update

**Add cells** (after line 254):
```tsx
{/* Payment Information */}
<td className="px-6 py-4">
  <div>
    <div className="font-medium text-gray-900">
      {company.payment_info.total_amount.toLocaleString()}원
    </div>
    <div className="text-xs text-gray-500">
      {company.payment_info.payment_count}회 결제
    </div>
  </div>
</td>

{/* Last Payment Date */}
<td className="px-6 py-4 text-sm text-gray-500">
  {company.payment_info.last_payment_date
    ? format(new Date(company.payment_info.last_payment_date), 'yyyy-MM-dd', { locale: ko })
    : '없음'}
</td>
```

#### Alternative: Compact Design with Tooltip

```tsx
{/* Payment Information - Compact */}
<td className="px-6 py-4">
  <div className="group relative">
    <div className="text-sm text-gray-900">
      {company.payment_info.total_amount.toLocaleString()}원
      <span className="text-xs text-gray-500 ml-1">
        ({company.payment_info.payment_count}회)
      </span>
    </div>

    {/* Tooltip with recent payments */}
    {company.payment_info.payment_count > 0 && (
      <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="text-xs font-medium text-gray-900 mb-2">최근 결제 내역</div>
        {company.payment_info.recent_payments.map((payment, idx) => (
          <div key={idx} className="text-xs text-gray-600 py-1">
            {format(new Date(payment.payment_date), 'yyyy-MM-dd', { locale: ko })}:
            {' '}{payment.amount.toLocaleString()}원
            {payment.notes && ` (${payment.notes})`}
          </div>
        ))}
      </div>
    )}
  </div>
</td>
```

### Statistics Summary Enhancement

**Add payment summary cards** ([src/app/admin/companies/page.tsx:172-186](src/app/admin/companies/page.tsx#L172-L186)):

```tsx
{/* Current: 총 회사 수 */}
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">총 회사</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {data.pagination.total}
      </p>
    </div>
    <Building2 className="h-10 w-10 text-blue-500" />
  </div>
</div>

{/* NEW: 총 결제금액 */}
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">총 결제금액</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {data.companies
          .reduce((sum, c) => sum + c.payment_info.total_amount, 0)
          .toLocaleString()}원
      </p>
    </div>
    <DollarSign className="h-10 w-10 text-green-500" />
  </div>
</div>

{/* NEW: 평균 결제금액 */}
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">평균 결제금액</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {Math.round(
          data.companies.reduce((sum, c) => sum + c.payment_info.total_amount, 0) /
          Math.max(data.companies.filter(c => c.payment_info.payment_count > 0).length, 1)
        ).toLocaleString()}원
      </p>
    </div>
    <TrendingUp className="h-10 w-10 text-purple-500" />
  </div>
</div>
```

### Icons Import

**Add to imports** (line 6):
```tsx
import {
  Search, ChevronLeft, ChevronRight, Building2, Users, FileText,
  DollarSign, TrendingUp  // NEW
} from 'lucide-react'
```

## Performance Optimization

### Current Approach Issues
- N+1 query problem: 1 payment query per company
- Slow for many companies

### Optimized Approach: Aggregation Query

**SQL View Approach** (recommended):
```sql
-- Create materialized view for company payment stats
CREATE MATERIALIZED VIEW company_payment_stats AS
SELECT
  company_id,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount,
  MAX(payment_date) as last_payment_date,
  jsonb_agg(
    jsonb_build_object(
      'amount', amount,
      'payment_date', payment_date,
      'notes', notes
    )
    ORDER BY payment_date DESC
  ) FILTER (WHERE payment_date >= NOW() - INTERVAL '90 days') as recent_payments
FROM lead_payments
GROUP BY company_id;

-- Refresh daily or on-demand
REFRESH MATERIALIZED VIEW company_payment_stats;
```

**Alternative: Single Aggregation Query**:
```typescript
// Get all payment stats in one query
const { data: paymentStats } = await supabase
  .from('lead_payments')
  .select('company_id, amount, payment_date, notes')
  .order('payment_date', { ascending: false });

// Group by company in JavaScript
const paymentsByCompany = paymentStats?.reduce((acc, payment) => {
  const companyId = payment.company_id;
  if (!acc[companyId]) {
    acc[companyId] = {
      payments: [],
      total_amount: 0,
      payment_count: 0
    };
  }
  acc[companyId].payments.push(payment);
  acc[companyId].total_amount += payment.amount;
  acc[companyId].payment_count += 1;
  return acc;
}, {});

// Then merge with company data
const companiesWithDetails = companies.map(company => ({
  ...company,
  payment_info: {
    total_amount: paymentsByCompany[company.id]?.total_amount || 0,
    payment_count: paymentsByCompany[company.id]?.payment_count || 0,
    last_payment_date: paymentsByCompany[company.id]?.payments[0]?.payment_date || null,
    recent_payments: paymentsByCompany[company.id]?.payments.slice(0, 5) || []
  }
}));
```

## Phase 2 Features (Optional)

### 1. Subscription Information Display
- Current plan name and status
- Next payment date
- MRR (Monthly Recurring Revenue)

### 2. Payment History Modal
- Click on payment info → Show detailed payment history modal
- Filter by date range
- Export to CSV

### 3. Payment Analytics
- Payment trends chart (monthly/yearly)
- Revenue forecasting
- Churn rate calculation

### 4. Payment Filters
- Filter by payment amount range
- Filter by payment date range
- Sort by total amount / payment count

## Implementation Steps

### Phase 1: Basic Payment Display (Recommended for MVP)

1. ✅ **Update Type Definition** ([src/types/admin.ts](src/types/admin.ts))
   - Add `payment_info` to `CompanyListItem` interface

2. ✅ **Update API Query** ([src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts))
   - Query `lead_payments` per company
   - Calculate total_amount, payment_count, last_payment_date
   - Include in response

3. ✅ **Update Frontend Table** ([src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx))
   - Add "결제 정보" and "최근 결제" columns
   - Display payment data with formatting

4. ✅ **Add Statistics Cards**
   - Total payment amount across all companies
   - Average payment amount per company

5. ✅ **Testing**
   - Verify 퍼널리 shows: 1,100,000원, 4회, 2025-12-13
   - Verify other companies show: 0원, 0회, 없음

### Phase 2: Enhanced Features (Optional)

6. ⏳ **Add Subscription Display**
   - Query `company_subscriptions` and `subscription_plans`
   - Display current plan, status, MRR

7. ⏳ **Add Payment History Modal**
   - Detailed payment history with filtering
   - Export functionality

8. ⏳ **Performance Optimization**
   - Create materialized view or use aggregation query
   - Add caching layer

## Testing Checklist

After implementation:

### Data Accuracy
- [ ] 퍼널리: Shows 1,100,000원, 4회 결제
- [ ] 퍼널리: Last payment date shows 2025-12-13
- [ ] 홍란의 병원: Shows 0원, 0회 결제
- [ ] 최문호의 병원: Shows 0원, 0회 결제

### UI/UX
- [ ] Payment columns display correctly
- [ ] Numbers formatted with commas (1,100,000원)
- [ ] Date formatted as YYYY-MM-DD (2025-12-13)
- [ ] "없음" shows for companies with no payments
- [ ] Statistics cards show correct totals

### Performance
- [ ] Page loads within 2 seconds
- [ ] No N+1 query issues (check network tab)
- [ ] Pagination works with payment data

## Related Files

**Frontend**:
- [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx) - Companies list page
- [src/types/admin.ts](src/types/admin.ts) - Type definitions

**Backend**:
- [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts) - API endpoint

**Database**:
- [supabase/migrations/20250217000000_create_lead_payments.sql](supabase/migrations/20250217000000_create_lead_payments.sql) - Payment table
- [supabase/migrations/20250131010000_create_subscription_system.sql](supabase/migrations/20250131010000_create_subscription_system.sql) - Subscription tables

**Diagnostics**:
- [scripts/check-payment-data.mjs](scripts/check-payment-data.mjs) - Payment data checker

## Data Model Summary

```
companies (3 companies)
├── lead_payments (리드별 결제)
│   ├── 퍼널리: 1,100,000원, 4회
│   ├── 홍란의 병원: 0원, 0회
│   └── 최문호의 병원: 0원, 0회
│
└── company_subscriptions (구독 정보)
    ├── 퍼널리: No subscription
    ├── 홍란의 병원: No subscription
    └── 최문호의 병원: No subscription
```

## Design Decision: Lead Payments Only (Phase 1)

**Rationale**:
1. ✅ Lead payments data exists (퍼널리 has real data)
2. ✅ Clear business value (track actual revenue)
3. ✅ Simple implementation (single table query)
4. ❌ Subscription data doesn't exist yet
5. ❌ Subscription features require more complex setup

**Recommendation**: Start with lead payments display, add subscription info in Phase 2 when subscription system is actively used.
