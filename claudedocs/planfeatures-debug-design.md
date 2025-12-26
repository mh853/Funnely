# planFeatures 전달 이슈 디버깅 설계

**날짜**: 2025-12-26
**이슈**: 회사 구독 플랜이 있음에도 네비게이션이 비활성화되는 문제
**상태**: 🔍 디버깅 중

---

## 🎯 문제 상황

### 증상
- **계정**: mh853@gmail.com
- **회사**: 퍼널리 (프로 플랜 활성화 상태)
- **테스트 환경**: 개발 서버 재시작 + 시크릿 모드
- **문제**: 좌측 네비게이션의 프리미엄 기능들이 비활성화 (잠금 아이콘 표시)

### 기대 동작
- 퍼널리 회사는 프로 플랜 가입 → 모든 프리미엄 기능 활성화
- 트래픽 분석, DB 리포트, DB 스케줄, 예약 스케줄 모두 **활성화**되어야 함

### 실제 동작
- 모든 프리미엄 기능에 잠금 아이콘 표시
- "프로 플랜 이상 필요" 메시지 출력

---

## 🔍 디버깅 분석

### 1차 검증: 데이터베이스 쿼리 ✅

**검증 스크립트 실행 결과**:
```javascript
// 사용자 정보
{
  email: 'mh853@gmail.com',
  company_id: '971983c1-d197-4ee3-8cda-538551f2cfb2',
  simple_role: 'user'
}

// 회사 구독
{
  status: 'active',
  subscription_plans: {
    features: {
      analytics: true,
      reports: true,
      db_schedule: true,
      reservation_schedule: true,
      dashboard: true,
      db_status: true,
      priority_support: true,
      advanced_schedule: true
    }
  }
}

// 계산된 planFeatures
{
  analytics: true,
  reports: true,
  db_schedule: true,
  reservation_schedule: true,
  // ... 모두 true
}
```

**결론**: 데이터베이스 쿼리는 정상 ✅

---

## 🐛 문제 가설

### 가설 1: Server Component → Client Component 데이터 전달 실패 🎯

**의심 지점**: [layout.tsx](src/app/dashboard/layout.tsx) → [DashboardLayoutClient.tsx](src/components/dashboard/DashboardLayoutClient.tsx) → [Sidebar.tsx](src/components/dashboard/Sidebar.tsx)

**데이터 흐름**:
```
1. layout.tsx (Server Component)
   ├─ planFeatures = { analytics: true, reports: true, ... } 계산
   └─ <DashboardLayoutClient planFeatures={planFeatures} />

2. DashboardLayoutClient.tsx (Client Component)
   ├─ planFeatures를 props로 받음
   └─ <Sidebar planFeatures={planFeatures} />

3. Sidebar.tsx (Client Component)
   ├─ planFeatures를 props로 받음 (default: {})
   └─ processedNavigation 계산
       └─ disabled: planFeatures[item.requiredFeature] !== true
```

**문제 포인트**:
1. **Server → Client 직렬화**: Server Component에서 Client Component로 객체 전달 시 직렬화 문제
2. **Default 값**: `planFeatures = {}` 기본값이 적용되고 있을 가능성
3. **타입 캐스팅**: `(subscription.subscription_plans as any).features`가 제대로 동작하지 않을 수 있음

### 가설 2: Supabase JOIN 결과 구조 문제

