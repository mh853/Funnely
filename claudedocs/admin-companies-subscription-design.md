# Admin Companies Page - Subscription Information Design

## Requirement Clarification
회사 관리 페이지에 **구독 정보**를 표시.
- 구독 = 회사가 퍼널리 SaaS 시스템을 사용하기 위한 월간/연간 결제
- Lead payments (리드별 결제) ≠ Subscription (SaaS 구독)

## System Architecture

### Database Schema Analysis

#### Tables Verified (✅ All exist):

**1. `subscription_plans` - 구독 플랜 정의**
```sql
Columns:
- id UUID
- name TEXT                   -- 'Free', 'Pro', 'Enterprise'
- description TEXT
- price_monthly INTEGER       -- 월간 가격 (원)
- price_yearly INTEGER        -- 연간 가격 (원)
- features JSONB              -- 플랜 기능 목록
- max_users INTEGER           -- 최대 사용자 수
- max_leads INTEGER           -- 최대 리드 수
- max_campaigns INTEGER       -- 최대 캠페인 수
- is_active BOOLEAN
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**Current Plans**:
- Free: 0원/월
- Pro: 49,000원/월
- Enterprise: 199,000원/월

**2. `company_subscriptions` - 회사별 구독**
```sql
Columns:
- id UUID
- company_id UUID REFERENCES companies(id)
- plan_id UUID REFERENCES subscription_plans(id)
- status TEXT                      -- 'trial', 'active', 'past_due', 'canceled', 'expired'
- billing_cycle TEXT               -- 'monthly', 'yearly'
- trial_start_date TIMESTAMPTZ
- trial_end_date TIMESTAMPTZ
- current_period_start TIMESTAMPTZ
- current_period_end TIMESTAMPTZ   -- Next payment date
- grace_period_end TIMESTAMPTZ
- canceled_at TIMESTAMPTZ
- cancel_reason TEXT
- billing_key TEXT                 -- Toss Payments billing key
- customer_key TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**Current Status**: ⚠️ No subscriptions exist (0 records)

**3. `payment_transactions` - 결제 거래 내역**
```sql
Columns:
- id UUID
- company_id UUID REFERENCES companies(id)
- subscription_id UUID REFERENCES company_subscriptions(id)
- order_id TEXT UNIQUE
- payment_key TEXT
- amount INTEGER                   -- 결제 금액 (원)
- vat INTEGER                      -- 부가세
- total_amount INTEGER             -- 총 결제 금액
- payment_method TEXT              -- 'card', 'transfer', 'virtual_account'
- payment_method_detail JSONB
- status TEXT                      -- 'pending', 'success', 'failed', 'canceled', 'refunded'
- requested_at TIMESTAMPTZ
- approved_at TIMESTAMPTZ
- failed_at TIMESTAMPTZ
- canceled_at TIMESTAMPTZ
- failure_code TEXT
- failure_message TEXT
- cancel_reason TEXT
- receipt_url TEXT
- receipt_data JSONB
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**Current Status**: ⚠️ No payment transactions (0 records)

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

**Proposed New Columns** (Subscription-focused):

**Option 1: Comprehensive Display** (4 columns):
8. **구독 플랜** - Plan name (Free/Pro/Enterprise)
9. **구독 상태** - Status badge (trial/active/past_due/canceled/expired)
10. **월 결제금액** - Monthly price or prorated yearly price
11. **다음 결제일** - current_period_end date

**Option 2: Compact Display** (2 columns):
8. **구독 정보** - "Pro 플랜 (49,000원/월)" + status badge
9. **다음 결제** - "2025-01-15" or "없음" if no subscription

**Option 3: With Payment History** (adds 2 more columns):
12. **총 결제금액** - Sum of successful payment_transactions
13. **결제 횟수** - Count of successful transactions

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

  // NEW: Subscription information
  subscription: {
    // Plan info
    plan_id: string | null
    plan_name: string | null        // 'Free', 'Pro', 'Enterprise'
    plan_display_name: string | null // For future localization

    // Pricing
    monthly_price: number           // 월 결제금액 (원)
    yearly_price: number            // 연 결제금액 (원)
    billing_cycle: 'monthly' | 'yearly' | null

    // Status
    status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none'

    // Dates
    trial_end_date: string | null   // 체험 종료일
    current_period_end: string | null // 다음 결제일
    subscribed_at: string | null    // 구독 시작일
    canceled_at: string | null      // 취소일

    // Payment history
    payment_stats: {
      total_paid: number            // 총 결제금액 (원)
      payment_count: number         // 결제 횟수
      last_payment_date: string | null // 최근 결제일
    }
  } | null  // null if no subscription
}
```

#### API Response Format

**File**: [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts)

