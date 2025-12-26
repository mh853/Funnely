# 토스 페이먼츠 결제 연동 설계

## 📋 개요

### 선택 이유: 토스 페이먼츠가 적합한 이유
✅ **한국 시장 최적화**: 국내 모든 주요 결제 수단 지원
✅ **간편한 연동**: RESTful API + JavaScript SDK로 빠른 구현
✅ **정기 결제 지원**: 구독 서비스에 최적화된 빌링키 방식
✅ **합리적인 수수료**: 신용카드 3.3%, 간편결제 2.8%
✅ **자동 정산**: 영업일 기준 D+2 자동 정산
✅ **한글 문서**: 명확한 한글 개발 문서 및 고객 지원

### 지원 결제 수단
- 💳 **신용카드**: 모든 국내 카드사
- 📱 **간편결제**: 토스페이, 네이버페이, 카카오페이, 페이코
- 🏦 **계좌이체**: 실시간 계좌이체
- 🏪 **가상계좌**: 은행별 가상계좌 발급

---

## 🏗️ 시스템 아키텍처

### 결제 플로우 개요
```
[프론트엔드]                [백엔드]                [토스 페이먼츠]
    |                          |                          |
    | 1. 결제 요청              |                          |
    |------------------------->|                          |
    |                          | 2. 빌링키 발급 요청       |
    |                          |------------------------->|
    |                          |                          |
    | 3. 결제창 URL 반환        |<------------------------|
    |<-------------------------|                          |
    |                          |                          |
    | 4. 토스 결제창 리다이렉트  |                          |
    |-------------------------------------------------->|
    |                          |                          |
    | 5. 결제 진행 (카드 정보 입력)                       |
    |                          |                          |
    | 6. 성공 콜백 (successUrl) |                          |
    |<--------------------------------------------------|
    |                          |                          |
    | 7. 결제 승인 요청          |                          |
    |------------------------->|                          |
    |                          | 8. 결제 승인 API 호출     |
    |                          |------------------------->|
    |                          |                          |
    |                          | 9. 빌링키 + 결제 정보 반환 |
    |                          |<------------------------|
    |                          |                          |
    |                          | 10. DB 업데이트           |
    |                          | - company_subscriptions  |
    |                          | - billing_keys           |
    |                          |                          |
    | 11. 결제 완료 페이지       |                          |
    |<-------------------------|                          |
```

### 정기 결제 (자동 결제) 플로우
```
[크론잡/스케줄러]           [백엔드]                [토스 페이먼츠]
    |                          |                          |
    | 1. 매일 00:00 실행        |                          |
    |------------------------->|                          |
    |                          | 2. 갱신 대상 구독 조회     |
    |                          | (current_period_end < 내일)|
    |                          |                          |
    |                          | 3. 빌링키로 자동 결제 요청 |
    |                          |------------------------->|
    |                          |                          |
    |                          | 4. 결제 성공/실패 응답     |
    |                          |<------------------------|
    |                          |                          |
    |                          | 5. 성공 시:              |
    |                          | - current_period_end +30일|
    |                          | - status: active         |
    |                          |                          |
    |                          | 6. 실패 시:              |
    |                          | - status: past_due       |
    |                          | - 재시도 로직 (D+3, D+7) |
    |                          | - 이메일 알림             |
```

---

## 🗄️ 데이터베이스 스키마

### 신규 테이블: billing_keys

빌링키(자동결제 카드 정보)를 저장하는 테이블

```sql
-- 빌링키 테이블 생성
CREATE TABLE billing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 토스 페이먼츠 정보
  billing_key VARCHAR(255) NOT NULL UNIQUE, -- 토스에서 발급한 빌링키
  customer_key VARCHAR(255) NOT NULL, -- 회사별 고유 키 (company.id)

  -- 카드 정보 (마스킹된 정보만 저장)
  card_company VARCHAR(100), -- 카드사 (예: 현대카드, 신한카드)
  card_number VARCHAR(20), -- 마스킹된 카드번호 (예: 1234-****-****-5678)
  card_type VARCHAR(50), -- 신용/체크 구분

  -- 상태 관리
  is_active BOOLEAN DEFAULT true, -- 활성 상태 (false: 삭제됨)
  is_primary BOOLEAN DEFAULT true, -- 기본 결제 수단 여부

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete

  CONSTRAINT unique_active_billing_key
    UNIQUE (company_id, is_active)
    WHERE is_active = true AND deleted_at IS NULL
);

-- 인덱스
CREATE INDEX idx_billing_keys_company ON billing_keys(company_id);
CREATE INDEX idx_billing_keys_billing_key ON billing_keys(billing_key);
CREATE INDEX idx_billing_keys_active ON billing_keys(company_id, is_active)
  WHERE is_active = true;

-- RLS 정책
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;

-- 회사 소속 사용자만 조회 가능
CREATE POLICY "Users can view their company billing keys"
  ON billing_keys FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 관리자만 생성/수정 가능
CREATE POLICY "Admins can manage billing keys"
  ON billing_keys FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND simple_role = 'admin'
    )
  );
```

