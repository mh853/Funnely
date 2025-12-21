# 구독 플랜 구조 업데이트 가이드

## 변경 사항

### 이전 구조
- 단일 `plan_type`: individual
- 플랜명: Free, Starter, Pro, Enterprise

### 새로운 구조
**개인 (Personal) 플랜:**
- Personal Free: ₩0/월
- Personal Basic: ₩15,900/월
- Personal Pro: ₩39,900/월

**기업 (Business) 플랜:**
- Business Free: ₩0/월
- Business Basic: ₩49,900/월
- Business Pro: ₩149,900/월

## 실행 방법

### 방법 1: Supabase SQL Editor (권장)

1. **SQL Editor 열기**
   - URL: https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql

2. **SQL 파일 복사**
   - 파일: `supabase/migrations/20251221000000_update_subscription_plans_structure.sql`
   - 전체 내용 복사

3. **SQL 실행**
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭
   - 성공 메시지 확인: "Subscription plans structure updated successfully!"

### 방법 2: 스크립트 실행 (선택사항)

```bash
node scripts/update-subscription-plans.js
```

## 변경 내용

### 1. 테이블 스키마 변경
```sql
ALTER TABLE subscription_plans
ADD COLUMN user_type TEXT,  -- 'personal' 또는 'business'
ADD COLUMN tier TEXT;        -- 'free', 'basic', 'pro'
```

### 2. 기존 플랜 비활성화
모든 기존 플랜을 `is_active = false`로 설정

### 3. 새로운 플랜 데이터 추가
6개의 새로운 플랜 생성 (개인 3개 + 기업 3개)

### 4. 제약 조건 및 인덱스
- `user_type` 체크: 'personal' 또는 'business'
- `tier` 체크: 'free', 'basic', 'pro'
- 복합 인덱스: (user_type, tier)

## Revenue API 변경

`/api/admin/revenue/metrics` 엔드포인트가 새로운 플랜 구조를 사용합니다:

### 플랜별 수익 분포
- "개인 Free"
- "개인 Basic"
- "개인 Pro"
- "기업 Free"
- "기업 Basic"
- "기업 Pro"

### 코드 변경
```typescript
// 플랜명을 "개인 Free", "기업 Pro" 등으로 조합
const userTypeLabel = plan.user_type === 'personal' ? '개인' : '기업'
const tierLabel = plan.tier === 'free' ? 'Free' : plan.tier === 'basic' ? 'Basic' : 'Pro'
const planDisplayName = `${userTypeLabel} ${tierLabel}`
```

## 주의 사항

- **기존 구독 유지**: 기존 활성 구독(`company_subscriptions`)은 영향받지 않음
- **새로운 구독**: 새로 생성되는 구독부터 새로운 플랜 사용
- **Revenue 대시보드**: 플랜별 수익 분포가 새로운 형식으로 표시됨

## 확인 방법

실행 후 다음 쿼리로 확인:

```sql
SELECT user_type, tier, name, price_monthly, is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY user_type, tier;
```

기대 결과: 6개의 활성 플랜 (개인 3개 + 기업 3개)
