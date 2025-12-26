# 페이지 접근 권한 RLS 우회 수정 설계

**날짜**: 2025-12-26
**이슈**: calendar, reservations, analytics, reports 페이지에서 업그레이드 필요 메시지 표시
**상태**: 🔍 분석 완료 → 📝 설계 중

---

## 🎯 문제 정의

### 증상
- **계정**: mh853@gmail.com (퍼널리 회사 소속, 프로 플랜 사용)
- **문제 페이지**:
  1. `/dashboard/calendar` - DB 스케줄
  2. `/dashboard/reservations` - 예약 스케줄
  3. `/dashboard/analytics` - 트래픽 분석
  4. `/dashboard/reports` - DB 리포트
- **증상**: 모든 페이지에서 "업그레이드 필요" 메시지 표시

### 기대 동작
- 퍼널리 회사는 프로 플랜 가입 → 모든 기능 사용 가능
- **네비게이션은 활성화됨** (layout.tsx Service Role 적용 완료)
- **페이지 접근 시 업그레이드 메시지 없이 정상 표시**되어야 함

---

## 🔍 근본 원인 분석

### 문제 코드 위치

#### 1. 페이지 레벨 권한 체크
**공통 패턴** (4개 페이지 모두 동일):
```typescript
// calendar/page.tsx:38
const hasAccess = await hasFeatureAccess(userProfile.company_id, 'db_schedule')
if (!hasAccess) {
  return <UpgradeNotice featureName="DB 스케줄" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
}

// reservations/page.tsx:29
const hasAccess = await hasFeatureAccess(userProfile.company_id, 'reservation_schedule')
if (!hasAccess) {
  return <UpgradeNotice featureName="예약 스케줄" requiredPlan="..." />
}

// analytics/page.tsx:39
const hasAccess = await hasFeatureAccess(userProfile.company_id, 'analytics')
if (!hasAccess) {
  return <UpgradeNotice featureName="트래픽 분석" requiredPlan="..." />
}

// reports/page.tsx:41
const hasAccess = await hasFeatureAccess(userProfile.company_id, 'reports')
if (!hasAccess) {
  return <UpgradeNotice featureName="DB 리포트" requiredPlan="..." />
}
```

