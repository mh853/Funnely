# Meta Pixel 이벤트 트래킹 이슈 진단 및 해결 가이드

**날짜**: 2026-01-08
**상태**: ❌ 이벤트 수집 불가 - 픽셀 ID 미설정

---

## 🚨 문제 상황

**증상**: Meta에서 공개 랜딩페이지의 이벤트를 수집하지 못함

**테스트 URL**: `https://q81d1c.funnely.co.kr/landing/asdf`
**회사**: 퍼널리 (company_short_id: q81d1c)

---

## 🔍 진단 결과

### 1. 데이터베이스 확인

```sql
-- 퍼널리 회사 픽셀 설정 확인
SELECT * FROM tracking_pixels WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2';
```

**결과**: ❌ **레코드 없음** - tracking_pixels 테이블에 설정이 전혀 없음

### 2. 랜딩페이지 확인

```sql
-- 퍼널리 랜딩페이지 확인
SELECT slug, title, is_published FROM landing_pages
WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2';
```

**결과**: ❌ **랜딩페이지 없음** - 공개된 랜딩페이지가 존재하지 않음

### 3. 전체 회사 픽셀 설정 현황

| 회사명 | Facebook Pixel ID | 활성화 상태 | 비고 |
|--------|------------------|-----------|------|
| 최문호의 병원 | ❌ None | ❌ undefined | 미설정 |
| 홍란의 병원 | ❌ None | ❌ undefined | 미설정 |
| 퍼널리 | ❌ **레코드 없음** | ❌ **레코드 없음** | **전체 미설정** |

---

## 🎯 근본 원인

### PublicLandingPage.tsx 조건부 렌더링 로직

```typescript
// src/components/landing-pages/PublicLandingPage.tsx:411-447
const trackingPixels = landingPage.companies?.tracking_pixels?.[0]

{trackingPixels?.is_active && trackingPixels?.facebook_pixel_id && (
  <Script id="facebook-pixel" strategy="afterInteractive" ... />
)}
```

**문제점**:
1. `trackingPixels` 자체가 `undefined` (tracking_pixels 테이블에 레코드 없음)
2. `trackingPixels?.facebook_pixel_id`가 falsy → 조건문 실패
3. **Meta Pixel 스크립트가 HTML에 전혀 삽입되지 않음**
4. 따라서 Meta가 이벤트를 수집할 수 없음

---

## ✅ 해결 방법

### Step 1: Tracking Pixels 설정 페이지로 이동

1. 대시보드 로그인
2. **설정 → 트래킹 픽셀** 메뉴 이동
3. URL: `https://your-domain.com/dashboard/settings/tracking-pixels`

### Step 2: Facebook Pixel ID 입력

**Facebook Pixel ID 입력 필드**:
- Meta Business Manager에서 발급받은 Pixel ID 입력
- 예시: `906463148573823`
- **활성화 토글을 반드시 켜야 함** ✅

**입력 화면**:
```
┌─────────────────────────────────────────┐
│ Facebook Pixel                          │
│ ┌─────────────────────────────────────┐ │
│ │ 906463148573823                     │ │ ← Pixel ID 입력
│ └─────────────────────────────────────┘ │
│                                         │
│ [활성화] ✅ ON                          │ ← 반드시 활성화
│                                         │
│ [저장하기]                              │
└─────────────────────────────────────────┘
```

### Step 3: 저장 및 확인

**저장 버튼 클릭** → 데이터베이스에 upsert됨:

```sql
INSERT INTO tracking_pixels (
  company_id,
  facebook_pixel_id,
  is_active
) VALUES (
  '971983c1-d197-4ee3-8cda-538551f2cfb2',
  '906463148573823',
  true
) ON CONFLICT (company_id) DO UPDATE SET
  facebook_pixel_id = EXCLUDED.facebook_pixel_id,
  is_active = EXCLUDED.is_active;
```

### Step 4: 공개 랜딩페이지 생성

1. **랜딩페이지 → 새 페이지 만들기**
2. 콘텐츠 작성 및 디자인
3. **공개 설정** (`is_published: true`)
4. URL 확인: `https://q81d1c.funnely.co.kr/landing/{slug}`