### 기존 테이블 확장: company_subscriptions

결제 관련 컬럼 추가

```sql
-- company_subscriptions 테이블에 컬럼 추가
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS billing_key_id UUID REFERENCES billing_keys(id),
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_amount INTEGER,
ADD COLUMN IF NOT EXISTS next_billing_date DATE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), -- card, transfer, virtual_account
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON company_subscriptions(next_billing_date)
  WHERE status IN ('active', 'trial') AND auto_renewal = true;
```

### 신규 테이블: payment_transactions

모든 결제 기록 추적 (감사 로그)

```sql
-- 결제 트랜잭션 테이블
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  subscription_id UUID REFERENCES company_subscriptions(id),

  -- 토스 페이먼츠 정보
  payment_key VARCHAR(255) UNIQUE, -- 토스 결제 고유 키
  order_id VARCHAR(255) NOT NULL UNIQUE, -- 우리 시스템 주문 번호

  -- 결제 정보
  amount INTEGER NOT NULL, -- 결제 금액 (원)
  method VARCHAR(50), -- card, transfer, virtual_account
  status VARCHAR(50) NOT NULL, -- DONE, CANCELED, PARTIAL_CANCELED, WAITING_FOR_DEPOSIT

  -- 카드 정보 (성공 시에만 저장)
  card_company VARCHAR(100),
  card_number VARCHAR(20), -- 마스킹된 번호

  -- 결제 타입
  payment_type VARCHAR(50) NOT NULL, -- INITIAL (최초), RECURRING (정기), UPGRADE, DOWNGRADE

  -- 메타데이터
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- 토스 페이먼츠 원본 응답 (JSON)
  toss_response JSONB,

  -- 실패 정보
  failure_code VARCHAR(100),
  failure_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_transactions_company ON payment_transactions(company_id);
CREATE INDEX idx_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_payment_key ON payment_transactions(payment_key);
CREATE INDEX idx_transactions_order_id ON payment_transactions(order_id);

-- RLS 정책
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company transactions"
  ON payment_transactions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 🔧 환경 변수 설정

### `.env.local` 추가
```bash
# 토스 페이먼츠 API 키 (https://developers.tosspayments.com/)
# 테스트 모드
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq
TOSS_SECRET_KEY=test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R

# 프로덕션 모드 (실제 결제 시 사용)
# NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_...
# TOSS_SECRET_KEY=live_sk_...

# 결제 URL (프론트엔드)
NEXT_PUBLIC_TOSS_SUCCESS_URL=http://localhost:3000/payment/success
NEXT_PUBLIC_TOSS_FAIL_URL=http://localhost:3000/payment/fail

# Customer Key 생성용 (회사 ID 해싱에 사용)
CUSTOMER_KEY_SECRET=your-secret-key-for-hashing
```

---

## 🎨 프론트엔드 구현

### 1. 토스 페이먼츠 SDK 설치

```bash
npm install @tosspayments/payment-sdk
```

### 2. 결제 플로우 컴포넌트

#### `/src/app/dashboard/subscription/checkout/page.tsx`
구독 플랜 선택 후 결제 페이지

```typescript
'use client'