**Add subscription query** (lines 95-125):
```typescript
const companiesWithDetails = await Promise.all(
  (companies || []).map(async (company) => {
    // ... existing queries (admin_user, stats) ...

    // Subscription information query
    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        plan_id,
        status,
        billing_cycle,
        trial_end_date,
        current_period_end,
        created_at,
        canceled_at,
        subscription_plans (
          id,
          name,
          price_monthly,
          price_yearly
        )
      `)
      .eq('company_id', company.id)
      .in('status', ['trial', 'active', 'past_due'])  // Only active subscriptions
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Payment transactions query
    const { data: payments } = await supabase
      .from('payment_transactions')
      .select('total_amount, approved_at')
      .eq('company_id', company.id)
      .eq('status', 'success')
      .order('approved_at', { ascending: false });

    const totalPaid = payments?.reduce((sum, p) => sum + p.total_amount, 0) || 0;
    const paymentCount = payments?.length || 0;
    const lastPaymentDate = payments?.[0]?.approved_at || null;

    return {
      id: company.id,
      name: company.name,
      slug: company.short_id,
      is_active: company.is_active,
      created_at: company.created_at,
      admin_user: { ... },
      stats: { ... },
      subscription: subscription ? {
        plan_id: subscription.plan_id,
        plan_name: subscription.subscription_plans.name,
        plan_display_name: subscription.subscription_plans.name, // or localized version
        monthly_price: subscription.subscription_plans.price_monthly,
        yearly_price: subscription.subscription_plans.price_yearly,
        billing_cycle: subscription.billing_cycle,
        status: subscription.status,
        trial_end_date: subscription.trial_end_date,
        current_period_end: subscription.current_period_end,
        subscribed_at: subscription.created_at,
        canceled_at: subscription.canceled_at,
        payment_stats: {
          total_paid: totalPaid,
          payment_count: paymentCount,
          last_payment_date: lastPaymentDate
        }
      } : null  // No subscription
    };
  })
);
```

### Frontend Implementation

#### Option 1: Comprehensive Display (Recommended)

**Table Header** (add after line 214):
```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  구독 플랜
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  구독 상태
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  월 결제금액
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  다음 결제일
</th>
```

**Table Body** (add after line 254):
```tsx
{/* Subscription Plan */}
<td className="px-6 py-4">
  {company.subscription ? (
    <div>
      <div className="font-medium text-gray-900">
        {company.subscription.plan_name}
      </div>
      <div className="text-xs text-gray-500">
        {company.subscription.billing_cycle === 'monthly' ? '월간' : '연간'}
      </div>
    </div>
  ) : (
    <span className="text-sm text-gray-400">미가입</span>
  )}
</td>

{/* Subscription Status */}
<td className="px-6 py-4">
  {company.subscription ? (
    <Badge variant={
      company.subscription.status === 'active' ? 'default' :
      company.subscription.status === 'trial' ? 'secondary' :
      company.subscription.status === 'past_due' ? 'destructive' :
      'outline'
    }>
      {company.subscription.status === 'active' ? '활성' :
       company.subscription.status === 'trial' ? '체험중' :
       company.subscription.status === 'past_due' ? '결제지연' :
       company.subscription.status === 'canceled' ? '취소됨' :
       company.subscription.status}
    </Badge>
  ) : (
    <span className="text-sm text-gray-400">-</span>
  )}
</td>

{/* Monthly Price */}
<td className="px-6 py-4 text-sm text-gray-900">
  {company.subscription ? (
    `${company.subscription.monthly_price.toLocaleString()}원/월`
  ) : (
    <span className="text-gray-400">-</span>
  )}
</td>

{/* Next Payment Date */}
<td className="px-6 py-4 text-sm text-gray-500">
  {company.subscription?.current_period_end ? (
    format(new Date(company.subscription.current_period_end), 'yyyy-MM-dd', { locale: ko })
  ) : (
    <span className="text-gray-400">없음</span>
  )}
</td>
```

#### Option 2: Compact with Payment History

**Add columns**:
```tsx
{/* Subscription Info - Compact */}
<td className="px-6 py-4">
  {company.subscription ? (
    <div className="group relative">
      <div>
        <div className="font-medium text-gray-900">
          {company.subscription.plan_name}
        </div>
        <div className="text-xs text-gray-500">
          {company.subscription.monthly_price.toLocaleString()}원/월
          <Badge className="ml-2" variant={
            company.subscription.status === 'active' ? 'default' : 'secondary'
          }>
            {company.subscription.status}
          </Badge>
        </div>
      </div>

      {/* Tooltip with details */}
      <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="text-xs space-y-1">
          <div><span className="font-medium">결제 주기:</span> {company.subscription.billing_cycle}</div>
          <div><span className="font-medium">가입일:</span> {format(new Date(company.subscription.subscribed_at), 'yyyy-MM-dd')}</div>
          {company.subscription.trial_end_date && (
            <div><span className="font-medium">체험 종료:</span> {format(new Date(company.subscription.trial_end_date), 'yyyy-MM-dd')}</div>
          )}
          <div className="pt-2 border-t">
            <div><span className="font-medium">총 결제:</span> {company.subscription.payment_stats.total_paid.toLocaleString()}원</div>
            <div><span className="font-medium">결제 횟수:</span> {company.subscription.payment_stats.payment_count}회</div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <span className="text-sm text-gray-400">미가입</span>
  )}
