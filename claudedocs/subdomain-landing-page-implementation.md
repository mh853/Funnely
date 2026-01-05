# 서브도메인 기반 랜딩페이지 시스템 구현 가이드

## 📋 구현 완료 사항

### ✅ 1. 미들웨어 구현 (`middleware.ts`)
**위치**: `/Users/mh.c/medisync/middleware.ts`

**기능**:
- 서브도메인 파싱 및 내부 경로 리라이트
- 기존 쿼리 파라미터 형식 (`?ref=`) → 서브도메인 형식으로 301 리다이렉트
- 개발 환경 (localhost) 처리

**처리 로직**:
```
입력: q81d1c.funnely.co.kr/landing/dental-promo
처리: /{companyShortId}/landing/{slug}로 내부 리라이트
결과: q81d1c.funnely.co.kr/landing/dental-promo (외부 URL 변화 없음)
```

**레거시 호환성**:
```
입력: funnely.co.kr/landing/dental?ref=q81d1c
처리: 301 Permanent Redirect
결과: q81d1c.funnely.co.kr/landing/dental
```

---

### ✅ 2. 동적 라우팅 구조

#### A. 랜딩페이지 라우팅
**위치**: `/Users/mh.c/medisync/src/app/[companyShortId]/landing/[slug]/page.tsx`

**기능**:
1. `companyShortId`로 회사 조회 (companies.short_id)
2. `company_id` + `slug`로 랜딩페이지 조회
3. 해당 회사의 `tracking_pixels` 데이터 주입
4. SEO 메타데이터 생성

**주요 변경사항**:
```typescript
// 기존: landing_page.companies.tracking_pixels
// 신규: company.tracking_pixels (서브도메인 기반)

const { data: company } = await supabase
  .from('companies')
  .select(`id, short_id, name, tracking_pixels(*)`)
  .eq('short_id', companyShortId)
  .single()
```

#### B. 완료 페이지 라우팅
**위치**: `/Users/mh.c/medisync/src/app/[companyShortId]/landing/completed/[slug]/page.tsx`

**기능**:
- 서브도메인 기반 완료 페이지 표시
- 회사별 성공 메시지 및 배경 이미지 지원

---

### ✅ 3. URL 생성 헬퍼 함수
**위치**: `/Users/mh.c/medisync/src/lib/utils/landing-page-url.ts`

**제공 함수**:

#### `generateLandingPageURL(companyShortId, slug)`
```typescript
generateLandingPageURL('q81d1c', 'dental-promo')
// 결과: 'https://q81d1c.funnely.co.kr/landing/dental-promo'
```

#### `generateCompletionPageURL(companyShortId, slug)`
```typescript
generateCompletionPageURL('q81d1c', 'dental-promo')
// 결과: 'https://q81d1c.funnely.co.kr/landing/completed/dental-promo'
```

#### `generateShareableURL(companyShortId, slug, utmParams)`
```typescript
generateShareableURL('q81d1c', 'dental', {
  utm_source: 'facebook',
  utm_campaign: 'summer2024'
})
// 결과: 'https://q81d1c.funnely.co.kr/landing/dental?utm_source=facebook&utm_campaign=summer2024'
```

#### `parseSubdomain(hostname)`
```typescript
parseSubdomain('q81d1c.funnely.co.kr')  // Returns: 'q81d1c'
parseSubdomain('funnely.co.kr')         // Returns: null
```

---

## 🚀 사용자가 직접 해야 할 작업

### 1️⃣ DNS 와일드카드 설정 (필수)

#### Vercel 사용 시
1. **Vercel 대시보드** → 프로젝트 Settings → Domains 이동
2. 도메인 추가: `*.funnely.co.kr`
3. Vercel이 제공하는 DNS 레코드 복사

#### DNS 제공업체 (예: Cloudflare, GoDaddy, 가비아 등)
1. DNS 관리 페이지 이동
2. 새 레코드 추가:
   ```
   타입: CNAME
   이름: *
   값: cname.vercel-dns.com (또는 Vercel이 제공한 값)
   TTL: Auto (또는 3600)
   ```

#### 설정 확인 방법
```bash
# 터미널에서 확인
nslookup q81d1c.funnely.co.kr
nslookup test123.funnely.co.kr

# 응답에 Vercel IP 주소가 나오면 성공
```

⚠️ **주의사항**:
- DNS 전파 시간: 최대 24-48시간 소요 가능 (보통 10-30분)
- 설정 전에는 서브도메인 접속 불가
- 메인 도메인 (`funnely.co.kr`)은 별도로 유지

---

### 2️⃣ 환경 변수 설정 (선택)

`.env.local` 파일에 추가:
```bash
# 프로덕션 도메인 (프로토콜 제외)
NEXT_PUBLIC_DOMAIN=funnely.co.kr
```

⚠️ **주의**: 기본값은 `funnely.co.kr`이므로, 다른 도메인을 사용할 경우에만 설정 필요

---

### 3️⃣ Vercel 프로젝트 설정 확인

1. **Vercel 대시보드** → 프로젝트 Settings → General
2. **Framework Preset**: Next.js 확인
3. **Build & Development Settings**:
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install` (또는 `yarn install`)

---

### 4️⃣ 대시보드 UI 업데이트 (선택)

현재 대시보드에서는 `?ref=` 형식의 URL을 표시합니다. 서브도메인 URL로 변경하려면:

**수정 파일**: `src/components/landing-pages/LandingPageNewForm.tsx` 등

**변경 예시**:
```typescript
// 기존
import { getLandingPageBaseUrl } from '@/lib/config'
const url = `${getLandingPageBaseUrl()}/${slug}?ref=${companyShortId}`

