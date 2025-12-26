# 페이지 접근 권한 RLS 우회 구현 완료

**날짜**: 2025-12-26
**이슈**: calendar, reservations, analytics, reports 페이지의 업그레이드 메시지 오류
**상태**: ✅ 구현 완료

---

## 🎯 문제 요약

### 증상
- **계정**: mh853@gmail.com (퍼널리 회사, 프로 플랜)
- **문제**: 네비게이션은 활성화되었으나, 페이지 접근 시 "업그레이드 필요" 메시지 표시
- **영향 페이지**:
  1. `/dashboard/calendar` - DB 스케줄
  2. `/dashboard/reservations` - 예약 스케줄
  3. `/dashboard/analytics` - 트래픽 분석
  4. `/dashboard/reports` - DB 리포트

### 근본 원인
- 페이지들이 `hasFeatureAccess()` 함수로 권한 체크
- `hasFeatureAccess()`가 **ANON_KEY** 사용 → RLS 차단
- layout.tsx와 동일한 RLS 문제

---

## ✅ 구현 내용

### 1. subscription-access.ts import 수정
**파일**: [src/lib/subscription-access.ts:1](src/lib/subscription-access.ts#L1)

**Before**:
```typescript
import { createClient } from '@/lib/supabase/server'
```

**After**:
```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'
```

---

### 2. hasFeatureAccess() 함수 수정
**파일**: [src/lib/subscription-access.ts:297-329](src/lib/subscription-access.ts#L297-L329)

**Before** (ANON_KEY 사용):
```typescript
export async function hasFeatureAccess(
  companyId: string,
  featureName: string
): Promise<boolean> {
  try {
    const supabase = await createClient()  // ❌ ANON_KEY

    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        status,
        subscription_plans (
          features
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'trial', 'past_due'])
      .single()

    if (subError || !subscription) {
      return false  // ❌ RLS 차단 → false
    }

    const features = (subscription.subscription_plans as any)?.features || {}
    return features[featureName] === true
  } catch (error) {
    console.error('[Feature Access] 기능 접근 체크 실패:', error)
    return false
  }
}
```

**After** (Service Role 사용):
```typescript
export async function hasFeatureAccess(
  companyId: string,
  featureName: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient()  // ✅ Service Role

    const { data: subscription, error: subError } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        status,
        subscription_plans (
          features
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'trial', 'past_due'])
      .single()

    if (subError || !subscription) {
      console.error('[Feature Access] 구독 조회 실패:', subError)  // ✅ 상세 에러 로그
      return false
    }

    const features = (subscription.subscription_plans as any)?.features || {}
    return features[featureName] === true
  } catch (error) {
    console.error('[Feature Access] 기능 접근 체크 실패:', error)
    return false
  }
}
```

**변경 사항**:
- Line 302: `await createClient()` → `createServiceClient()` (async 제거)
- Line 319: 에러 로그에 `subError` 상세 정보 추가

---

### 3. canCreateLandingPage() 함수 수정
**파일**: [src/lib/subscription-access.ts:206-292](src/lib/subscription-access.ts#L206-L292)

**Before**:
```typescript
export async function canCreateLandingPage(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = await createClient()  // ❌ ANON_KEY
    // ...
  }
}
```

**After**:
```typescript
export async function canCreateLandingPage(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = createServiceClient()  // ✅ Service Role
    // ...
  }
}
```

**변경 사항**:
- Line 213: `await createClient()` → `createServiceClient()`

---

### 4. canInviteUser() 함수 수정
**파일**: [src/lib/subscription-access.ts:334-418](src/lib/subscription-access.ts#L334-L418)

**Before**:
```typescript
export async function canInviteUser(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = await createClient()  // ❌ ANON_KEY
    // ...
  }
}
```

**After**:
```typescript
export async function canInviteUser(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = createServiceClient()  // ✅ Service Role
    // ...
  }
}
```

**변경 사항**:
- Line 341: `await createClient()` → `createServiceClient()`

---

## 📊 수정된 파일 목록

### 1. src/lib/subscription-access.ts
**총 4곳 수정**:
- ✅ Line 1: import 추가 (`createServiceClient`)
- ✅ Line 302: `hasFeatureAccess()` - Service Role 사용
- ✅ Line 213: `canCreateLandingPage()` - Service Role 사용
- ✅ Line 341: `canInviteUser()` - Service Role 사용

### 2. 페이지 파일 (수정 불필요)
- ✅ [src/app/dashboard/calendar/page.tsx](src/app/dashboard/calendar/page.tsx) - 수정 불필요
- ✅ [src/app/dashboard/reservations/page.tsx](src/app/dashboard/reservations/page.tsx) - 수정 불필요
- ✅ [src/app/dashboard/analytics/page.tsx](src/app/dashboard/analytics/page.tsx) - 수정 불필요
- ✅ [src/app/dashboard/reports/page.tsx](src/app/dashboard/reports/page.tsx) - 수정 불필요

**이유**: 페이지들은 `hasFeatureAccess()` 함수만 호출하므로 함수 수정으로 자동 해결

---

## 🧪 테스트 방법

### 1. 개발 서버 재시작 (필수)
```bash
# 현재 서버 중지 (Ctrl+C)
npm run dev
```

**중요**: 코드 변경이므로 재시작 필요

---

### 2. 페이지 접근 테스트

**계정**: mh853@gmail.com (퍼널리 회사, 프로 플랜)

**테스트 페이지**:
1. ✅ **DB 스케줄**: `/dashboard/calendar`
   - 예상: 캘린더 정상 표시, 업그레이드 메시지 없음

2. ✅ **예약 스케줄**: `/dashboard/reservations`
   - 예상: 예약 리스트 정상 표시, 업그레이드 메시지 없음

3. ✅ **트래픽 분석**: `/dashboard/analytics`
   - 예상: 차트 및 분석 데이터 정상 표시, 업그레이드 메시지 없음

4. ✅ **DB 리포트**: `/dashboard/reports`
   - 예상: 리포트 테이블 정상 표시, 업그레이드 메시지 없음

---

### 3. 성공 확인 지표

#### ✅ 페이지 정상 표시
- DB 스케줄: 캘린더 뷰 + 이벤트 생성 버튼
- 예약 스케줄: 계약 완료 리드 목록
- 트래픽 분석: 차트 + UTM 데이터 테이블
- DB 리포트: 날짜별/부서별/담당자별 리포트

#### ❌ 업그레이드 메시지 없음
- "업그레이드 필요" 카드가 표시되지 않음
- "개인 사용자 + 스케줄 관리 기능" 메시지 없음
- 정상 페이지 콘텐츠가 바로 표시

#### 📋 Console 로그 (개발 환경)
```
No [Feature Access] errors in console
No RLS-related errors
Pages load successfully
```

---

## 🔒 보안 검증

### Service Role 사용 정당성

#### hasFeatureAccess()
**사용 위치**: Server Component (4개 페이지)
- ✅ Server-side only (Client 노출 없음)
- ✅ `company_id`는 authenticated user의 프로필에서 가져옴
- ✅ 읽기 전용 (SELECT only)
- ✅ 공개 데이터 (플랜 features는 민감 정보 아님)

#### canCreateLandingPage()
**사용 위치**: Server Action (랜딩페이지 생성 검증)
- ✅ Server-side only
- ✅ `company_id`는 인증된 사용자 소속 회사
- ✅ 비즈니스 로직 검증 (플랜 한도 체크)

#### canInviteUser()
**사용 위치**: Server Action (사용자 초대 검증)
- ✅ Server-side only
- ✅ `company_id`는 인증된 사용자 소속 회사
- ✅ 비즈니스 로직 검증 (사용자 한도 체크)

### checkSubscriptionAccess() - Service Role 미사용 (유지)
**이유**:
- Middleware/Layout에서 사용자 권한으로 자신의 구독 조회
- User context 사용이 보안상 더 적절
- RLS 정책 설정으로 정상 작동 가능

---

## 🎯 예상 결과

### 성공 시나리오

**로그인**: mh853@gmail.com

#### 1. DB 스케줄 (/dashboard/calendar)
```
✅ 캘린더 뷰 정상 표시
✅ 이벤트 목록 조회 성공
✅ 리드 목록 정상 표시
✅ 팀 멤버 목록 조회 성공
✅ 이벤트 생성/수정/삭제 기능 사용 가능
```

#### 2. 예약 스케줄 (/dashboard/reservations)
```
✅ 계약 완료 리드 목록 정상 표시
✅ 예약 날짜별 필터링 가능
✅ 담당자 배정 기능 사용 가능
```

#### 3. 트래픽 분석 (/dashboard/analytics)
```
✅ 날짜별 트래픽 차트 정상 표시
✅ 전환율 데이터 정상 표시
✅ UTM 데이터 테이블 정상 표시
✅ 랜딩페이지별 성과 분석 가능
```

#### 4. DB 리포트 (/dashboard/reports)
```
✅ 날짜별 리포트 테이블 정상 표시
✅ 부서별 집계 정상 표시
✅ 담당자별 집계 정상 표시
✅ 월별 필터링 및 엑셀 다운로드 가능
```

---

## 🐛 잠재적 문제 및 해결

### 문제 1: 여전히 업그레이드 메시지 표시
**원인**: Service Role Key 환경 변수 미설정
**해결**:
```bash
# .env.local 확인
cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY

# 없으면 추가
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGci..." >> .env.local

# 서버 재시작
npm run dev
```

### 문제 2: JOIN 쿼리 실패
**증상**: `subscription_plans (features)` 조회 실패
**원인**: Foreign key 미설정 또는 RLS 정책
**해결**: 2단계 쿼리로 변경 (layout.tsx 방식)

### 문제 3: 일부 페이지만 실패
**원인**: 특정 페이지의 추가 쿼리가 RLS 차단
**해결**: 해당 페이지의 쿼리도 Service Role 사용 고려

---

## 📝 후속 작업 (선택사항)

### 1. RLS 정책 설정 (장기)
**목적**: Service Role 사용 최소화

**권장 정책**:
```sql
-- Users can view their own company subscriptions
CREATE POLICY "Users can view own company subscription"
ON company_subscriptions
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- All users can view subscription plans (public data)
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans
FOR SELECT
USING (true);
```

### 2. 쿼리 캐싱 (성능 최적화)
**목적**: 동일한 구독 정보 반복 조회 방지

**방법**:
- layout.tsx에서 이미 조회한 `planFeatures`를 페이지에 전달
- `hasFeatureAccess()` 대신 props 사용

**수정 예시**:
```typescript
// layout.tsx
<DashboardLayoutClient planFeatures={planFeatures}>
  {children}
</DashboardLayoutClient>

// page.tsx
export default async function CalendarPage({
  planFeatures  // props로 받음
}: {
  planFeatures: Record<string, boolean>
}) {
  // hasFeatureAccess() 호출 없이 직접 체크
  const hasAccess = planFeatures.db_schedule === true
  if (!hasAccess) {
    return <UpgradeNotice />
  }
  // ...
}
```

### 3. 타입 안전성 개선
**개선 사항**:
```typescript
// subscription_plans 타입 정의
interface SubscriptionPlan {
  id: string
  features: Record<string, boolean>
}

// any 타입 제거
const features = (subscription.subscription_plans as SubscriptionPlan)?.features || {}
```

---

## 📋 완료 체크리스트

### 코드 수정
- ✅ [src/lib/subscription-access.ts:1](src/lib/subscription-access.ts#L1) - import 추가
- ✅ [src/lib/subscription-access.ts:302](src/lib/subscription-access.ts#L302) - `hasFeatureAccess()` 수정
- ✅ [src/lib/subscription-access.ts:213](src/lib/subscription-access.ts#L213) - `canCreateLandingPage()` 수정
- ✅ [src/lib/subscription-access.ts:341](src/lib/subscription-access.ts#L341) - `canInviteUser()` 수정

### 테스트 (사용자 실행 필요)
- [ ] 개발 서버 재시작
- [ ] mh853@gmail.com 로그인
- [ ] `/dashboard/calendar` 접근 확인
- [ ] `/dashboard/reservations` 접근 확인
- [ ] `/dashboard/analytics` 접근 확인
- [ ] `/dashboard/reports` 접근 확인

### 정리
- [ ] Console 로그 확인 (에러 없는지)
- [ ] 코드 리뷰
- [ ] 커밋 및 푸시

---

## 🚀 배포 전 확인사항

### 프로덕션 환경 변수
**Vercel Dashboard**:
1. Project Settings → Environment Variables
2. Key: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Scope: Production, Preview, Development

### 보안 검증
- [ ] Service Role Key가 `.env.local`에만 존재 (Git 제외)
- [ ] Client 코드에 노출되지 않는지 확인
- [ ] 빌드 로그에 Service Role Key 노출 여부 확인

---

**구현일**: 2025-12-26
**구현자**: Claude Code
**타입**: Bug Fix - Page Access RLS Bypass
**우선순위**: Critical
**상태**: ✅ 코드 수정 완료 (사용자 테스트 대기)

**Next Action**:
1. **개발 서버 재시작** (필수)
2. mh853@gmail.com 로그인
3. 4개 페이지 모두 접근 테스트
4. 정상 동작 확인 후 배포
