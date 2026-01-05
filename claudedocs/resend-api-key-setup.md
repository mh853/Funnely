# Resend API Key 설정 가이드

## 로컬 개발 환경 설정

### 1. Resend API Key 발급

1. [Resend.com](https://resend.com) 접속
2. 계정 생성 또는 로그인
3. Dashboard → API Keys 메뉴로 이동
4. "Create API Key" 버튼 클릭
5. API Key 이름 입력 (예: "Funnely Development")
6. API Key 복사 (한 번만 표시되므로 안전한 곳에 보관)

### 2. 로컬 환경 변수 설정

`.env.local` 파일을 열고 다음과 같이 수정하세요:

```bash
# Resend Email Service (https://resend.com)
RESEND_API_KEY=re_your_actual_api_key_here
```

**중요**: `your_resend_api_key_here`를 실제 발급받은 API Key로 교체하세요.

### 3. 개발 서버 재시작

환경 변수 변경 후 반드시 개발 서버를 재시작해야 합니다:

```bash
# 현재 실행 중인 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

### 4. 테스트

1. 브라우저에서 `http://localhost:3000/dashboard/settings/notifications` 접속
2. 이메일 주소 등록
3. "테스트 메일 보내기" 버튼 클릭
4. 등록한 이메일에서 테스트 메일 확인

## Vercel 프로덕션 환경 설정

### 방법 1: Vercel Dashboard (권장)

1. [Vercel Dashboard](https://vercel.com) 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 메뉴
4. **Add New** 버튼 클릭
5. 다음 정보 입력:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_your_actual_api_key_here`
   - **Environment**: Production, Preview, Development 모두 선택
6. **Save** 버튼 클릭
7. 프로젝트 재배포 (자동으로 트리거되거나 수동으로 Redeploy)

### 방법 2: Vercel CLI

```bash
vercel env add RESEND_API_KEY
# 프롬프트에 따라 API Key 입력
# 환경 선택: Production, Preview, Development

# 재배포
vercel --prod
```

## Resend 무료 플랜 제한

- **월 3,000통** 이메일 무료 전송
- 초과 시 자동으로 전송 차단 (오류 발생)
- 무료 플랜으로 충분한지 사용량 모니터링 필요

## 도메인 인증

### 에러: "The funnely.co.kr domain is not verified"

**증상**:
```json
{
  statusCode: 403,
  message: 'The funnely.co.kr domain is not verified. Please, add and verify your domain on https://resend.com/domains',
  name: 'validation_error'
}
```

**원인**: Resend에서 발신 도메인(`funnely.co.kr`)이 인증되지 않음

**해결**:
1. **도메인 인증 완료** (상세 가이드는 별도 문서 참고)
   - [Resend 도메인 인증 가이드](./resend-domain-verification-guide.md) 참고
   - DNS 레코드 추가 (SPF, DKIM, DMARC)
   - Resend Dashboard에서 인증 확인

2. **임시 해결책 (개발 중)**
   - `src/lib/email/send-lead-notification.ts` 파일 수정
   - 발신 이메일을 `onboarding@resend.dev`로 변경
   ```typescript
   from: 'Funnely <onboarding@resend.dev>',
   ```
   - 이 방법은 개발/테스트 목적으로만 사용

⚠️ **프로덕션 배포 전에 반드시 도메인 인증을 완료**해야 합니다!

---

## 트러블슈팅

### 에러: "Resend API key is not configured"

**원인**: 환경 변수가 설정되지 않았거나 서버가 재시작되지 않음

**해결**:
1. `.env.local` 파일에 `RESEND_API_KEY` 존재 여부 확인
2. API Key 값이 `re_`로 시작하는지 확인
3. 개발 서버 재시작 (`npm run dev`)

### 에러: "Invalid API key"

**원인**: API Key가 잘못되었거나 만료됨

**해결**:
1. Resend Dashboard에서 API Key 재확인
2. 새로운 API Key 생성
3. `.env.local` 파일 업데이트
4. 개발 서버 재시작

### 테스트 메일이 도착하지 않음

**원인 1**: 스팸 폴더로 분류됨
- 스팸 폴더 확인

**원인 2**: 발신자 도메인 미인증
- Resend Dashboard에서 도메인 인증 설정
- 개발 중에는 `@resend.dev` 도메인으로 테스트 가능

**원인 3**: API 한도 초과
- Resend Dashboard에서 사용량 확인

## 보안 주의사항

⚠️ **절대 Git에 커밋하지 마세요!**

- `.env.local` 파일은 `.gitignore`에 이미 포함됨
- API Key가 노출되면 즉시 Resend Dashboard에서 Key 삭제
- 새로운 Key 생성 후 모든 환경 변수 업데이트

## 참고 링크

- [Resend 공식 문서](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Vercel 환경 변수 가이드](https://vercel.com/docs/environment-variables)