// 신규
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'
const url = generateLandingPageURL(companyShortId, slug)
```

---

## 📊 URL 구조 비교

| 항목 | 기존 (레거시) | 신규 (서브도메인) |
|------|--------------|-------------------|
| **랜딩페이지** | `funnely.co.kr/landing/slug?ref=q81d1c` | `q81d1c.funnely.co.kr/landing/slug` |
| **완료 페이지** | `funnely.co.kr/completed/slug?ref=q81d1c` | `q81d1c.funnely.co.kr/landing/completed/slug` |
| **회사 구분** | 쿼리 파라미터 | 서브도메인 |
| **픽셀 발화** | ref 파라미터 기반 | 서브도메인 기반 (자동) |
| **SEO** | 불리 | 우수 |
| **호환성** | - | 자동 리다이렉트 지원 |

---

## 🧪 테스트 방법

### 로컬 개발 환경 테스트
로컬에서는 서브도메인이 작동하지 않습니다. 다음 방법으로 테스트:

**Option 1: `/etc/hosts` 파일 수정** (Mac/Linux)
```bash
# /etc/hosts 파일에 추가
127.0.0.1 q81d1c.localhost
127.0.0.1 test123.localhost
```

그 후 브라우저에서 접속:
```
http://q81d1c.localhost:3000/landing/your-slug
```

**Option 2: ngrok 사용** (권장)
```bash
# ngrok 설치 후
ngrok http 3000

# 제공된 URL에 서브도메인 추가하여 테스트
https://q81d1c.your-ngrok-url.ngrok.io/landing/your-slug
```

### 프로덕션 환경 테스트
DNS 설정 후:
```bash
# 1. DNS 전파 확인
nslookup q81d1c.funnely.co.kr

# 2. 브라우저에서 접속
https://q81d1c.funnely.co.kr/landing/your-slug

# 3. 레거시 URL 리다이렉트 확인
https://funnely.co.kr/landing/your-slug?ref=q81d1c
→ 자동 리다이렉트 → https://q81d1c.funnely.co.kr/landing/your-slug
```

---

## 🔍 트러블슈팅

### 문제 1: 서브도메인 접속 시 404 오류
**원인**: DNS 와일드카드 설정이 완료되지 않음
**해결**:
1. DNS 설정 재확인: `*.funnely.co.kr → Vercel CNAME`
2. DNS 전파 대기 (최대 48시간)
3. `nslookup` 명령으로 DNS 확인

### 문제 2: Vercel 빌드 실패
**원인**: 미들웨어 파일 문법 오류 또는 파일 경로 문제
**해결**:
```bash
# 로컬에서 빌드 테스트
npm run build

# 오류 메시지 확인 후 수정
```

### 문제 3: 픽셀이 발화되지 않음
**원인**: `company.tracking_pixels` 데이터 누락
**해결**:
1. Supabase에서 `tracking_pixels` 테이블 확인
2. 해당 회사의 픽셀 ID가 올바르게 등록되어 있는지 확인

### 문제 4: 레거시 URL 리다이렉트 안 됨
**원인**: 미들웨어 매처 설정 문제
**해결**:
`middleware.ts`의 `config.matcher`에 `/landing/:path*`, `/completed/:path*` 포함 확인

---

## 📝 체크리스트

구현 후 다음 항목을 확인하세요:

### DNS 설정
- [ ] `*.funnely.co.kr` 와일드카드 CNAME 레코드 추가
- [ ] Vercel Domains 설정에서 와일드카드 도메인 추가
- [ ] DNS 전파 확인 (`nslookup` 명령 사용)

### 코드 배포
- [ ] `middleware.ts` 파일 존재 확인
- [ ] `app/[companyShortId]/landing/[slug]/page.tsx` 존재 확인
- [ ] `lib/utils/landing-page-url.ts` 존재 확인
- [ ] Vercel에 배포 완료

### 기능 테스트
- [ ] 서브도메인 URL 접속 테스트: `https://q81d1c.funnely.co.kr/landing/test`
- [ ] 레거시 URL 리다이렉트 테스트: `https://funnely.co.kr/landing/test?ref=q81d1c`
- [ ] 완료 페이지 접속 테스트: `https://q81d1c.funnely.co.kr/landing/completed/test`
- [ ] 픽셀 발화 확인 (Facebook Pixel Helper, Google Tag Assistant 사용)

### 데이터베이스
- [ ] `companies.short_id` 컬럼에 값이 모두 채워져 있는지 확인
- [ ] `landing_pages.slug` 중복 없이 고유한지 확인
- [ ] `tracking_pixels` 테이블에 회사별 픽셀 ID 등록 확인

---

## 🎯 다음 단계 (선택 사항)

### 1. 대시보드 UI 업데이트
- 랜딩페이지 목록 및 생성 폼에서 서브도메인 URL 표시
- URL 복사 버튼 기능 추가

### 2. 분석 대시보드 개선
- 회사별 픽셀 이벤트 통계 표시
- 서브도메인별 방문 통계 분석

### 3. 커스텀 도메인 지원
- 각 회사가 자체 도메인 사용 가능 (예: `dental-clinic.com`)
- CNAME 레코드 설정 가이드 제공

---

## 📞 지원

문제 발생 시 확인할 사항:
1. Vercel 빌드 로그 확인
2. 브라우저 개발자 도구 → Network 탭에서 리다이렉트 확인
3. DNS 전파 상태 확인: https://dnschecker.org

---

**구현 완료일**: 2026-01-05
**버전**: 1.0.0