import { useEffect, useState } from 'react'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Plan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('planId')
  const cycle = searchParams.get('cycle') || 'monthly' // monthly | yearly

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 플랜 정보 가져오기
    async function fetchPlan() {
      const supabase = createClient()
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      setPlan(data)
    }

    if (planId) {
      fetchPlan()
    }
  }, [planId])

  const handlePayment = async () => {
    if (!plan) return

    setLoading(true)
    setError(null)

    try {
      // 1. 서버에 빌링키 발급 요청
      const response = await fetch('/api/payments/toss/issue-billing-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle: cycle,
          amount: cycle === 'monthly' ? plan.price_monthly : plan.price_yearly,
        }),
      })

      const { customerKey, orderId } = await response.json()

      // 2. 토스 페이먼츠 SDK 로드
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      )

      // 3. 빌링키 발급 (카드 등록) 요청
      await tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/payment/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/payment/fail`,
      })
    } catch (err: any) {
      console.error('결제 요청 실패:', err)
      setError(err.message || '결제 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!plan) {
    return <div className="p-8">플랜 정보를 불러오는 중...</div>
  }

  const amount = cycle === 'monthly' ? plan.price_monthly : plan.price_yearly
  const period = cycle === 'monthly' ? '월' : '년'

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">결제하기</h1>

      {/* 주문 정보 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">주문 정보</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">플랜</span>
            <span className="font-medium">{plan.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">결제 주기</span>
            <span className="font-medium">{cycle === 'monthly' ? '월간' : '연간'}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-4 border-t">
            <span>총 결제 금액</span>
            <span className="text-blue-600">
              ₩{amount.toLocaleString()} / {period}
            </span>
          </div>
        </div>
      </div>

      {/* 결제 안내 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-2">💳 자동 결제 안내</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• 카드 정보는 안전하게 암호화되어 토스 페이먼츠에 저장됩니다.</li>
          <li>• 매{period} 자동으로 결제가 진행됩니다.</li>
          <li>• 언제든지 구독을 취소하거나 카드를 변경할 수 있습니다.</li>
          <li>• 결제 실패 시 이메일로 안내드립니다.</li>
        </ul>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '처리 중...' : `₩${amount.toLocaleString()} 결제하기`}
      </button>

      {/* 안전 결제 배지 */}
      <div className="text-center mt-6 text-sm text-gray-500">
        <p>🔒 토스 페이먼츠 안전 결제</p>
      </div>
    </div>
  )
}
```

#### `/src/app/payment/success/page.tsx`
결제 성공 콜백 페이지

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function confirmPayment() {
      const customerKey = searchParams.get('customerKey')
      const authKey = searchParams.get('authKey')
      const orderId = searchParams.get('orderId')

      if (!customerKey || !authKey || !orderId) {
        setStatus('error')
        setMessage('결제 정보가 올바르지 않습니다.')
        return
      }

      try {
        // 서버에 빌링키 승인 요청
        const response = await fetch('/api/payments/toss/confirm-billing-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerKey, authKey, orderId }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('결제가 완료되었습니다!')

          // 3초 후 대시보드로 이동
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        } else {
          throw new Error(data.error || '결제 승인에 실패했습니다.')
        }
      } catch (err: any) {
        console.error('결제 승인 실패:', err)
        setStatus('error')
        setMessage(err.message || '결제 처리 중 오류가 발생했습니다.')
      }
    }

    confirmPayment()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">결제 처리 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">결제 완료!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">곧 대시보드로 이동합니다...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">결제 실패</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              다시 시도하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

#### `/src/app/payment/fail/page.tsx`
결제 실패 페이지

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function PaymentFailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('code')
  const errorMsg = searchParams.get('message')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">결제 실패</h2>
        <p className="text-gray-600 mb-2">{errorMsg || '결제가 취소되었습니다.'}</p>
        {errorCode && (
          <p className="text-sm text-gray-500 mb-6">오류 코드: {errorCode}</p>
        )}
        <button
          onClick={() => router.push('/dashboard/subscription')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          다시 시도하기
        </button>
      </div>
    </div>
  )
}
```

---

## ⚙️ 백엔드 API 구현

### 1. 빌링키 발급 API

#### `/src/app/api/payments/toss/issue-billing-key/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { planId, billingCycle, amount } = await request.json()

    // 1. 사용자 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
    }

    // 2. 사용자 프로필 조회 (company_id 필요)
    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: '회사 정보를 찾을 수 없습니다.' }, { status: 400 })
    }

    // 3. customerKey 생성 (회사 ID 기반)
    const customerKey = generateCustomerKey(profile.company_id)

    // 4. orderId 생성 (고유한 주문 번호)
    const orderId = `order_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`

    // 5. 임시 트랜잭션 레코드 생성 (WAITING 상태)
    await supabase.from('payment_transactions').insert({
      company_id: profile.company_id,
      order_id: orderId,
      amount,
      method: 'card',
      status: 'WAITING_FOR_AUTH',
      payment_type: 'INITIAL',
    })

    // 6. 클라이언트에 customerKey와 orderId 반환
    return NextResponse.json({ customerKey, orderId })
  } catch (error: any) {
    console.error('[Issue Billing Key] 오류:', error)
    return NextResponse.json(
      { error: error.message || '빌링키 발급 요청 실패' },
      { status: 500 }
    )
  }
}

