# 구독 플랜 쿼리 수정 설계

**날짜**: 2025-12-26
**이슈**: Supabase JOIN 쿼리가 Server Component에서 실패
**에러**: PGRST116 - Cannot coerce the result to a single JSON object (0 rows)
**상태**: 🔧 해결 방안 설계 완료

---

## 🎯 문제 정의

### 증상
Server Component ([layout.tsx](src/app/dashboard/layout.tsx))에서 Supabase JOIN 쿼리 실패:

```typescript
const { data: subscription, error } = await supabase
  .from('company_subscriptions')
  .select(`
    subscription_plans (
      features
    )
  `)
  .eq('company_id', userProfile.company_id)
  .in('status', ['active', 'trial', 'past_due'])
  .single()

// Error: PGRST116 - The result contains 0 rows
```

### 검증 결과

**Service Role Key로 직접 실행**: ✅ 성공
```javascript
// Node.js 스크립트에서 동일한 쿼리 실행
// → 데이터 정상 반환
```

**Next.js Server Component에서 실행**: ❌ 실패
```
Error: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

---

## 🔍 근본 원인 분석

### 가설 1: RLS (Row Level Security) 정책 문제 🎯

**분석**:
- Next.js의 `createClient()`는 **authenticated user context**로 쿼리 실행
- Service Role Key는 **모든 RLS 우회**
- `company_subscriptions` 테이블에 RLS 정책이 있다면 JOIN 결과가 필터링될 수 있음

**검증 방법**:
```sql
-- company_subscriptions 테이블의 RLS 정책 확인
SELECT * FROM pg_policies
WHERE tablename = 'company_subscriptions';
```

### 가설 2: Foreign Key Relationship 미설정

**분석**:
- Supabase의 `table1(column1, column2)` 문법은 **foreign key가 설정되어 있어야 작동**
- `company_subscriptions.plan_id` → `subscription_plans.id` FK가 없으면 JOIN 실패

**검증 방법**:
```sql
-- Foreign key 확인
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'company_subscriptions';
```

### 가설 3: Supabase Client 초기화 이슈

**분석**:
- Server Component의 `createClient()` 구현에 문제가 있을 수 있음
- Auth context가 제대로 전달되지 않음

**검증 방법**:
```typescript
// createClient() 구현 확인
// @/lib/supabase/server 파일 검토
```

---

## ✅ 해결 방안

### Solution A: 2단계 쿼리로 변경 (권장) 🎯

**장점**:
- RLS 영향 최소화
- 명확한 에러 핸들링
- 디버깅 용이

**단점**:
- 2번의 데이터베이스 왕복
- 약간의 성능 저하 (미미함)

**구현**:
```typescript
// Step 1: company_subscriptions에서 plan_id 가져오기
const { data: subscription, error: subError } = await supabase
  .from('company_subscriptions')
  .select('plan_id')
  .eq('company_id', userProfile.company_id)
  .in('status', ['active', 'trial', 'past_due'])
  .single()

if (!subscription?.plan_id) {
  // 구독이 없거나 비활성 상태
  planFeatures = {}
} else {
  // Step 2: subscription_plans에서 features 가져오기
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('features')
    .eq('id', subscription.plan_id)
    .single()

  if (plan?.features) {
    planFeatures = plan.features
  }
}
```

### Solution B: RLS 정책 수정

**장점**:
- JOIN 쿼리 유지
- 코드 변경 최소화

**단점**:
- 보안 정책 변경 필요
- 모든 테이블에 적절한 RLS 설정 필요

**구현**:
```sql
-- company_subscriptions RLS 정책 확인 및 수정
-- 사용자가 속한 회사의 구독 정보만 볼 수 있도록

CREATE POLICY "Users can view own company subscriptions"
ON company_subscriptions
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- subscription_plans는 public read 허용 (플랜 정보는 공개)
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans
FOR SELECT
USING (true);
```

### Solution C: Service Role 사용 (비권장)

**장점**:
- 즉시 작동
- RLS 우회

**단점**:
- 보안 위험
- Best practice 위반

**구현**:
```typescript
// lib/supabase/server.ts에 별도 함수 추가
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// layout.tsx에서 사용
const supabase = createServiceClient() // ⚠️ 보안 주의
```

---

## 🎯 권장 해결책: Solution A (2단계 쿼리)

### 이유

1. **안전성**: RLS 정책을 우회하지 않음
2. **명확성**: 각 단계의 에러를 명확히 처리
3. **유연성**: 향후 캐싱이나 최적화 가능
4. **성능**: 2번의 쿼리도 충분히 빠름 (밀리초 단위)

### 구현 상세

**수정 대상**: [src/app/dashboard/layout.tsx:23-54](src/app/dashboard/layout.tsx#L23-L54)

**Before** (JOIN 쿼리):
```typescript
let planFeatures: { [key: string]: boolean } = {}
if (userProfile?.company_id) {
  const { data: subscription, error: subscriptionError } = await supabase
    .from('company_subscriptions')
    .select(`
      subscription_plans (
        features
      )
    `)
    .eq('company_id', userProfile.company_id)
    .in('status', ['active', 'trial', 'past_due'])
    .single()

  if (subscription?.subscription_plans) {
    planFeatures = (subscription.subscription_plans as any).features || {}
  }
}
```

**After** (2단계 쿼리):
```typescript
let planFeatures: { [key: string]: boolean } = {}

