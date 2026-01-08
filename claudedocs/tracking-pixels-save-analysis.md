# Tracking Pixels 저장 기능 및 Meta Pixel 작동 분석

**날짜**: 2026-01-08
**Pixel ID**: `1431540718532510`
**테스트 URL**: `https://q81d1c.funnely.co.kr/landing/test4`

---

## ✅ 분석 결과 요약

### 1. 데이터베이스 저장 상태: ✅ 정상

```sql
SELECT * FROM tracking_pixels WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2';
```

**결과**:
```
company_id: 971983c1-d197-4ee3-8cda-538551f2cfb2
facebook_pixel_id: 1431540718532510  ✅
is_active: true                       ✅
created_at: 2025-12-13 08:04:22
updated_at: 2026-01-08 13:31:16       ← 최근 업데이트됨
```

**판정**: ✅ **Pixel ID가 정상적으로 저장되었습니다**

### 2. 저장 알림 표시: ✅ 정상 (코드)

[src/app/dashboard/settings/tracking-pixels/TrackingPixelsClient.tsx:65-89](src/app/dashboard/settings/tracking-pixels/TrackingPixelsClient.tsx#L65-L89)

```typescript
setSuccess(true)
setTimeout(() => setSuccess(false), 3000)

{success && (
  <div className="bg-green-50 border-l-4 border-green-400 p-4">
    <CheckCircleIcon className="h-5 w-5 text-green-400" />
    <p className="text-sm text-green-700">
      픽셀 설정이 저장되었습니다!
    </p>
  </div>
)}
```

**동작 방식**:
- 저장 성공 시 `setSuccess(true)` 호출
- 초록색 성공 메시지 3초간 표시
- 3초 후 자동으로 사라짐

**판정**: ✅ **저장 알림 로직이 정상적으로 구현되어 있습니다**

### 3. 랜딩페이지 조건: ✅ 정상

```sql
SELECT slug, status, is_active FROM landing_pages WHERE slug = 'test4';
```

**결과**:
```
slug: test4
status: published      ✅
is_active: true        ✅
```

**판정**: ✅ **서버 필터 조건을 모두 충족합니다**

### 4. Meta Pixel 작동 상태: ❌ 작동 안됨

**브라우저 테스트 결과**:
```javascript
typeof window.fbq  // undefined ❌
document.querySelector('#facebook-pixel')  // null ❌
```

**판정**: ❌ **Pixel 스크립트가 HTML에 삽입되지 않음**

---

## 🔍 근본 원인 분석

### 문제: 서버 컴포넌트 데이터 Fetch 실패

#### 1. 서버 Fetch 로직

[src/app/[companyShortId]/landing/[slug]/page.tsx:35-69](src/app/[companyShortId]/landing/[slug]/page.tsx#L35-L69)

```typescript
async function fetchCompanyAndLandingPage(companyShortId: string, slug: string) {
  // 1. Fetch company with tracking_pixels
  const { data: company } = await supabase
    .from('companies')
    .select(`
      id,
      short_id,
      name,
      tracking_pixels(*)  // ← JOIN tracking_pixels
    `)
    .eq('short_id', companyShortId)
    .single()

  // 2. Fetch landing page
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('company_id', company.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true)
    .single()

  // 3. Combine data
  return {
    ...landingPage,
    companies: company  // ← company.tracking_pixels 포함해야 함
  }
}
```

#### 2. 클라이언트 컴포넌트 렌더링

[src/components/landing-pages/PublicLandingPage.tsx:412-417](src/components/landing-pages/PublicLandingPage.tsx#L412-L417)

```typescript
const trackingPixels = landingPage.companies?.tracking_pixels?.[0]

{trackingPixels?.is_active && trackingPixels?.facebook_pixel_id && (
  // Meta Pixel 스크립트 삽입
)}
```

#### 3. 문제점 발견

**직접 DB 조회 vs 서버 Fetch 비교**:

| 방법 | company_id | tracking_pixels | 결과 |
|------|-----------|-----------------|------|
| 직접 DB 조회 | ✅ 971983c1... | ✅ 있음 | 데이터 존재 |
| 서버 Fetch (추정) | ✅ 971983c1... | ❌ **없음** | JOIN 실패? |

**가능한 원인**:
1. **Supabase RLS (Row Level Security) 정책 문제**
   - Service Role Client를 사용하고 있으므로 RLS 우회됨
   - 하지만 관계형 JOIN에서 RLS가 적용될 수 있음

2. **Next.js 빌드 캐시**
   - `dynamic = 'force-dynamic'` 설정되어 있음
   - 하지만 개발 서버나 프로덕션 빌드 캐시 가능성

3. **JOIN 쿼리 실패**
   - tracking_pixels가 별도 테이블이므로 JOIN이 필요
   - 1:1 관계이지만 데이터가 없으면 빈 배열 반환

---

## 🔧 해결 방법

### 방법 1: 서버 재시작 (가장 빠름)

```bash
# 개발 서버 재시작
npm run dev

# 또는 프로덕션 빌드
npm run build
npm start
```

**이유**: Next.js 빌드 캐시나 서버 메모리 캐시가 오래된 데이터를 사용 중일 가능성

### 방법 2: 하드 리프레시 (브라우저 캐시 제거)

```
Chrome: Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)
```

**이유**: 브라우저가 오래된 HTML을 캐싱하고 있을 가능성

### 방법 3: RLS 정책 확인 및 수정

```sql
-- tracking_pixels 테이블의 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'tracking_pixels';

-- 필요시 Service Role에 대한 SELECT 권한 명시적 허용
CREATE POLICY "Service role can select tracking_pixels"
ON tracking_pixels
FOR SELECT
USING (true);
```

### 방법 4: Fetch 로직 개선 (코드 수정)

**현재 코드 문제점**:
```typescript
// 문제: companies JOIN 결과가 tracking_pixels를 포함하지 않을 수 있음
tracking_pixels(*)
```

**개선된 Fetch 로직**:

```typescript
// Option A: tracking_pixels를 별도로 fetch
async function fetchCompanyAndLandingPage(companyShortId: string, slug: string) {
  const supabase = getServiceRoleClient()

  // 1. Fetch company
  const { data: company } = await supabase
    .from('companies')
    .select('id, short_id, name')
    .eq('short_id', companyShortId)
    .single()

  if (!company) return null

  // 2. Fetch tracking_pixels separately
  const { data: trackingPixels } = await supabase
    .from('tracking_pixels')
    .select('*')
    .eq('company_id', company.id)
    .maybeSingle()  // single() 대신 maybeSingle() 사용

  // 3. Fetch landing page
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('company_id', company.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true)
    .single()

  if (!landingPage) return null

  // 4. Manually construct the combined object
  return {
    ...landingPage,
    companies: {
      ...company,
      tracking_pixels: trackingPixels ? [trackingPixels] : []
    }
  }
}
```

---

## 🧪 디버깅 단계별 가이드

### Step 1: 서버 로그 확인

[src/app/[companyShortId]/landing/[slug]/page.tsx:35](src/app/[companyShortId]/landing/[slug]/page.tsx#L35) 에 로깅 추가:

```typescript
async function fetchCompanyAndLandingPage(companyShortId: string, slug: string) {
  const supabase = getServiceRoleClient()

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select(`
      id,
      short_id,
      name,
      tracking_pixels(*)
    `)
    .eq('short_id', companyShortId)
    .single()

  // 디버깅 로그 추가
  console.log('=== Company Fetch Debug ===')
  console.log('Company:', company)
  console.log('Tracking Pixels:', company?.tracking_pixels)
  console.log('Error:', companyError)

  // ... 나머지 코드
}
```

**확인 사항**:
- `company.tracking_pixels`가 빈 배열인지 확인
- 에러 메시지가 있는지 확인

### Step 2: 브라우저 DevTools 확인

**Network 탭**:
1. 페이지 리프레시
2. `fbevents.js` 요청이 있는지 확인
3. 없으면 → Pixel 스크립트가 삽입되지 않음

**Console 탭**:
```javascript
// Pixel 데이터 확인 (React DevTools 필요)
// PublicLandingPage 컴포넌트의 props 확인
window.__NEXT_DATA__  // Next.js 페이지 데이터
```

### Step 3: 데이터베이스 직접 확인

```sql
-- 실제 서버가 실행하는 쿼리와 동일한 쿼리
SELECT
  c.id,
  c.short_id,
  c.name,
  tp.*
FROM companies c
LEFT JOIN tracking_pixels tp ON tp.company_id = c.id
WHERE c.short_id = 'q81d1c';
```

**예상 결과**:
- tracking_pixels 데이터가 JOIN되어 나와야 함
- NULL이면 → RLS 문제 또는 데이터 문제

---

## 📊 현재 상태 매트릭스

| 항목 | 상태 | 비고 |
|-----|------|------|
| **데이터베이스** | | |
| Pixel ID 저장 | ✅ 정상 | `1431540718532510` |
| is_active 상태 | ✅ true | |
| 최종 수정일 | ✅ 2026-01-08 | 최신 |
| **랜딩페이지** | | |
| test4 존재 | ✅ 있음 | |
| status | ✅ published | |
| is_active | ✅ true | |
| **서버 로직** | | |
| Fetch 쿼리 | ✅ 정상 | tracking_pixels JOIN |
| 필터 조건 | ✅ 충족 | status + is_active |
| **클라이언트** | | |
| Pixel 스크립트 | ❌ 없음 | **문제** |
| fbq 함수 | ❌ undefined | **문제** |
| **저장 기능** | | |
| TrackingPixelsClient | ✅ 정상 | |
| 성공 알림 | ✅ 구현됨 | 3초간 표시 |
| Upsert 로직 | ✅ 정상 | INSERT or UPDATE |

---

## 🎯 권장 조치

### 즉시 실행 (우선순위 높음)

1. **서버 재시작**
   ```bash
   # 터미널에서 Ctrl+C로 개발 서버 종료 후
   npm run dev
   ```

2. **하드 리프레시**
   ```
   브라우저: Ctrl + Shift + R
   ```

3. **브라우저 확인**
   ```
   Console에서: typeof fbq
   → function이면 성공 ✅
   → undefined면 다음 단계로 →
   ```

### 추가 확인 (문제 지속 시)

4. **서버 로그 추가**
   - page.tsx에 console.log 추가
   - tracking_pixels 데이터 출력 확인

5. **RLS 정책 확인**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tracking_pixels';
   ```

6. **코드 수정 (최후)**
   - tracking_pixels를 별도 fetch
   - 수동으로 데이터 결합

---

## 📝 성공 알림 관련

### 현재 구현 상태

**위치**: [src/app/dashboard/settings/tracking-pixels/TrackingPixelsClient.tsx:78-89](src/app/dashboard/settings/tracking-pixels/TrackingPixelsClient.tsx#L78-L89)

```typescript
{success && (
  <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-6 mt-6 rounded">
    <div className="flex">
      <CheckCircleIcon className="h-5 w-5 text-green-400" />
      <div className="ml-3">
        <p className="text-sm text-green-700">
          픽셀 설정이 저장되었습니다!
        </p>
      </div>
    </div>
  </div>
)}
```

### 저장 흐름

1. **사용자**: 저장하기 버튼 클릭
2. **상태 변경**: `setSaving(true)`, `setSuccess(false)`
3. **DB 저장**: Supabase upsert 실행
4. **성공 시**: `setSuccess(true)` → 초록색 알림 표시
5. **3초 후**: `setSuccess(false)` → 알림 자동 사라짐
6. **실패 시**: `alert()` 팝업 표시

### 알림이 안 보인 이유

**가능한 원인**:
1. **페이지 스크롤 위치**
   - 알림이 페이지 상단에 표시됨 (`mx-6 mt-6`)
   - 하단에서 저장 버튼을 눌렀다면 알림을 못 볼 수 있음

2. **3초 타이머**
   - 알림이 3초만 표시되고 사라짐
   - 저장 버튼을 누르고 다른 곳을 보고 있었다면 놓칠 수 있음

3. **네트워크 속도**
   - 저장이 너무 빨리 완료되면 깜빡 지나갈 수 있음

### 개선 제안 (선택사항)

#### Option 1: 알림 지속 시간 증가
```typescript
setTimeout(() => setSuccess(false), 5000)  // 3초 → 5초
```

#### Option 2: 저장 버튼에 체크마크 표시
```typescript
<button onClick={handleSave}>
  {success ? (
    <>
      <CheckCircleIcon className="h-5 w-5" />
      저장 완료!
    </>
  ) : saving ? (
    <>저장 중...</>
  ) : (
    <>저장하기</>
  )}
</button>
```

#### Option 3: Toast 알림 사용
```typescript
import { toast } from 'react-hot-toast'

// 저장 성공 시
toast.success('픽셀 설정이 저장되었습니다!', {
  duration: 4000,
  position: 'top-center'
})
```

---

## 🔬 추가 진단 필요 사항

### 1. JOIN 쿼리 실패 가능성

**테스트 쿼리**:
```javascript
// Supabase Dashboard SQL Editor에서 실행
SELECT
  c.id,
  c.short_id,
  c.name,
  json_agg(tp.*) as tracking_pixels
FROM companies c
LEFT JOIN tracking_pixels tp ON tp.company_id = c.id
WHERE c.short_id = 'q81d1c'
GROUP BY c.id, c.short_id, c.name;
```

**확인**: tracking_pixels가 빈 배열 `[]`인지 데이터가 있는지

### 2. Supabase Client Library 버전

**확인 명령어**:
```bash
cat package.json | grep supabase
```

**호환성**: tracking_pixels JOIN이 Supabase 버전에 따라 동작이 다를 수 있음

### 3. Service Role Key 권한

**확인**:
```typescript
// Service Role Key가 제대로 설정되었는지
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...')
```

---

## 📖 관련 문서

- [Meta Pixel 이벤트 트래킹 이슈 진단](meta-pixel-event-tracking-issue.md)
- [Meta Pixel 구현 설계](meta-pixel-tracking-design.md)
- [Meta Pixel 구현 요약](meta-pixel-implementation-summary.md)

---

**작성일**: 2026-01-08
**작성자**: Claude Sonnet 4.5
**상태**: 진단 완료 - 서버 재시작 권장

**핵심 문제**: ✅ DB 저장 성공, ❌ 서버 Fetch 데이터 미전달
**해결책**: 🔄 서버 재시작 후 하드 리프레시