// Customer Key 생성 함수 (회사 ID를 안전하게 해싱)
function generateCustomerKey(companyId: string): string {
  const secret = process.env.CUSTOMER_KEY_SECRET || 'default-secret'
  const hash = crypto
    .createHmac('sha256', secret)
    .update(companyId)
    .digest('hex')
    .substring(0, 32)

  return `customer_${hash}`
}
```

### 2. 빌링키 승인 API

#### `/src/app/api/payments/toss/confirm-billing-key/route.ts`

```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { customerKey, authKey, orderId } = await request.json()

    // 1. 사용자 인증
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    // 2. 트랜잭션 조회
    const serviceSupabase = createServiceClient()
    const { data: transaction } = await serviceSupabase
      .from('payment_transactions')
      .select('*, company_id')
      .eq('order_id', orderId)
      .single()

    if (!transaction) {
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 3. 토스 페이먼츠 빌링키 발급 API 호출
    const tossResponse = await fetch(
      'https://api.tosspayments.com/v1/billing/authorizations/issue',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey,
          customerKey,
        }),
      }
    )

    const billingData = await tossResponse.json()

    if (!tossResponse.ok) {
      throw new Error(billingData.message || '빌링키 발급 실패')
    }

    // 4. 빌링키 DB 저장
    const { data: billingKey } = await serviceSupabase
      .from('billing_keys')
      .insert({
        company_id: transaction.company_id,
        billing_key: billingData.billingKey,
        customer_key: customerKey,
        card_company: billingData.card?.company,
        card_number: billingData.card?.number,
        card_type: billingData.card?.cardType,
        is_active: true,
        is_primary: true,
      })
      .select()
      .single()

    // 5. 첫 결제 진행 (빌링키로 즉시 결제)
    const paymentResponse = await fetch(
      `https://api.tosspayments.com/v1/billing/${billingData.billingKey}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerKey,
          amount: transaction.amount,
          orderId: orderId,
          orderName: '퍼널리 구독',
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || user.email?.split('@')[0],
        }),
      }
    )

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || '결제 실패')
    }

    // 6. 트랜잭션 업데이트 (성공)
    await serviceSupabase
      .from('payment_transactions')
      .update({
        payment_key: paymentData.paymentKey,
        status: 'DONE',
        approved_at: new Date().toISOString(),
        toss_response: paymentData,
      })
      .eq('order_id', orderId)

    // 7. 구독 생성 또는 업데이트
    const periodStart = new Date()
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1) // 1개월 추가

    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .upsert({
        company_id: transaction.company_id,
        plan_id: 'pro_plan_id', // 실제 플랜 ID로 변경
        status: 'active',
        billing_cycle: 'monthly',
        billing_key_id: billingKey.id,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString().split('T')[0],
        last_payment_at: new Date().toISOString(),
        last_payment_amount: transaction.amount,
        payment_method: 'card',
        auto_renewal: true,
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      subscription,
      payment: paymentData,
    })
  } catch (error: any) {
    console.error('[Confirm Billing Key] 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 3. 정기 결제 실행 API (크론잡용)

#### `/src/app/api/payments/toss/process-recurring/route.ts`

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 보안: 크론잡 인증 토큰
const CRON_SECRET = process.env.CRON_SECRET_KEY

export async function POST(request: NextRequest) {
  try {
    // 1. 크론잡 인증
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    // 2. 갱신 대상 구독 조회 (내일이 결제일인 구독)
    const { data: subscriptions, error } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        plan_id,
        billing_key_id,
        next_billing_date,
        last_payment_amount,
        billing_keys (
          billing_key,
          customer_key,
          card_company,
          card_number
        )
      `)
      .eq('status', 'active')
      .eq('auto_renewal', true)
      .lte('next_billing_date', today)
      .not('billing_key_id', 'is', null)

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: '갱신 대상 구독 없음', count: 0 })
    }

    console.log(`[정기결제] ${subscriptions.length}건 처리 시작`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    }

    // 3. 각 구독에 대해 자동 결제 시도
    for (const sub of subscriptions) {
      try {
        const billingKey = (sub.billing_keys as any).billing_key
        const customerKey = (sub.billing_keys as any).customer_key
        const orderId = `recurring_${sub.id}_${Date.now()}`

        // 4. 토스 페이먼츠 자동 결제 API 호출
        const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerKey,
            amount: sub.last_payment_amount,
            orderId,
            orderName: '퍼널리 정기결제',
          }),
        })

        const paymentData = await response.json()

        if (response.ok && paymentData.status === 'DONE') {
          // 5. 결제 성공: 구독 기간 연장
          const newPeriodEnd = new Date(sub.next_billing_date!)
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

          await supabase
            .from('company_subscriptions')
            .update({
              current_period_start: sub.next_billing_date,
              current_period_end: newPeriodEnd.toISOString(),
              next_billing_date: newPeriodEnd.toISOString().split('T')[0],
              last_payment_at: new Date().toISOString(),
              last_payment_amount: sub.last_payment_amount,
            })
            .eq('id', sub.id)

          // 6. 트랜잭션 기록
          await supabase.from('payment_transactions').insert({
            company_id: sub.company_id,
            subscription_id: sub.id,
            payment_key: paymentData.paymentKey,
            order_id: orderId,
            amount: sub.last_payment_amount,
            method: 'card',
            status: 'DONE',
            payment_type: 'RECURRING',
            approved_at: new Date().toISOString(),
            toss_response: paymentData,
          })

          results.success++
          console.log(`[정기결제] 성공: ${sub.id}`)
        } else {
          throw new Error(paymentData.message || '결제 실패')
        }
      } catch (err: any) {
        console.error(`[정기결제] 실패: ${sub.id}`, err.message)

        // 7. 결제 실패: past_due 상태로 변경
        await supabase
          .from('company_subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('id', sub.id)

        // 8. 실패 트랜잭션 기록
        await supabase.from('payment_transactions').insert({
          company_id: sub.company_id,
          subscription_id: sub.id,
          order_id: `recurring_${sub.id}_${Date.now()}`,
          amount: sub.last_payment_amount,
          method: 'card',
          status: 'FAILED',
          payment_type: 'RECURRING',
          failure_code: err.code || 'UNKNOWN',
          failure_message: err.message,
        })

        results.failed++
        results.errors.push({
          subscriptionId: sub.id,
          companyId: sub.company_id,
          error: err.message,
        })

        // TODO: 실패 이메일 발송
      }
    }

    console.log(`[정기결제] 완료: 성공 ${results.success}건, 실패 ${results.failed}건`)

    return NextResponse.json({
      message: '정기결제 처리 완료',
      total: subscriptions.length,
      ...results,
    })
  } catch (error: any) {
    console.error('[정기결제] 전체 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 4. 구독 취소 API

#### `/src/app/api/payments/subscription/cancel/route.ts`

```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { immediate } = await request.json() // immediate: true면 즉시 취소, false면 기간 종료 시 취소

    // 1. 사용자 인증
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    // 2. 사용자 프로필 및 구독 조회
    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: '회사 정보 없음' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient()
    const { data: subscription } = await serviceSupabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', profile.company_id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: '구독 정보 없음' }, { status: 404 })
    }

    // 3. 즉시 취소 vs 기간 종료 시 취소
    if (immediate) {
      // 즉시 취소: status를 cancelled로 변경
      await serviceSupabase
        .from('company_subscriptions')
        .update({
          status: 'cancelled',
          auto_renewal: false,
          cancel_at_period_end: false,
        })
        .eq('id', subscription.id)

      return NextResponse.json({
        success: true,
        message: '구독이 즉시 취소되었습니다.',
      })
    } else {
      // 기간 종료 시 취소: auto_renewal만 false로 설정
      await serviceSupabase
        .from('company_subscriptions')
        .update({
          auto_renewal: false,
          cancel_at_period_end: true,
        })
        .eq('id', subscription.id)

      return NextResponse.json({
        success: true,
        message: `구독이 ${subscription.current_period_end}에 종료됩니다.`,
        cancelDate: subscription.current_period_end,
      })
    }
  } catch (error: any) {
    console.error('[구독 취소] 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## 🤖 크론잡 설정 (Vercel Cron)

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/payments/toss/process-recurring",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**설명**:
- 매일 자정(00:00 KST)에 `/api/payments/toss/process-recurring` API 호출
- 갱신 대상 구독 자동 결제 처리
- Vercel Pro 플랜 이상에서 사용 가능

**대안 (Hobby 플랜)**:
- GitHub Actions + 외부 크론 서비스
- Supabase Edge Functions + pg_cron

---

## 🧪 테스트 시나리오

### 1. 테스트 카드 정보 (토스 페이먼츠 제공)

```
카드 번호: 4330-1234-0000-0000 (현대카드)
유효기간: 아무 날짜 (미래)
CVC: 123
비밀번호: 1234 (앞 2자리)
```

### 2. 테스트 플로우

#### 신규 가입 테스트
1. `/auth/signup` → 회원가입
2. `/dashboard/subscription/checkout?planId=pro&cycle=monthly`
3. 결제 진행 (테스트 카드 입력)
4. `/payment/success` 리다이렉트 확인
5. DB 확인:
   - `billing_keys` 테이블에 빌링키 생성
   - `company_subscriptions` 테이블에 구독 생성 (status: active)
   - `payment_transactions` 테이블에 결제 기록

#### 정기 결제 테스트
1. DB에서 `next_billing_date`를 오늘로 수정
2. `/api/payments/toss/process-recurring` API 수동 호출
3. 결제 성공 확인
4. 구독 기간 연장 확인 (current_period_end +30일)

#### 구독 취소 테스트
1. `/api/payments/subscription/cancel` POST (immediate: false)
2. `auto_renewal: false`, `cancel_at_period_end: true` 확인
3. 다음 결제일에 자동 갱신 안 됨 확인

---

## 📊 관리자 대시보드 기능

### 구독 관리 페이지 (`/dashboard/subscription`)

#### 현재 구독 정보 카드
```typescript
- 플랜 이름 (베이직 / 프로)
- 결제 금액 (₩19,000 / ₩49,000)
- 결제 주기 (월간 / 연간)
- 다음 결제일
- 등록된 카드 정보 (마스킹)
- 자동 갱신 상태 (ON/OFF)
```

#### 액션 버튼
```typescript
- 플랜 변경 (업그레이드/다운그레이드)
- 카드 변경
- 구독 취소
- 영수증 다운로드
```

#### 결제 내역 테이블
```typescript
날짜 | 플랜 | 금액 | 상태 | 영수증
2025-01-15 | 프로 플랜 | ₩49,000 | 완료 | [다운로드]
2024-12-15 | 프로 플랜 | ₩49,000 | 완료 | [다운로드]
```

---

## 🔒 보안 고려사항

### 1. 카드 정보 보안
- ❌ **절대** 카드 정보를 직접 저장하지 않음
- ✅ 빌링키만 저장 (토스 페이먼츠가 카드 정보 암호화 보관)
- ✅ 마스킹된 카드 번호만 DB에 저장 (표시용)

### 2. API 인증
- 모든 결제 API는 `auth.getUser()` 인증 필수
- 크론잡 API는 `CRON_SECRET_KEY` Bearer 토큰 인증

### 3. RLS (Row Level Security)
- `billing_keys`, `payment_transactions` 테이블에 RLS 적용
- 회사별 데이터 격리 보장

### 4. HTTPS 필수
- 프로덕션 환경에서 HTTPS 강제
- 토스 페이먼츠 Webhook도 HTTPS 필요

---

## 💰 비용 계산

### 토스 페이먼츠 수수료
- **신용카드**: 3.3% (VAT 별도)
- **간편결제**: 2.8% (VAT 별도)
- **월 결제액**: 없음 (트랜잭션당 과금)

### 예시 (프로 플랜 ₩49,000)
```
결제 금액: ₩49,000
수수료 (3.3%): ₩1,617
실 수령액: ₩47,383
```

---

## 📝 체크리스트

### 개발 단계
- [ ] 토스 페이먼츠 계정 생성 및 테스트 키 발급
- [ ] 환경 변수 설정 (.env.local)
- [ ] DB 마이그레이션 (billing_keys, payment_transactions 테이블)
- [ ] SDK 설치 및 프론트엔드 구현
- [ ] 백엔드 API 구현 (빌링키 발급, 승인, 정기결제)
- [ ] 크론잡 설정 (Vercel Cron)
- [ ] 테스트 카드로 결제 플로우 테스트
- [ ] 구독 취소 기능 구현

### 프로덕션 배포 전
- [ ] 실제 API 키로 전환 (test → live)
- [ ] Webhook 엔드포인트 등록
- [ ] 개인정보처리방침, 이용약관 페이지 준비
- [ ] 에러 핸들링 및 로깅 강화
- [ ] 결제 실패 이메일 알림 설정
- [ ] 환불 정책 및 프로세스 수립

---

**문서 작성**: Claude (Sonnet 4.5)
**문서 버전**: 1.0
**최종 수정**: 2025년 기준
