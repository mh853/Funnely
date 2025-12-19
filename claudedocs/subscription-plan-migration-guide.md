# 구독 플랜 마이그레이션 실행 가이드

## 🎯 마이그레이션 목표

기존 3-Tier 플랜 → 개인/기업 구분 6개 플랜으로 확장

## 📋 체크리스트

### 1단계: 마이그레이션 전 준비
- [ ] 현재 활성 구독 수 확인
- [ ] 데이터베이스 백업 생성
- [ ] Supabase Dashboard 접속 확인

### 2단계: 마이그레이션 실행
- [ ] SQL 파일 실행
- [ ] 로그 확인
- [ ] 신규 플랜 생성 확인

### 3단계: 프론트엔드 배포
- [ ] 로컬 테스트
- [ ] 프로덕션 배포
- [ ] 기능 테스트

## 🚀 마이그레이션 실행

### Step 1: 현재 상태 확인

```sql
-- 활성 구독 수 확인
SELECT
  sp.name as plan_name,
  COUNT(*) as subscription_count
FROM company_subscriptions cs
JOIN subscription_plans sp ON cs.plan_id = sp.id
WHERE cs.status IN ('active', 'trial')
GROUP BY sp.name;

-- 결과 예시:
-- plan_name | subscription_count
-- Free      | 10
-- Pro       | 5
-- Enterprise| 2
```

### Step 2: 데이터베이스 백업 (선택사항)

Supabase Dashboard → Project → Settings → Database → Create Backup

### Step 3: 마이그레이션 SQL 실행

**Supabase Dashboard에서 실행**:

1. Supabase Dashboard → Project → SQL Editor
2. New query 생성
3. `/Users/mh.c/medisync/supabase/migrations/20251219000000_add_plan_type_to_subscriptions.sql` 파일 내용 복사
4. 실행 (Run)
5. 로그 확인:
   ```
   ✅ Subscription plans migration completed:
      - Individual plans: 3
      - Business plans: 3
      - Total active plans: 6
   ```

**로컬 Supabase에서 실행** (선택사항):

```bash
# Supabase CLI 사용
npx supabase db push

# 또는 psql 직접 실행
psql -h [SUPABASE_HOST] -U postgres -d postgres -f supabase/migrations/20251219000000_add_plan_type_to_subscriptions.sql
```

### Step 4: 신규 플랜 확인

```sql
-- 신규 플랜 목록 확인
SELECT
  name,
  plan_type,
  price_monthly,
  price_yearly,
  max_users,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY plan_type, price_monthly;

-- 예상 결과:
-- name      | plan_type   | price_monthly | price_yearly | max_users | is_active
-- Free      | individual  | 0             | 0            | 1         | true
-- Starter   | individual  | 15900         | 159000       | 1         | true
-- Pro       | individual  | 35900         | 359000       | 3         | true
-- Free      | business    | 0             | 0            | 3         | true
-- Starter   | business    | 159000        | 1590000      | 5         | true
-- Enterprise| business    | 259000        | 2590000      | 10        | true
```

### Step 5: 기존 플랜 비활성화 확인

```sql
-- 비활성화된 기존 플랜 확인
SELECT
  name,
  plan_type,
  is_active
FROM subscription_plans
WHERE is_active = false;

-- 기존 플랜들이 is_active = false로 변경되었는지 확인
```

## 🧪 테스트 시나리오

### 1. 로컬 환경 테스트

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 테스트
http://localhost:3000/dashboard/subscription
```

#### 테스트 케이스

**개인 플랜 선택 테스트**:
1. [ ] 개인 탭 클릭
2. [ ] Free, Starter, Pro 플랜 3개 표시 확인
3. [ ] 가격 확인:
   - Free: 0원
   - Starter: 15,900원/월, 159,000원/년
   - Pro: 35,900원/월, 359,000원/년
4. [ ] 계정 수 확인:
   - Free: 1개
   - Starter: 1개
   - Pro: 3개
5. [ ] "Pro" 플랜에 "추천" 배지 표시 확인

**기업 플랜 선택 테스트**:
1. [ ] 기업 탭 클릭
2. [ ] Free, Starter, Enterprise 플랜 3개 표시 확인
3. [ ] 가격 확인:
   - Free: 0원
   - Starter: 159,000원/월, 1,590,000원/년
   - Enterprise: 259,000원/월, 2,590,000원/년
4. [ ] 계정 수 확인:
   - Free: 3개
   - Starter: 5개
   - Enterprise: 10개
5. [ ] "Starter" 플랜에 "추천" 배지 표시 확인

**월간/연간 결제 토글 테스트**:
1. [ ] 월간 결제 선택 시 월간 가격 표시
2. [ ] 연간 결제 선택 시 연간 가격 표시
3. [ ] 할인율 표시 확인 (약 17%)

**플랜 변경 테스트** (기존 구독이 있는 경우):
1. [ ] 개인 Starter → 개인 Pro 변경
2. [ ] 개인 → 기업 플랜 변경
3. [ ] 월간 → 연간 변경
4. [ ] 변경 후 알림 생성 확인 (/admin/notifications)

### 2. Admin 페이지 테스트

```bash
http://localhost:3000/admin/subscriptions
```

1. [ ] 플랜 타입 표시 확인 (개인/기업)
2. [ ] 계정 수 컬럼 추가 확인
3. [ ] 기존 구독 데이터 정상 표시 확인

## 🔄 기존 구독 사용자 마이그레이션 (선택사항)

현재 활성 구독자가 있는 경우, 자동으로 신규 플랜에 매핑할 수 있습니다.

### 옵션 1: 개인 플랜으로 기본 매핑

```sql
-- 기존 Pro 구독자 → 개인 Pro
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND plan_type = 'individual' AND is_active = true
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND is_active = false
);

