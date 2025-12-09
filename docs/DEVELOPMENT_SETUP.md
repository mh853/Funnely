# 개발 환경 설정 가이드

## 필수 요구사항

### 소프트웨어
- **Node.js**: v18.17.0 이상 (v20 권장)
- **pnpm**: v8.0.0 이상 (또는 npm, yarn)
- **Git**: 최신 버전
- **Supabase CLI**: v1.100.0 이상 (선택사항, 로컬 개발 시 권장)

---

## 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
cd ~/funnely

# 의존성 설치
npm install
# 또는
pnpm install
```

---

## 2. Supabase 프로젝트 설정

### 2.1 Supabase 계정 및 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 및 회원가입
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `funnely`
   - Database Password: 안전한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 권장
4. 프로젝트 생성 완료 (약 2분 소요)

### 2.2 환경 변수 설정

1. 프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

2. Supabase Dashboard에서 정보 복사:
   - Settings → API → Project URL
   - Settings → API → Project API keys → `anon` `public`
   - Settings → API → Project API keys → `service_role` `secret`

3. `.env.local` 파일 수정:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 나머지 설정은 광고 플랫폼 연동 후 추가
```

### 2.3 데이터베이스 마이그레이션

#### 방법 1: Supabase CLI 사용 (권장)

```bash
# Supabase CLI 설치
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

#### 방법 2: SQL Editor 사용

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20250112000000_initial_schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기 및 실행

---

## 3. 로컬 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 확인
# http://localhost:3000
```

---

## 4. Supabase 로컬 개발 환경 (선택사항)

로컬에서 Supabase를 실행하여 개발할 수 있습니다.

```bash
# Supabase 로컬 시작
supabase start

# 로컬 Supabase URL 및 Key 확인
# .env.local 파일을 로컬 설정으로 변경

# 마이그레이션 적용
supabase db reset

# 로컬 Supabase 중지
supabase stop
```

---

## 5. 광고 플랫폼 API 개발자 계정 설정

실제 광고 플랫폼 연동을 위해서는 각 플랫폼의 개발자 계정이 필요합니다.
자세한 내용은 [광고 플랫폼 연동 가이드](./AD_PLATFORM_INTEGRATION.md)를 참조하세요.

### 5.1 Meta (Facebook) Ads

1. [developers.facebook.com](https://developers.facebook.com) 가입
2. 앱 생성 (Business 타입)
3. Marketing API 추가
4. 앱 검수 진행 (2-4주 소요)

`.env.local`에 추가:
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

### 5.2 Kakao Moment

1. [developers.kakao.com](https://developers.kakao.com) 가입
2. 애플리케이션 등록
3. 카카오 모먼트 API 신청
4. 비즈니스 인증 (1-2주 소요)

`.env.local`에 추가:
```env
KAKAO_CLIENT_ID=your_client_id
KAKAO_CLIENT_SECRET=your_client_secret
```

### 5.3 Google Ads

1. [console.cloud.google.com](https://console.cloud.google.com) 프로젝트 생성
2. Google Ads API 활성화
3. OAuth 2.0 클라이언트 ID 생성
4. Developer Token 신청 (1-3주 소요)

`.env.local`에 추가:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_token
```

---

## 6. 데이터베이스 테스트 데이터 생성

개발 중에는 테스트 데이터를 사용할 수 있습니다.

```sql
-- Supabase SQL Editor에서 실행

-- 테스트 병원 생성
INSERT INTO hospitals (id, name, business_number, address, phone)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '메디씽크 테스트 병원',
  '123-45-67890',
  '서울시 강남구 테헤란로 1',
  '02-1234-5678'
);

-- 참고: 사용자는 Supabase Auth를 통해 생성 후 users 테이블에 추가해야 합니다
```

---

## 7. VSCode 확장 프로그램 (권장)

개발 효율을 위해 다음 확장 프로그램을 설치하세요:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 8. 개발 워크플로우

### 8.1 브랜치 전략

```bash
# 새 기능 개발
git checkout -b feature/ad-platform-meta

# 작업 완료 후 커밋
git add .
git commit -m "feat: Meta Ads 연동 구현"

# 푸시
git push origin feature/ad-platform-meta
```

### 8.2 코드 스타일

프로젝트는 ESLint와 Prettier를 사용합니다:

```bash
# Lint 검사
npm run lint

# 자동 포맷팅 (VSCode에서 저장 시 자동)
```

### 8.3 타입 검사

```bash
# TypeScript 타입 검사
npx tsc --noEmit
```

---

## 9. 배포

### 9.1 Vercel 배포 (권장)

1. [vercel.com](https://vercel.com) 가입
2. GitHub 저장소 연결
3. 프로젝트 Import
4. 환경 변수 설정:
   - Supabase URL 및 Keys
   - 광고 플랫폼 API Keys
5. Deploy 클릭

### 9.2 환경 분리

```yaml
Development:
  URL: http://localhost:3000
  Supabase: 로컬 또는 개발 프로젝트

Staging:
  URL: medisync-staging.vercel.app
  Supabase: 스테이징 프로젝트

Production:
  URL: medisync.com
  Supabase: 프로덕션 프로젝트
```

---

## 10. 트러블슈팅

### 문제: Supabase 연결 에러

```
Error: Invalid Supabase URL
```

**해결**: `.env.local` 파일의 URL이 올바른지 확인

### 문제: RLS 정책으로 데이터 조회 안 됨

```
Error: new row violates row-level security policy
```

**해결**:
1. Supabase Dashboard → Authentication에서 사용자 생성
2. `users` 테이블에 해당 사용자 추가
3. `hospital_id` 연결 확인

### 문제: 마이그레이션 실패

```
Error: relation "hospitals" already exists
```

**해결**:
```bash
# 로컬 Supabase 리셋
supabase db reset

# 또는 Supabase Dashboard에서 수동 삭제 후 재실행
```

---

## 11. 다음 단계

1. ✅ 개발 환경 설정 완료
2. 📚 [프로젝트 개요](./PROJECT_OVERVIEW.md) 읽기
3. 🗄️ [데이터베이스 스키마](./DATABASE_SCHEMA.md) 이해
4. 🔌 [광고 플랫폼 연동](./AD_PLATFORM_INTEGRATION.md) 시작
5. 💻 코딩 시작!

---

## 도움이 필요하신가요?

- 프로젝트 문서: `/docs` 폴더
- 이슈 리포트: GitHub Issues
- 이메일: support@medisync.com

**마지막 업데이트**: 2025-11-12
