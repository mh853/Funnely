# 광고 플랫폼 연동 설정 가이드

MediSync에서 Meta Ads, Kakao Moment, Google Ads 광고 플랫폼을 연동하기 위한 설정 가이드입니다.

## 목차

1. [Meta Ads 설정](#meta-ads-설정)
2. [Kakao Moment 설정](#kakao-moment-설정)
3. [Google Ads 설정](#google-ads-설정)
4. [환경 변수 설정](#환경-변수-설정)

---

## Meta Ads 설정

### 1. Meta for Developers 계정 생성

1. [Meta for Developers](https://developers.facebook.com/) 접속
2. Facebook 계정으로 로그인
3. 개발자 계정 등록

### 2. 앱 생성

1. **내 앱** → **앱 만들기** 클릭
2. 앱 유형 선택: **비즈니스**
3. 앱 이름 입력: `MediSync`
4. 앱 연락처 이메일 입력
5. **앱 만들기** 클릭

### 3. Marketing API 추가

1. 앱 대시보드에서 **제품 추가** 선택
2. **Marketing API** 찾아서 **설정** 클릭
3. 시작하기 가이드 따라하기

### 4. OAuth 설정

1. **설정** → **기본 설정** 이동
2. **앱 ID**와 **앱 시크릿** 복사 (환경 변수에 사용)
3. **앱 도메인** 추가:
   ```
   localhost (개발)
   yourdomain.com (프로덕션)
   ```
4. **개인정보처리방침 URL** 입력
5. **서비스 약관 URL** 입력

### 5. 리디렉션 URI 설정

1. **제품** → **Marketing API** → **도구** 이동
2. **유효한 OAuth 리디렉션 URI** 추가:
   ```
   http://localhost:3000/auth/callback/meta (개발)
   https://yourdomain.com/auth/callback/meta (프로덕션)
   ```

### 6. 앱 검수 제출

1. **앱 검수** 메뉴 이동
2. 필요한 권한 요청:
   - `ads_management` - 광고 관리
   - `ads_read` - 광고 읽기
3. 스크린샷 및 사용 설명 제출
4. 검수 제출 (승인까지 2-4주 소요)

### 환경 변수

```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

---

## Kakao Moment 설정

### 1. Kakao Developers 계정 생성

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 카카오 계정으로 로그인
3. 개발자 등록

### 2. 애플리케이션 추가

1. **내 애플리케이션** → **애플리케이션 추가하기** 클릭
2. 앱 이름 입력: `MediSync`
3. 사업자명 입력
4. **저장** 클릭

### 3. 플랫폼 설정

1. **앱 설정** → **플랫폼** 이동
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 입력:
   ```
   http://localhost:3000 (개발)
   https://yourdomain.com (프로덕션)
   ```

### 4. Kakao 로그인 활성화

1. **제품 설정** → **카카오 로그인** 이동
2. **활성화 설정** ON
3. **Redirect URI** 등록:
   ```
   http://localhost:3000/auth/callback/kakao (개발)
   https://yourdomain.com/auth/callback/kakao (프로덕션)
   ```

### 5. Moment API 권한 신청

1. **제품 설정** → **Kakao Moment** 이동
2. **사용 신청** 클릭
3. 비즈니스 정보 입력:
   - 사업자 등록증
   - 서비스 URL
   - 광고 운영 계획
4. 심사 대기 (승인까지 1-2주 소요)

### 환경 변수

```env
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_JAVASCRIPT_KEY=your_javascript_key
```

---

## Google Ads 설정

### 1. Google Cloud 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **프로젝트 만들기** 클릭
3. 프로젝트 이름: `MediSync`
4. **만들기** 클릭

### 2. Google Ads API 활성화

1. **API 및 서비스** → **라이브러리** 이동
2. "Google Ads API" 검색
3. **Google Ads API** 선택
4. **사용 설정** 클릭

### 3. OAuth 2.0 클라이언트 ID 만들기

1. **API 및 서비스** → **사용자 인증 정보** 이동
2. **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `MediSync Web Client`
5. **승인된 리디렉션 URI** 추가:
   ```
   http://localhost:3000/auth/callback/google (개발)
   https://yourdomain.com/auth/callback/google (프로덕션)
   ```
6. **만들기** 클릭
7. **클라이언트 ID**와 **클라이언트 보안 비밀** 복사

### 4. Developer Token 신청

1. [Google Ads Manager Account](https://ads.google.com/) 접속
2. **도구 및 설정** → **API 센터** 이동
3. **Developer Token** 신청
4. 승인 대기 (테스트 토큰은 즉시 발급, 프로덕션은 1-3주 소요)

### 5. OAuth 동의 화면 구성

1. **OAuth 동의 화면** 메뉴 이동
2. 사용자 유형: **외부** 선택
3. 앱 정보 입력:
   - 앱 이름: `MediSync`
   - 사용자 지원 이메일
   - 개발자 연락처 정보
4. 범위 추가:
   - `https://www.googleapis.com/auth/adwords`
5. **저장 후 계속** 클릭

### 환경 변수

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DEVELOPER_TOKEN=your_developer_token
```

---

## UI를 통한 API 인증 정보 설정

### 설정 페이지 접속

MediSync는 각 병원별로 독립적인 API 인증 정보를 관리할 수 있도록 UI를 제공합니다.

1. MediSync 대시보드 로그인
2. **설정** 메뉴 클릭
3. **광고 플랫폼 API 연동 설정** 카드 클릭
4. 또는 직접 URL 접속: `/dashboard/settings/api-credentials`

### 플랫폼별 인증 정보 입력

각 플랫폼 카드를 클릭하여 확장한 후:

**Meta Ads 설정:**
- App ID 입력
- App Secret 입력
- 저장 버튼 클릭

**Kakao Moment 설정:**
- REST API Key 입력
- JavaScript Key 입력
- 저장 버튼 클릭

**Google Ads 설정:**
- Client ID 입력
- Client Secret 입력
- Developer Token 입력
- 저장 버튼 클릭

### 보안 정보

- 모든 API 인증 정보는 암호화되어 데이터베이스에 저장됩니다
- 병원별로 독립적인 인증 정보를 관리합니다
- 권한이 있는 사용자만 설정할 수 있습니다:
  - 병원 관리자 (hospital_owner)
  - 병원 어드민 (hospital_admin)
  - 마케팅 매니저 (marketing_manager)

---

## 연동 테스트

### 1. 개발 환경에서 테스트

1. 애플리케이션 실행: `npm run dev`
2. `/dashboard/ad-accounts` 페이지 접속
3. **광고 계정 연동** 버튼 클릭
4. 플랫폼 선택 (Meta, Kakao, Google)
5. OAuth 인증 플로우 진행
6. 계정 연동 확인

### 2. 테스트 계정 사용

각 플랫폼은 테스트 계정을 제공합니다:

- **Meta**: [테스트 사용자](https://developers.facebook.com/docs/development/build-and-test/test-users/) 생성
- **Kakao**: 개발자 계정으로 테스트
- **Google**: [테스트 계정](https://developers.google.com/google-ads/api/docs/first-call/test-accounts) 사용

### 3. 프로덕션 배포 전 체크리스트

- [ ] 모든 앱이 프로덕션 모드로 승인됨
- [ ] 리디렉션 URI에 프로덕션 도메인 추가
- [ ] 환경 변수가 Vercel/호스팅 환경에 설정됨
- [ ] HTTPS 적용 확인
- [ ] 개인정보처리방침 및 서비스 약관 페이지 작성
- [ ] 토큰 갱신 로직 테스트 완료

---

## 문제 해결

### Meta Ads

**문제**: "Invalid OAuth redirect URI"
**해결**: Facebook 앱 설정에서 정확한 리디렉션 URI 확인

**문제**: "This app is in development mode"
**해결**: 앱 검수 완료 후 라이브 모드로 전환 필요

### Kakao Moment

**문제**: "KOE006: invalid redirect_uri"
**해결**: 카카오 앱 설정에서 Redirect URI 정확히 입력

**문제**: "Moment API 권한 없음"
**해결**: 비즈니스 인증 및 Moment API 사용 승인 필요

### Google Ads

**문제**: "redirect_uri_mismatch"
**해결**: Google Cloud Console에서 승인된 리디렉션 URI 확인

**문제**: "Developer token not approved"
**해결**: 테스트 토큰 사용 또는 승인 대기

---

## 참고 자료

- [Meta Marketing API 문서](https://developers.facebook.com/docs/marketing-apis)
- [Kakao Moment API 문서](https://developers.kakao.com/docs/latest/ko/kakaomoment/common)
- [Google Ads API 문서](https://developers.google.com/google-ads/api/docs/start)
- [Next.js 환경 변수](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## 다음 단계

환경 변수 설정이 완료되면:

1. **캠페인 관리 기능** 구현
2. **성과 데이터 동기화** 설정
3. **리포트 대시보드** 개발
4. **알림 시스템** 구축