</td>

{/* Payment History */}
<td className="px-6 py-4">
  {company.subscription && company.subscription.payment_stats.payment_count > 0 ? (
    <div>
      <div className="text-sm font-medium text-gray-900">
        {company.subscription.payment_stats.total_paid.toLocaleString()}원
      </div>
      <div className="text-xs text-gray-500">
        {company.subscription.payment_stats.payment_count}회 결제
      </div>
    </div>
  ) : (
    <span className="text-sm text-gray-400">없음</span>
  )}
</td>
```

### Statistics Summary Enhancement

**Add subscription stats cards** ([src/app/admin/companies/page.tsx:172-186](src/app/admin/companies/page.tsx#L172-L186)):

```tsx
<div className="grid grid-cols-4 gap-4">
  {/* Existing: 총 회사 수 */}
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

  {/* NEW: 활성 구독 */}
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">활성 구독</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {data.companies.filter(c =>
            c.subscription?.status === 'active' || c.subscription?.status === 'trial'
          ).length}
        </p>
      </div>
      <CreditCard className="h-10 w-10 text-green-500" />
    </div>
  </div>

  {/* NEW: MRR (Monthly Recurring Revenue) */}
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">MRR (월간 반복 매출)</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {data.companies
            .filter(c => c.subscription?.status === 'active')
            .reduce((sum, c) => {
              if (!c.subscription) return sum;
              const monthlyRevenue = c.subscription.billing_cycle === 'monthly'
                ? c.subscription.monthly_price
                : Math.round(c.subscription.yearly_price / 12);
              return sum + monthlyRevenue;
            }, 0)
            .toLocaleString()}원
        </p>
      </div>
      <TrendingUp className="h-10 w-10 text-purple-500" />
    </div>
  </div>

  {/* NEW: 총 결제금액 (Lifetime Value) */}
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">총 결제금액</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {data.companies
            .reduce((sum, c) => sum + (c.subscription?.payment_stats.total_paid || 0), 0)
            .toLocaleString()}원
        </p>
      </div>
      <DollarSign className="h-10 w-10 text-orange-500" />
    </div>
  </div>
</div>
```

**Add icons import** (line 6):
```tsx
import {
  Search, ChevronLeft, ChevronRight, Building2, Users, FileText,
  CreditCard, TrendingUp, DollarSign  // NEW
} from 'lucide-react'
```

## Performance Optimization

### Current Approach
- 2 queries per company (subscription + payments)
- Acceptable for <100 companies

### Optimized for Scale
```typescript
// Get all subscriptions in one query
const { data: allSubscriptions } = await supabase
  .from('company_subscriptions')
  .select(`
    company_id,
    plan_id,
    status,
    billing_cycle,
    current_period_end,
    created_at,
    subscription_plans (name, price_monthly, price_yearly)
  `)
  .in('status', ['trial', 'active', 'past_due']);

// Get all payment stats in one query
const { data: allPayments } = await supabase
  .from('payment_transactions')
  .select('company_id, total_amount, approved_at')
  .eq('status', 'success');

// Group by company in JavaScript
const subscriptionsByCompany = {};
const paymentsByCompany = {};

allSubscriptions?.forEach(sub => {
  subscriptionsByCompany[sub.company_id] = sub;
});

allPayments?.forEach(payment => {
  if (!paymentsByCompany[payment.company_id]) {
    paymentsByCompany[payment.company_id] = {
      total: 0,
      count: 0,
      last_date: null
    };
  }
  paymentsByCompany[payment.company_id].total += payment.total_amount;
  paymentsByCompany[payment.company_id].count += 1;
  if (!paymentsByCompany[payment.company_id].last_date) {
    paymentsByCompany[payment.company_id].last_date = payment.approved_at;
  }
});

// Merge with company data
const companiesWithDetails = companies.map(company => {
  const subscription = subscriptionsByCompany[company.id];
  const payments = paymentsByCompany[company.id] || { total: 0, count: 0, last_date: null };

  return {
    ...company,
    subscription: subscription ? {
      ...formatSubscription(subscription),
      payment_stats: {
        total_paid: payments.total,
        payment_count: payments.count,
        last_payment_date: payments.last_date
      }
    } : null
  };
});
```

## Test Data Creation

Since no subscriptions exist, create test data:

**File**: `/Users/mh.c/medisync/scripts/create-test-subscriptions.mjs`

```javascript
// Create test subscription for 퍼널리
const { data: funnely } = await supabase
  .from('companies')
  .select('id')
  .eq('name', '퍼널리')
  .single();

