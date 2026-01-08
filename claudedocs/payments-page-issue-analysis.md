# Dashboard Payments 페이지 이슈 분석

## 🔍 문제 상황

dashboard/payments 페이지에서:
1. ✅ **구독 플랜 정보는 표시됨** (조건부)
2. ❌ **결제 내역은 항상 "결제 내역이 없습니다" 표시**

---

## 📊 현재 데이터 상태

### 데이터베이스 실제 데이터

#### 1. `company_subscriptions` 테이블
```javascript
{
  "id": "30734d9f-3100-40fd-be29-39eda789bc43",
  "company_id": "971983c1-d197-4ee3-8cda-538551f2cfb2",
  "plan_id": "6f45ff8d-ee0c-4b75-907c-651ad51b9c2c",
  "status": "active",              // ✅ 활성 구독
  "billing_cycle": "monthly",
  "current_period_start": "2025-12-23T10:18:29.609+00:00",
  "current_period_end": "2026-01-22T10:18:29.609+00:00",
  "subscription_plans": {
    "name": "성장하는 기업을 위한 플랜",
    "price_monthly": 490000,       // ✅ 월 49만원
    "price_yearly": 5292000         // ✅ 연 529만원
  }
}
```

**상태**: ✅ 1개 활성 구독 존재

#### 2. `payment_transactions` 테이블
```
전체 결제 내역 수: 0
```

**상태**: ❌ 결제 내역 없음

---

## 🐛 버그 분석

### 문제 1: 스키마 불일치

**PaymentsClient.tsx 기대하는 필드**:
```typescript
interface Subscription {
  subscription_plans: {
    display_name: string      // ❌ 존재하지 않음
    monthly_price: number      // ❌ 존재하지 않음
    yearly_price: number       // ❌ 존재하지 않음
  }
}
```

**실제 데이터베이스 필드**:
```typescript
subscription_plans: {
  name: string                 // ✅ 실제로 존재
  description: string          // ✅ 실제로 존재
  price_monthly: number        // ✅ 실제로 존재
  price_yearly: number         // ✅ 실제로 존재
}
```

### 결과
```tsx
// PaymentsClient.tsx:116
<h2 className="text-2xl font-bold mt-1">
  {subscription.subscription_plans.display_name}
  {/* ❌ undefined - 필드명 불일치! */}
</h2>

// PaymentsClient.tsx:130
{subscription.subscription_plans.monthly_price?.toLocaleString() || '0'}
{/* ❌ undefined - 필드명 불일치! */}
```

---

## 🎯 문제 원인

### 1. **구독 플랜 표시 문제**

**예상 동작**:
```
현재 플랜: 성장하는 기업을 위한 플랜
월간 결제 • 구독 활성
490,000원 / 월
```

**실제 동작**:
```
현재 플랜: undefined         ← display_name이 없음
월간 결제 • 구독 활성
0원 / 월                     ← monthly_price가 없음
```

### 2. **결제 내역 문제**

**데이터베이스 상태**: 결제 내역이 실제로 0건
- 구독은 활성화되어 있지만
- `payment_transactions` 테이블에 실제 결제 기록이 없음

**가능한 시나리오**:
1. **무료 체험 기간**: 실제 결제 없이 구독 활성화
2. **수동 활성화**: 관리자가 직접 구독 상태를 active로 설정
3. **결제 시스템 미연동**: 구독은 있지만 결제 프로세스가 완료되지 않음

---

## 🔧 해결 방법

### Option 1: 컴포넌트 수정 (필드명 일치)

**파일**: `src/components/payments/PaymentsClient.tsx`

**수정 내용**:
```typescript
// Before
subscription.subscription_plans.display_name
subscription.subscription_plans.monthly_price
subscription.subscription_plans.yearly_price

// After
subscription.subscription_plans.name
subscription.subscription_plans.price_monthly
subscription.subscription_plans.price_yearly
```

### Option 2: 데이터베이스 컬럼 추가

**마이그레이션 생성**:
```sql
ALTER TABLE subscription_plans
ADD COLUMN display_name VARCHAR(255),
ADD COLUMN monthly_price INTEGER,
ADD COLUMN yearly_price INTEGER;

-- 기존 데이터 마이그레이션
UPDATE subscription_plans
SET
  display_name = name,
  monthly_price = price_monthly,
  yearly_price = price_yearly;
```

### Option 3: TypeScript 인터페이스 수정

**타입 정의 업데이트**:
```typescript
interface Subscription {
  subscription_plans: {
    name: string              // display_name → name
    price_monthly: number     // monthly_price → price_monthly
    price_yearly: number      // yearly_price → price_yearly
  }
}
```