if (userProfile?.company_id) {
  // Step 1: Get active subscription
  const { data: subscription, error: subError } = await supabase
    .from('company_subscriptions')
    .select('plan_id')
    .eq('company_id', userProfile.company_id)
    .in('status', ['active', 'trial', 'past_due'])
    .single()

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [DEBUG] User:', user.email)
    console.log('🔍 [DEBUG] Company ID:', userProfile.company_id)
    console.log('🔍 [DEBUG] Subscription:', subscription)
    console.log('🔍 [DEBUG] Subscription Error:', subError)
  }

  // Step 2: Get plan features if subscription exists
  if (subscription?.plan_id) {
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('features')
      .eq('id', subscription.plan_id)
      .single()

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] Plan:', plan)
      console.log('🔍 [DEBUG] Plan Error:', planError)
    }

    if (plan?.features) {
      planFeatures = plan.features
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ [DEBUG] No active subscription found for company')
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [DEBUG] Final planFeatures:', JSON.stringify(planFeatures, null, 2))
  }
}
```

---

## 🧪 테스트 계획

### 테스트 케이스

1. **정상 구독 계정** (mh853@gmail.com):
   - 예상: `planFeatures = { analytics: true, reports: true, ... }`
   - 네비게이션: 모든 프리미엄 기능 활성화

2. **구독 없는 계정**:
   - 예상: `planFeatures = {}`
   - 네비게이션: 프리미엄 기능 비활성화 (잠금 아이콘)

3. **비활성 구독 계정** (cancelled, past_due 제외):
   - 예상: `planFeatures = {}`
   - 네비게이션: 프리미엄 기능 비활성화

### 검증 방법

1. **Server 로그 확인**:
   ```
   🔍 [DEBUG] Subscription: { plan_id: '...' }
   🔍 [DEBUG] Plan: { features: { ... } }
   🔍 [DEBUG] Final planFeatures: { ... }
   ```

2. **Client 로그 확인**:
   ```
   📱 [Sidebar] Received planFeatures: { analytics: true, ... }
   ```

3. **UI 확인**:
   - 트래픽 분석, DB 리포트 등 활성화 상태
   - 잠금 아이콘 없음

---

## 📊 성능 영향

### 쿼리 시간 비교

**JOIN 쿼리 (1회)**:
- 예상 시간: ~50ms
- 실제 결과: 에러 (0 rows)

**2단계 쿼리 (2회)**:
- 예상 시간: ~80ms (40ms × 2)
- 실제 영향: 무시할 수준 (30ms 증가)

### 최적화 가능성

**향후 개선안**:
1. **캐싱**: `subscription_plans` 테이블 데이터 캐싱 (플랜 정보는 자주 바뀌지 않음)
2. **병렬 쿼리**: 필요 시 다른 데이터와 병렬로 조회
3. **Materialized View**: `company_id` → `plan_features` 매핑 뷰 생성

---

## 🔒 보안 고려사항

### RLS 정책 검증 필요

1. **company_subscriptions**:
   ```sql
   -- 사용자가 속한 회사의 구독만 조회 가능
   SELECT company_id FROM users WHERE id = auth.uid()
   ```

2. **subscription_plans**:
   ```sql
   -- 모든 플랜 정보는 공개 (가격, 기능 목록)
   -- 민감 정보 없음
   ```

### 데이터 노출 위험 평가

- **Low**: `subscription_plans.features`는 공개 정보
- **Medium**: `company_subscriptions.plan_id`는 회사별 격리 필요
- **Mitigation**: RLS 정책으로 자동 필터링

---

## 📋 구현 체크리스트

### 코드 수정
- [ ] [layout.tsx](src/app/dashboard/layout.tsx) 2단계 쿼리로 변경
- [ ] 디버그 로그 유지 (개발 환경)
- [ ] 에러 핸들링 추가 (각 단계별)

### 테스트
- [ ] mh853@gmail.com 계정으로 로그인
- [ ] Server 로그에서 `plan_id` 확인
- [ ] Client 로그에서 `planFeatures` 확인
- [ ] 네비게이션 활성화 상태 확인

### 정리
- [ ] 디버그 로그 제거 또는 레벨 조정
- [ ] 문서 업데이트
- [ ] 커밋 및 배포

---

## 🎯 예상 결과

### Server 로그
```
🔍 [DEBUG] User: mh853@gmail.com
🔍 [DEBUG] Company ID: 971983c1-d197-4ee3-8cda-538551f2cfb2
🔍 [DEBUG] Subscription: {
  plan_id: '6f45ff8d-ee0c-4b75-907c-651ad51b9c2c'
}
🔍 [DEBUG] Plan: {
  features: {
    analytics: true,
    reports: true,
    db_schedule: true,
    reservation_schedule: true,
    ...
  }
}
🔍 [DEBUG] Final planFeatures: {
  analytics: true,
  reports: true,
  ...
}
```

### Client 로그
```
📱 [Sidebar] Received planFeatures: {
  analytics: true,
  reports: true,
  db_schedule: true,
  reservation_schedule: true,
  ...
}
📱 [Sidebar] Processed navigation: [
  { name: '트래픽 분석', disabled: false },
  { name: 'DB 리포트', disabled: false },
  ...
]
```

### UI 상태
- ✅ 트래픽 분석: **활성화** (잠금 아이콘 없음)
- ✅ DB 리포트: **활성화**
- ✅ DB 스케줄: **활성화**
- ✅ 예약 스케줄: **활성화**

---

**설계일**: 2025-12-26
**설계자**: Claude Code
**타입**: Bug Fix - Query Refactoring
**우선순위**: Critical
**예상 작업 시간**: 15분
**영향**: 모든 프리미엄 기능 접근성 복원