-- 기존 Enterprise 구독자 → 기업 Enterprise
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND plan_type = 'business' AND is_active = true
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND is_active = false
);
```

### 옵션 2: 수동 매핑

각 구독자의 사용 패턴을 분석하여 개인/기업 플랜 수동 선택

```sql
-- 구독자별 계정 수 확인
SELECT
  c.name as company_name,
  sp.name as plan_name,
  COUNT(u.id) as user_count,
  cs.id as subscription_id
FROM company_subscriptions cs
JOIN companies c ON cs.company_id = c.id
JOIN subscription_plans sp ON cs.plan_id = sp.id
LEFT JOIN users u ON u.company_id = c.id
WHERE cs.status IN ('active', 'trial')
GROUP BY c.name, sp.name, cs.id
ORDER BY user_count DESC;

-- 결과를 보고 개별적으로 적절한 플랜에 매핑
```

## ⚠️ 주의사항

### 1. 기존 구독 유지
- 마이그레이션 후에도 기존 구독은 그대로 유지됩니다
- 구독 ID, 결제 주기, 상태 등 모두 보존됩니다
- 단, `plan_id`만 신규 플랜 ID로 업데이트됩니다 (옵션 선택 시)

### 2. 알림 시스템
- 플랜 변경 시 자동으로 알림이 생성됩니다
- `/admin/notifications`에서 확인 가능

### 3. 롤백 절차
만약 문제가 발생한 경우:

```sql
-- 1. 신규 플랜 비활성화
UPDATE subscription_plans
SET is_active = false
WHERE plan_type IN ('individual', 'business');

-- 2. 기존 플랜 재활성화
UPDATE subscription_plans
SET is_active = true
WHERE plan_type IS NULL OR plan_type = 'individual';

-- 3. 구독 매핑 롤백 (백업에서 복원)
-- Supabase Dashboard → Backups → Restore
```

## 📊 마이그레이션 후 확인사항

### 1. 플랜 개수 확인

```sql
SELECT
  plan_type,
  COUNT(*) as plan_count
FROM subscription_plans
WHERE is_active = true
GROUP BY plan_type;

-- 예상 결과:
-- plan_type  | plan_count
-- individual | 3
-- business   | 3
```

### 2. 활성 구독 개수 확인

```sql
SELECT
  sp.name,
  sp.plan_type,
  COUNT(cs.id) as subscription_count
FROM subscription_plans sp
LEFT JOIN company_subscriptions cs ON cs.plan_id = sp.id AND cs.status IN ('active', 'trial')
WHERE sp.is_active = true
GROUP BY sp.name, sp.plan_type
ORDER BY sp.plan_type, subscription_count DESC;
```

### 3. 가격 정책 확인

```sql
SELECT
  name,
  plan_type,
  price_monthly,
  price_yearly,
  ROUND((price_monthly * 12 - price_yearly)::numeric / (price_monthly * 12) * 100, 1) as discount_percent
FROM subscription_plans
WHERE is_active = true AND price_monthly > 0
ORDER BY plan_type, price_monthly;

-- 모든 유료 플랜에서 약 16.7% 할인 확인
```

## 🎉 완료

모든 단계가 완료되면:

1. [ ] 프로덕션 배포
2. [ ] 사용자 공지 (새로운 플랜 안내)
3. [ ] 모니터링 시작 (에러 로그, 알림 생성 확인)

## 📞 문제 해결

### 문제 1: 플랜이 표시되지 않음

**원인**: plan_type 컬럼이 추가되지 않음

**해결**:
```sql
-- plan_type 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscription_plans' AND column_name = 'plan_type';

-- 없으면 수동 추가
ALTER TABLE subscription_plans
ADD COLUMN plan_type VARCHAR(20) NOT NULL DEFAULT 'individual'
CHECK (plan_type IN ('individual', 'business'));
```

### 문제 2: TypeScript 타입 오류

**원인**: Plan 인터페이스에 plan_type 필드 누락

**해결**:
- SubscriptionClient.tsx의 Plan 인터페이스 확인
- `plan_type: 'individual' | 'business'` 필드 추가

### 문제 3: 기존 구독자 플랜 선택 오류

**원인**: 기존 플랜 ID가 비활성화됨

**해결**:
기존 구독 사용자 마이그레이션 섹션의 SQL 실행

## 📝 변경사항 요약

### 데이터베이스
- ✅ `subscription_plans.plan_type` 컬럼 추가
- ✅ 개인 플랜 3개 추가 (Free, Starter, Pro)
- ✅ 기업 플랜 3개 추가 (Free, Starter, Enterprise)
- ✅ 인덱스 추가 (`idx_subscription_plans_type`)

### 프론트엔드
- ✅ SubscriptionClient: 개인/기업 탭 추가
- ✅ SubscriptionClient: 플랜 필터링 로직 추가
- ✅ SubscriptionClient: 추천 배지 로직 변경 (개인=Pro, 기업=Starter)
- ✅ Admin 페이지: 플랜 타입 표시 추가
- ✅ Admin 페이지: 계정 수 컬럼 추가

### 가격 정책
| 구분 | 플랜 | 월간 | 연간 | 계정 | 리드 |
|------|------|------|------|------|------|
| 개인 | Free | 무료 | 무료 | 1 | 50 |
| 개인 | Starter | 15,900원 | 159,000원 | 1 | 500 |
| 개인 | Pro | 35,900원 | 359,000원 | 3 | 2,000 |
| 기업 | Free | 무료 | 무료 | 3 | 100 |
| 기업 | Starter | 159,000원 | 1,590,000원 | 5 | 5,000 |
| 기업 | Enterprise | 259,000원 | 2,590,000원 | 10 | 무제한 |