---

## ✅ 권장 해결책

**Option 1 (컴포넌트 수정)**을 권장합니다.

**이유**:
1. 데이터베이스 스키마를 변경하지 않음
2. 기존 데이터 마이그레이션 불필요
3. 다른 컴포넌트에 영향 없음
4. 빠르고 안전한 수정

---

## 📝 수정 계획

### Step 1: PaymentsClient.tsx 수정

**변경 사항**:
```typescript
// Line 116: 플랜 이름 표시
- {subscription.subscription_plans.display_name}
+ {subscription.subscription_plans.name}

// Line 130: 월간 가격
- subscription.subscription_plans.monthly_price?.toLocaleString() || '0'
+ subscription.subscription_plans.price_monthly?.toLocaleString() || '0'

// Line 131: 연간 가격
- subscription.subscription_plans.yearly_price?.toLocaleString() || '0'
+ subscription.subscription_plans.price_yearly?.toLocaleString() || '0'
```

### Step 2: TypeScript 인터페이스 업데이트

```typescript
interface Subscription {
  id: string
  status: string
  billing_cycle: string
  trial_end_date: string | null
  current_period_end: string | null
  subscription_plans: {
    name: string                    // ✅ 수정
    description: string             // ✅ 추가
    price_monthly: number           // ✅ 수정
    price_yearly: number            // ✅ 수정
  }
}
```

### Step 3: 결제 내역 표시 확인

**현재 상태**: ✅ 정상 작동
- 결제 내역이 실제로 0건이므로 "결제 내역이 없습니다" 메시지가 맞음
- 향후 결제가 발생하면 자동으로 표시됨

---

## 🧪 테스트 시나리오

### 테스트 1: 구독 플랜 표시
```
Given: 활성 구독이 존재함
When: /dashboard/payments 페이지 접속
Then:
  - 플랜 이름: "성장하는 기업을 위한 플랜" 표시
  - 가격: "490,000원 / 월" 표시
  - 상태: "구독 활성" 표시
```

### 테스트 2: 결제 내역 없을 때
```
Given: payment_transactions 테이블이 비어있음
When: /dashboard/payments 페이지 접속
Then: "결제 내역이 없습니다" 메시지 표시
```

### 테스트 3: 결제 내역 있을 때
```
Given: payment_transactions에 데이터 존재
When: /dashboard/payments 페이지 접속
Then: 결제 내역 테이블에 거래 정보 표시
```

---

## 📊 현재 vs 수정 후 비교

### 현재 (버그 상태)

```
┌─────────────────────────────────────┐
│ 결제 관리                            │
├─────────────────────────────────────┤
│ 현재 플랜                            │
│ undefined                           │ ← ❌ 이름 표시 안됨
│ 월간 결제 • 구독 활성                │
│ 0원 / 월                            │ ← ❌ 가격 표시 안됨
├─────────────────────────────────────┤
│ 결제 내역                            │
│ 결제 내역이 없습니다                 │ ← ✅ 정상 (실제로 없음)
└─────────────────────────────────────┘
```

### 수정 후 (정상 상태)

```
┌─────────────────────────────────────┐
│ 결제 관리                            │
├─────────────────────────────────────┤
│ 현재 플랜                            │
│ 성장하는 기업을 위한 플랜            │ ← ✅ 이름 표시
│ 월간 결제 • 구독 활성                │
│ 490,000원 / 월                      │ ← ✅ 가격 표시
├─────────────────────────────────────┤
│ 결제 내역                            │
│ 결제 내역이 없습니다                 │ ← ✅ 정상 (실제로 없음)
└─────────────────────────────────────┘
```

---

## 🎯 결론

### 질문: "출력이 하나도 안되는게 맞는거야?"

**답변**: **아니오, 버그입니다!**

1. **구독 플랜**: 데이터는 있지만 필드명 불일치로 표시 안됨
   - `display_name` → `name`
   - `monthly_price` → `price_monthly`
   - `yearly_price` → `price_yearly`

2. **결제 내역**: 실제로 데이터가 없어서 "결제 내역이 없습니다"는 정상
   - 향후 결제 발생 시 자동으로 표시됨

### 수정 필요 사항

✅ PaymentsClient.tsx의 필드명 수정 (3곳)
✅ TypeScript 인터페이스 업데이트
❌ 결제 내역은 수정 불필요 (실제로 없음)

---

**작성일**: 2026-01-08
**상태**: 버그 분석 완료, 수정 대기