#### 2. hasFeatureAccess() 함수 분석
**파일**: [src/lib/subscription-access.ts:297-328](src/lib/subscription-access.ts#L297-L328)

```typescript
export async function hasFeatureAccess(
  companyId: string,
  featureName: string
): Promise<boolean> {
  try {
    const supabase = await createClient()  // ❌ ANON_KEY 사용!

    // 현재 구독 정보 및 플랜 기능 조회
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
      return false  // ❌ RLS 차단 → false 반환
    }

    const features = (subscription.subscription_plans as any)?.features || {}
    return features[featureName] === true
  } catch (error) {
    console.error('[Feature Access] 기능 접근 체크 실패:', error)
    return false
  }
}
```

### RLS 차단 메커니즘

**문제 흐름**:
```
1. Page component 실행
   └─ hasFeatureAccess(company_id, feature_name)
      └─ createClient() → ANON_KEY
         └─ company_subscriptions 쿼리
            └─ RLS 정책 적용 → 0 rows
               └─ subError 또는 !subscription
                  └─ return false
                     └─ Page: <UpgradeNotice /> 표시
```

**증거**:
- layout.tsx에서 동일한 테이블 쿼리가 RLS에 의해 차단됨 (PGRST116 에러)
- Service Role 사용 시 정상 작동 확인
- `hasFeatureAccess()`도 동일한 `createClient()` (ANON_KEY) 사용

---

## ✅ 해결 방안

### Solution: Service Role 사용으로 RLS 우회

**수정 대상**: [src/lib/subscription-access.ts](src/lib/subscription-access.ts)

#### 수정 1: hasFeatureAccess() 함수
**위치**: Line 297-328

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

**After** (Service Role 사용):
```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
      console.error('[Feature Access] 구독 조회 실패:', subError)
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
1. Line 1: `createServiceClient` import 추가
2. Line 302: `await createClient()` → `createServiceClient()` (async 제거)
3. Line 318: 에러 로그에 상세 정보 추가

---

## 🔄 영향 받는 다른 함수들

### 1. checkSubscriptionAccess() - 수정 불필요
**위치**: Line 25-171
**이유**:
- Dashboard 접근 전반 체크 (Middleware에서 사용)
- User 권한으로 자신의 회사 구독 조회하는 것이 맞음
- RLS 정책이 올바르게 설정되어 있으면 정상 작동해야 함

### 2. canCreateLandingPage() - 수정 필요
**위치**: Line 206-292
**사용처**: 랜딩페이지 생성 한도 체크

**수정**:
```typescript
export async function canCreateLandingPage(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = createServiceClient()  // ✅ Service Role

    // ... rest of the code
  }
}
```

### 3. canInviteUser() - 수정 필요
**위치**: Line 333-418
**사용처**: 사용자 초대 한도 체크

**수정**:
```typescript
export async function canInviteUser(companyId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number | null
  message?: string
}> {
  try {
    const supabase = createServiceClient()  // ✅ Service Role

    // ... rest of the code
  }
}
```

---

## 📊 수정된 파일 목록

### 1. src/lib/subscription-access.ts
**수정 함수**:
- ✅ `hasFeatureAccess()` (Line 297-328)
- ✅ `canCreateLandingPage()` (Line 206-292)
- ✅ `canInviteUser()` (Line 333-418)

**수정 내용**:
- import 추가: `createServiceClient`
- `await createClient()` → `createServiceClient()` (3곳)
- 에러 로그 개선

### 2. 페이지 파일 (수정 불필요)
- ✅ [src/app/dashboard/calendar/page.tsx](src/app/dashboard/calendar/page.tsx#L38) - 수정 불필요 (함수 호출만)
- ✅ [src/app/dashboard/reservations/page.tsx](src/app/dashboard/reservations/page.tsx#L29) - 수정 불필요
- ✅ [src/app/dashboard/analytics/page.tsx](src/app/dashboard/analytics/page.tsx#L39) - 수정 불필요
- ✅ [src/app/dashboard/reports/page.tsx](src/app/dashboard/reports/page.tsx#L41) - 수정 불필요

**이유**: 페이지들은 `hasFeatureAccess()` 함수만 호출하므로 함수 내부 수정으로 모두 해결

---

## 🧪 테스트 계획

### 테스트 케이스

#### 1. mh853@gmail.com (퍼널리 회사, 프로 플랜)
**예상 결과**:
- ✅ `/dashboard/calendar` 정상 접근 (DB 스케줄 표시)
- ✅ `/dashboard/reservations` 정상 접근 (예약 스케줄 표시)
- ✅ `/dashboard/analytics` 정상 접근 (트래픽 분석 표시)
- ✅ `/dashboard/reports` 정상 접근 (DB 리포트 표시)

**테스트 방법**:
1. 개발 서버 재시작
2. mh853@gmail.com 로그인
3. 각 페이지 직접 접근
4. "업그레이드 필요" 메시지 없이 정상 콘텐츠 표시 확인

#### 2. 베이직 플랜 사용자 (19,000원 플랜)
**예상 결과**:
- ❌ 프리미엄 기능 페이지 접근 시 <UpgradeNotice /> 표시
- ✅ 베이직 기능은 정상 접근

#### 3. 구독 없는 계정
**예상 결과**:
- ❌ 모든 프리미엄 기능 페이지에서 <UpgradeNotice /> 표시

---

## 🔒 보안 고려사항

### Service Role 사용 정당성

#### hasFeatureAccess()
**사용 위치**: Server Component (Page 레벨)
- ✅ Server-side only (절대 Client 노출 안 됨)
- ✅ 사용자 입력과 무관 (company_id는 authenticated user 프로필에서 가져옴)
- ✅ 읽기 전용 작업 (SELECT only)
- ✅ 보안 민감 데이터 없음 (features 정보는 플랜 공개 데이터)

#### canCreateLandingPage()
**사용 위치**: 랜딩페이지 생성 검증 (Server Action/API)
- ✅ Server-side only
- ✅ company_id는 인증된 사용자의 소속 회사
- ✅ 읽기 + 카운트 작업만 수행
- ✅ 비즈니스 로직 검증 (플랜 한도 체크)

#### canInviteUser()
**사용 위치**: 사용자 초대 검증 (Server Action/API)
- ✅ Server-side only
- ✅ company_id는 인증된 사용자의 소속 회사
- ✅ 읽기 + 카운트 작업만 수행
- ✅ 비즈니스 로직 검증 (사용자 수 한도 체크)

### checkSubscriptionAccess() Service Role 미사용 이유

**현재 상태 유지** (ANON_KEY 사용):
- Middleware/Layout에서 사용자 자신의 구독 정보 조회
- User context로 조회하는 것이 보안상 더 적절
- RLS 정책만 올바르게 설정되면 정상 작동

**RLS 정책 권장사항** (별도 작업):
```sql
-- users can view their own company's subscription
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
```

---

## 📋 구현 체크리스트

### 코드 수정
- [ ] [src/lib/subscription-access.ts](src/lib/subscription-access.ts) import 수정
  - [ ] Line 1: `createServiceClient` import 추가
- [ ] `hasFeatureAccess()` 수정
  - [ ] Line 302: `createServiceClient()` 사용
  - [ ] Line 318: 에러 로그 개선
- [ ] `canCreateLandingPage()` 수정
  - [ ] Line 213: `createServiceClient()` 사용
- [ ] `canInviteUser()` 수정
  - [ ] Line 340: `createServiceClient()` 사용

### 테스트
- [ ] 개발 서버 재시작
- [ ] mh853@gmail.com 로그인
- [ ] `/dashboard/calendar` 접근 테스트
- [ ] `/dashboard/reservations` 접근 테스트
- [ ] `/dashboard/analytics` 접근 테스트
- [ ] `/dashboard/reports` 접근 테스트
- [ ] 베이직 플랜 계정 테스트 (선택사항)

### 정리
- [ ] 불필요한 로그 제거 (있다면)
- [ ] 코드 리뷰
- [ ] 커밋 및 푸시

---

## 🎯 예상 결과

### 성공 시나리오

**로그인**: mh853@gmail.com

**각 페이지 접근**:
```
✅ /dashboard/calendar
→ DB 스케줄 캘린더 정상 표시
→ 이벤트 생성/수정 가능