const { data: proPlan } = await supabase
  .from('subscription_plans')
  .select('id')
  .eq('name', 'Pro')
  .single();

if (funnely && proPlan) {
  await supabase
    .from('company_subscriptions')
    .insert({
      company_id: funnely.id,
      plan_id: proPlan.id,
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      created_at: new Date('2024-12-01')
    });

  // Create payment transaction
  await supabase
    .from('payment_transactions')
    .insert({
      company_id: funnely.id,
      order_id: `ORDER_${Date.now()}`,
      amount: 49000,
      vat: 4900,
      total_amount: 53900,
      payment_method: 'card',
      status: 'success',
      requested_at: new Date(),
      approved_at: new Date()
    });
}
```

## Implementation Steps

### Phase 1: Basic Subscription Display (MVP)

1. ✅ **Verify Database Schema**
   - [x] `subscription_plans` exists
   - [x] `company_subscriptions` exists
   - [x] `payment_transactions` exists

2. ✅ **Update Type Definition** ([src/types/admin.ts](src/types/admin.ts))
   - Add `subscription` object to `CompanyListItem` interface

3. ✅ **Update API Query** ([src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts))
   - Query `company_subscriptions` with plan details
   - Query `payment_transactions` for payment stats
   - Include in response

4. ✅ **Update Frontend Table** ([src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx))
   - Add subscription columns
   - Display plan, status, price, next payment date

5. ✅ **Add Statistics Cards**
   - Active subscriptions count
   - MRR (Monthly Recurring Revenue)
   - Total revenue

6. ✅ **Create Test Data** (Optional)
   - Add test subscription for 퍼널리
   - Add test payment transactions

### Phase 2: Enhanced Features (Optional)

7. ⏳ **Subscription Details Modal**
   - Click on subscription → Show full subscription history
   - Payment history with receipts
   - Plan change history

8. ⏳ **Filters and Sorting**
   - Filter by subscription status (trial/active/canceled)
   - Filter by plan (Free/Pro/Enterprise)
   - Sort by MRR, subscription date

9. ⏳ **Subscription Analytics**
   - MRR growth chart
   - Churn rate calculation
   - Subscription cohort analysis

## Testing Checklist

### After Implementation (with test data):

**Data Display**:
- [ ] 퍼널리: Shows "Pro" plan, "활성" status
- [ ] 퍼널리: Shows 49,000원/월 price
- [ ] 퍼널리: Shows next payment date
- [ ] Other companies: Show "미가입" or empty state

**Statistics Cards**:
- [ ] Active subscriptions count is correct
- [ ] MRR calculation is accurate
- [ ] Total revenue shows sum of successful payments

**Edge Cases**:
- [ ] No subscription: Shows "미가입"
- [ ] Trial subscription: Shows "체험중" badge
- [ ] Canceled subscription: Shows "취소됨" badge
- [ ] Past due: Shows "결제지연" badge with warning color

**Performance**:
- [ ] Page loads within 2 seconds
- [ ] No N+1 query issues

## Related Files

**Frontend**:
- [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx) - Companies list page
- [src/types/admin.ts](src/types/admin.ts) - Type definitions

**Backend**:
- [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts) - API endpoint

**Database**:
- [supabase/migrations/20250131010000_create_subscription_system.sql](supabase/migrations/20250131010000_create_subscription_system.sql) - Subscription tables

**Diagnostics**:
- [scripts/check-subscription-simple.mjs](scripts/check-subscription-simple.mjs) - Subscription checker

## Current State vs Target State

### Current State:
```
Companies table:
- 퍼널리: No subscription
- 홍란의 병원: No subscription
- 최문호의 병원: No subscription

Plans available:
- Free: 0원/월
- Pro: 49,000원/월
- Enterprise: 199,000원/월
```

### Target State (after implementation):
```
Admin Companies Page displays:
- Plan name: Free/Pro/Enterprise
- Status: trial/active/past_due/canceled
- Monthly price: 49,000원/월
- Next payment: 2025-01-15
- Payment history: 총 53,900원, 1회 결제

Statistics:
- Active subscriptions: 1
- MRR: 49,000원
- Total revenue: 53,900원
```

## Design Decision: Subscription-Only (SaaS Model)

**Rationale**:
1. ✅ Clear business model (SaaS subscription)
2. ✅ Matches user requirement ("퍼널리 시스템 사용을 위한 결제")
3. ✅ Database schema exists and is well-designed
4. ✅ Separates platform subscription from lead payments
5. ❌ No data yet, but structure is ready

**Recommendation**:
- Implement subscription display now
- Create test data to verify UI
- Production data will populate as companies subscribe
