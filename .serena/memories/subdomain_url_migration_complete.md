# 서브도메인 URL 마이그레이션 완료

## 완료 날짜
2026-01-05

## 변경된 파일 (8개)

### 컴포넌트 (6개)
1. `src/components/landing-pages/LandingPageTableRow.tsx` - generateLandingPageURL 사용
2. `src/components/landing-pages/LandingPageCard.tsx` - generateLandingPageURL 사용, companyShortId prop 추가
3. `src/components/landing-pages/LandingPageMobileCard.tsx` - generateLandingPageURL 사용
4. `src/components/landing-pages/LandingPageNewForm/sections/DeploymentSection.tsx` - 서브도메인 미리보기 URL, UI 안내 문구 개선
5. `src/components/landing-pages/RefLinkCopyButton.tsx` - baseUrl prop 제거, 서브도메인 URL 복사, 툴팁 개선
6. `src/app/dashboard/landing-pages/[id]/page.tsx` - 상세 페이지 서브도메인 URL 표시

### 유틸리티 (1개)
7. `src/lib/config.ts` - getLandingPageUrl, getLandingPageBaseUrl deprecated 표시

### 문서 (1개)
8. `claudedocs/subdomain-url-migration-summary.md` - 마이그레이션 완료 보고서

## URL 형식 변경
- Before: `https://funnely.co.kr/landing/dental-promo?ref=q81d1c`
- After: `https://q81d1c.funnely.co.kr/landing/dental-promo`

## 호환성
- 레거시 URL은 middleware가 자동으로 301 리다이렉트
- 회사 정보 없을 때는 fallback URL 사용

## 결과
모든 대시보드 컴포넌트가 서브도메인 URL 형식을 사용하도록 성공적으로 전환됨