**의심 코드**: [layout.tsx:37-39](src/app/dashboard/layout.tsx#L37-L39)
```typescript
if (subscription?.subscription_plans) {
  planFeatures = (subscription.subscription_plans as any).features || {}
}
```

**문제 가능성**:
- `subscription_plans`가 객체가 아니라 **배열**로 반환될 수 있음
- TypeScript `as any` 캐스팅이 런타임 오류 숨김
- `features` 속성이 예상과 다른 위치에 있을 수 있음

### 가설 3: 캐싱 레이어 문제

**의심 코드**: [layout.tsx:21](src/app/dashboard/layout.tsx#L21)
```typescript
const userProfile = await getCachedUserProfile(user.id)
```

**문제 가능성**:
- `getCachedUserProfile`이 오래된 캐시 반환
- `company_id`가 캐시에서 누락되거나 잘못된 값

---

## 🔧 구현된 디버깅 솔루션

### 1. layout.tsx 디버깅 로그 추가

**위치**: [layout.tsx:37-53](src/app/dashboard/layout.tsx#L37-L53)

**추가된 로그**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 [DEBUG] User:', user.email)
  console.log('🔍 [DEBUG] Company ID:', userProfile.company_id)
  console.log('🔍 [DEBUG] Subscription data:', JSON.stringify(subscription, null, 2))
  console.log('🔍 [DEBUG] Subscription error:', subscriptionError)
  console.log('🔍 [DEBUG] Extracted planFeatures:', JSON.stringify(planFeatures, null, 2))
}
```

**목적**:
- ✅ 실제 Supabase 쿼리 결과 확인
- ✅ `subscription.subscription_plans` 구조 검증
- ✅ 추출된 `planFeatures` 값 확인
- ✅ 쿼리 에러 발생 여부 확인

### 2. Sidebar.tsx 디버깅 로그 추가

**위치**: [Sidebar.tsx:60-91](src/components/dashboard/Sidebar.tsx#L60-L91)

**추가된 로그**:
```typescript
// Props 수신 확인
if (process.env.NODE_ENV === 'development') {
  console.log('📱 [Sidebar] Received planFeatures:', planFeatures)
  console.log('📱 [Sidebar] User profile:', userProfile?.email, userProfile?.company_id)
}

// processedNavigation 계산 결과 확인
if (process.env.NODE_ENV === 'development') {
  console.log('📱 [Sidebar] Processed navigation:', processedNavigation.map(item => ({
    name: item.name,
    requiredFeature: item.requiredFeature,
    featureValue: item.requiredFeature ? planFeatures[item.requiredFeature] : 'N/A',
    disabled: item.disabled
  })))
}
```

**목적**:
- ✅ Client Component가 받은 `planFeatures` 값 확인
- ✅ 각 네비게이션 아이템의 disabled 상태 확인
- ✅ `planFeatures[item.requiredFeature]` 접근 결과 확인

---

## 📋 디버깅 체크리스트

### 사용자 액션 (개발 서버에서)

1. **개발 서버 터미널 확인**:
   ```bash
   # 개발 서버 실행 중인 터미널에서 로그 확인
   # mh853@gmail.com으로 로그인 시 출력되는 로그:

   🔍 [DEBUG] User: mh853@gmail.com
   🔍 [DEBUG] Company ID: 971983c1-d197-4ee3-8cda-538551f2cfb2
   🔍 [DEBUG] Subscription data: { ... }
   🔍 [DEBUG] Extracted planFeatures: { ... }
   ```

2. **브라우저 콘솔 확인**:
   ```
   F12 → Console 탭

   📱 [Sidebar] Received planFeatures: { ... }
   📱 [Sidebar] Processed navigation: [ ... ]
   ```

### 예상 결과별 대응

#### 시나리오 A: Server에서 planFeatures 올바르게 계산, Client에서 빈 객체 수신
**증상**:
- Server 로그: `planFeatures: { analytics: true, ... }`
- Client 로그: `Received planFeatures: {}`

**원인**: Server → Client 직렬화 문제
**해결책**: `planFeatures`를 명시적으로 직렬화하거나 다른 방식으로 전달

#### 시나리오 B: Server에서 planFeatures 빈 객체
**증상**:
- Server 로그: `planFeatures: {}`
- Client 로그: `Received planFeatures: {}`

**원인**: Supabase 쿼리 또는 데이터 추출 로직 문제
**해결책**: `subscription.subscription_plans` 구조 수정

#### 시나리오 C: company_id가 null
**증상**:
- Server 로그: `Company ID: null`

**원인**: `getCachedUserProfile` 캐싱 문제
**해결책**: 캐시 무효화 또는 직접 쿼리로 변경

#### 시나리오 D: Supabase 쿼리 에러
**증상**:
- Server 로그: `Subscription error: { ... }`

**원인**: 권한 문제 또는 테이블 구조 변경
**해결책**: RLS 정책 확인 또는 쿼리 수정

---

## 🎯 다음 단계

### 즉시 실행할 작업

1. **mh853@gmail.com으로 로그인**
2. **터미널 로그 확인** (Server-side)
3. **브라우저 콘솔 확인** (Client-side)
4. **로그 내용 공유**

### 로그 분석 후 조치

각 시나리오별 해결책 구현:
- Server → Client 직렬화 문제 → 명시적 직렬화 또는 API 라우트 사용
- Supabase 쿼리 문제 → JOIN 구조 또는 타입 캐스팅 수정
- 캐싱 문제 → `getCachedUserProfile` 수정 또는 직접 쿼리
- RLS 문제 → 정책 검토 및 수정

---

## 📊 기술 스택 컨텍스트

### Next.js 13+ App Router

**Server Components**:
- `layout.tsx`는 Server Component
- `async/await` 사용 가능
- 직접 데이터베이스 쿼리 가능

**Client Components**:
- `DashboardLayoutClient.tsx`, `Sidebar.tsx`는 Client Component
- `'use client'` 지시어 포함
- Server Component에서 props로 데이터 받음

**직렬화 제약**:
- Server → Client로 전달되는 props는 **JSON 직렬화 가능**해야 함
- 함수, Symbol, undefined 값은 전달 불가
- 객체는 plain object여야 함

### Supabase JOIN 쿼리

**정상 동작**:
```typescript
const { data: subscription } = await supabase
  .from('company_subscriptions')
  .select(`
    subscription_plans (
      features
    )
  `)
  .single()

// 결과: { subscription_plans: { features: { ... } } }
```

**잠재적 문제**:
- `subscription_plans`가 배열로 반환될 수 있음: `[{ features: {...} }]`
- 다중 JOIN 시 구조 복잡화

---

## 🔍 디버깅 목표

### 핵심 질문

1. **Server에서 계산된 planFeatures는 무엇인가?**
   - 모든 기능이 `true`인가?
   - 빈 객체 `{}`인가?

2. **Client에서 받은 planFeatures는 무엇인가?**
   - Server와 동일한가?
   - 빈 객체로 변질되었는가?

3. **Sidebar의 disabled 로직은 올바른가?**
   - `planFeatures[item.requiredFeature] !== true` 평가 결과는?
   - 각 아이템별 disabled 상태는?

### 예상 시간

- **디버깅 로그 확인**: 5분
- **문제 식별**: 10분
- **해결책 구현**: 20-30분
- **테스트 및 검증**: 10분

**총 예상 시간**: 45-55분

---

**설계일**: 2025-12-26
**설계자**: Claude Code
**타입**: Bug Fix - Debug Investigation
**우선순위**: High
**영향**: 모든 프리미엄 기능 접근성