✅ /dashboard/reservations
→ 예약 스케줄 리스트 정상 표시
→ 계약 완료 리드 관리 가능

✅ /dashboard/analytics
→ 트래픽 분석 차트 정상 표시
→ UTM 데이터, 랜딩페이지 성과 확인 가능

✅ /dashboard/reports
→ DB 리포트 테이블 정상 표시
→ 날짜별/부서별/담당자별 리포트 확인 가능
```

**Console (개발 환경)**:
```
No errors
No [Feature Access] errors
All pages render successfully
```

---

## 🚨 잠재적 문제점

### 문제 1: RLS 정책 누락
**증상**: Service Role 사용해도 여전히 실패
**원인**: `subscription_plans` 테이블에 RLS 정책이 있고 Service Role도 차단
**해결**: Supabase Admin에서 RLS 정책 확인 및 수정

### 문제 2: JOIN 쿼리 실패
**증상**: `subscription_plans (features)` JOIN이 실패
**원인**: Foreign key 관계 미설정 또는 RLS 정책
**해결**: 2단계 쿼리로 변경 (layout.tsx와 동일한 방식)

### 문제 3: 환경 변수 미설정
**증상**: Service Role Key 없음 에러
**원인**: SUPABASE_SERVICE_ROLE_KEY 환경 변수 누락
**해결**: .env.local 확인 및 서버 재시작

---

## 📝 추가 개선사항 (선택사항)

### 1. RLS 정책 설정 (장기)
**목적**: Service Role 사용 최소화
**방법**:
- `company_subscriptions`에 사용자가 자신의 회사 구독 조회 가능하도록 정책 추가
- `subscription_plans`는 public read 허용 (플랜 정보는 공개)

### 2. 쿼리 캐싱 (성능 최적화)
**목적**: 동일한 구독 정보 반복 조회 방지
**방법**:
- layout.tsx에서 이미 조회한 planFeatures를 페이지에 전달
- `hasFeatureAccess()` 대신 props로 받은 planFeatures 사용

### 3. 에러 처리 개선
**목적**: 더 명확한 에러 메시지
**방법**:
- 개발 환경에서 상세 에러 로그
- 프로덕션에서는 사용자 친화적 메시지

---

**설계일**: 2025-12-26
**설계자**: Claude Code
**타입**: Bug Fix - RLS Bypass for Page Access
**우선순위**: Critical
**예상 작업 시간**: 10분 (단순 함수 수정)
**영향 범위**: 4개 프리미엄 페이지 접근 권한

**Next Action**: subscription-access.ts 파일 수정 후 테스트