### Step 5: Meta Pixel 동작 확인

#### 5-1. 브라우저 개발자 도구 확인

**Chrome DevTools → Network 탭**:
```
Filter: facebook
→ tr?id=906463148573823 요청 확인
→ Status: 200 OK
```

**Console 탭**:
```javascript
// Pixel이 정상 로드되었는지 확인
fbq // → function이 출력되어야 함

// PageView 이벤트가 전송되었는지 확인
// Console에 "Facebook Pixel PageView event fired" 같은 메시지
```

#### 5-2. Meta Events Manager 확인

1. **Meta Business Manager → Events Manager** 접속
2. 해당 Pixel ID 선택
3. **Test Events 탭** 이동
4. 공개 랜딩페이지 URL 입력
5. **Test Event** 실행

**정상 동작 시 표시**:
```
✅ PageView event received
   - Event Time: 2026-01-08 14:23:45
   - Source: Browser
   - URL: https://q81d1c.funnely.co.kr/landing/example
```

#### 5-3. Facebook Pixel Helper 확장 프로그램

**Chrome Extension 설치**:
- [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)

**확인 방법**:
1. 확장 프로그램 설치
2. 공개 랜딩페이지 접속
3. 확장 프로그램 아이콘 클릭
4. 초록색 알림 → Pixel 정상 작동
5. PageView 이벤트 확인

---

## 🧪 테스트 체크리스트

### ✅ 설정 단계
- [ ] Meta Business Manager에서 Pixel ID 발급 완료
- [ ] dashboard/settings/tracking-pixels 페이지에서 Pixel ID 입력
- [ ] **활성화 토글 ON** 설정
- [ ] 저장 버튼 클릭 및 성공 메시지 확인

### ✅ 랜딩페이지 단계
- [ ] 공개 랜딩페이지 생성 (slug 설정)
- [ ] `is_published: true` 상태 확인
- [ ] 공개 URL 접속 가능 확인

### ✅ Pixel 동작 단계
- [ ] Chrome DevTools Network 탭에서 facebook.com/tr 요청 확인
- [ ] Console에서 `fbq` 함수 존재 확인
- [ ] Facebook Pixel Helper에서 초록색 체크 확인
- [ ] Meta Events Manager에서 Test Event 수신 확인

---

## 🔧 트러블슈팅

### 문제 1: Pixel Helper에서 빨간색 경고

**원인**: Pixel ID가 잘못 입력됨 또는 활성화되지 않음

**해결**:
1. dashboard/settings/tracking-pixels에서 Pixel ID 재확인
2. 활성화 토글이 켜져 있는지 확인
3. 저장 후 페이지 새로고침

### 문제 2: Network 탭에 facebook.com 요청 없음

**원인**: Pixel 스크립트가 HTML에 삽입되지 않음

**디버깅**:
```bash
# 페이지 소스 보기에서 확인
view-source:https://q81d1c.funnely.co.kr/landing/example

# 검색: "facebook-pixel" 또는 "fbq"
# 없으면 → tracking_pixels 설정 확인 필요
```

**해결**:
1. 데이터베이스 직접 확인:
```sql
SELECT * FROM tracking_pixels WHERE company_id = 'YOUR_COMPANY_ID';
```
2. `facebook_pixel_id`와 `is_active` 값 확인
3. 없으면 dashboard에서 재설정

### 문제 3: Events Manager에서 이벤트 수신 안됨

**가능한 원인**:
- Ad blocker 또는 Privacy extension이 Pixel 차단
- 브라우저 쿠키 차단 설정
- Pixel ID 오타 또는 잘못된 ID

**해결**:
1. 시크릿 모드에서 테스트 (확장 프로그램 비활성화)
2. Pixel ID 재확인
3. Meta Business Manager에서 Pixel 상태 확인

### 문제 4: 랜딩페이지가 404 Not Found

**원인**: 랜딩페이지가 공개되지 않았거나 slug가 잘못됨

**해결**:
```sql
-- 랜딩페이지 확인
SELECT slug, is_published, status FROM landing_pages
WHERE company_id = 'YOUR_COMPANY_ID';

-- is_published가 false면 공개 필요
UPDATE landing_pages SET is_published = true WHERE id = 'PAGE_ID';
```

---

## 📊 현재 상태 요약

### 퍼널리 회사 (q81d1c)

| 항목 | 상태 | 비고 |
|-----|------|------|
| Tracking Pixels 레코드 | ❌ 없음 | tracking_pixels 테이블에 레코드 없음 |
| Facebook Pixel ID | ❌ 미설정 | NULL |
| 활성화 상태 | ❌ 미설정 | NULL |
| 공개 랜딩페이지 | ❌ 없음 | landing_pages 테이블에 레코드 없음 |
| Meta 이벤트 수집 | ❌ 불가능 | Pixel 스크립트 미삽입 |

### 필요한 작업

1. **즉시**: dashboard/settings/tracking-pixels에서 Facebook Pixel ID 설정
2. **즉시**: 활성화 토글 ON
3. **이후**: 공개 랜딩페이지 생성 또는 기존 페이지 공개
4. **검증**: Meta Events Manager에서 이벤트 수신 확인

---

## 🎓 구현 원리 설명

### 데이터 흐름

```
1. 사용자가 공개 랜딩페이지 접속
   ↓
2. Next.js 서버 컴포넌트가 데이터 fetch
   → companies 테이블 JOIN tracking_pixels
   ↓
3. PublicLandingPage 컴포넌트 렌더링
   → trackingPixels 데이터 확인
   ↓
4. 조건부 렌더링 평가
   if (trackingPixels?.is_active && trackingPixels?.facebook_pixel_id)
   ↓
5-A. 조건 TRUE → Meta Pixel 스크립트 삽입
     → fbq('init', 'PIXEL_ID')
     → fbq('track', 'PageView')
     ↓
     Meta 서버로 이벤트 전송 ✅

5-B. 조건 FALSE → 스크립트 미삽입
     ↓
     Meta 이벤트 수집 불가 ❌
```

### 조건부 렌더링 코드

```typescript
// src/components/landing-pages/PublicLandingPage.tsx:411-447
const trackingPixels = landingPage.companies?.tracking_pixels?.[0]

// 중요: 두 조건 모두 충족해야 Pixel 삽입됨
{trackingPixels?.is_active && trackingPixels?.facebook_pixel_id && (
  <>
    <Script
      id="facebook-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s){...}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${trackingPixels.facebook_pixel_id}');
          fbq('track', 'PageView');
        `,
      }}
    />
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${trackingPixels.facebook_pixel_id}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  </>
)}
```

---

## 📝 관련 문서

- [Meta Pixel 전체 구현 설계](meta-pixel-tracking-design.md)
- [Meta Pixel 구현 요약](meta-pixel-implementation-summary.md)
- [Meta Pixel 시각적 가이드](meta-pixel-visual-guide.md)

---

## 🚀 다음 단계

### 1단계: Pixel ID 설정 (필수)
```
dashboard/settings/tracking-pixels 접속
→ Facebook Pixel ID 입력: 906463148573823
→ 활성화 토글 ON
→ 저장
```

### 2단계: 랜딩페이지 생성/공개
```
dashboard/landing-pages 접속
→ 새 페이지 만들기 또는 기존 페이지 공개
→ is_published: true 설정
```

### 3단계: 테스트
```
공개 URL 접속
→ Facebook Pixel Helper 확인
→ Meta Events Manager Test Event 실행
→ PageView 이벤트 수신 확인
```

### 4단계: 프로덕션 모니터링
```
Meta Events Manager → 실시간 이벤트 모니터링
→ 전환 이벤트 설정
→ 광고 캠페인 연동
```

---

**작성일**: 2026-01-08
**작성자**: Claude Sonnet 4.5
**상태**: 진단 완료 - 설정 필요

**핵심 문제**: ❌ tracking_pixels 테이블에 Facebook Pixel ID가 설정되지 않음
**해결책**: ✅ dashboard/settings/tracking-pixels에서 Pixel ID 입력 및 활성화
