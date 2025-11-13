# MediSync 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [Vercel 배포](#vercel-배포)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
5. [배포 후 확인사항](#배포-후-확인사항)
6. [트러블슈팅](#트러블슈팅)

---

## 사전 준비

### 1. 필수 계정
- [Vercel](https://vercel.com) 계정
- [Supabase](https://supabase.com) 프로젝트
- GitHub 계정 (코드 저장용)

### 2. 로컬 빌드 테스트
배포 전 로컬에서 프로덕션 빌드가 정상 동작하는지 확인:

```bash
npm run build
npm start
```

빌드 에러가 없어야 하며, http://localhost:3000에서 정상 동작 확인

---

## Vercel 배포

### 방법 1: Vercel CLI (추천)

1. **Vercel CLI 설치**
```bash
npm install -g vercel
```

2. **로그인**
```bash
vercel login
```

3. **프로젝트 배포**
```bash
# 프로젝트 루트에서
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 2: Vercel 대시보드

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. **"New Project"** 클릭
3. GitHub 저장소 import
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)

---

## 환경 변수 설정

Vercel 대시보드 또는 CLI로 환경 변수 설정:

### Vercel 대시보드에서 설정
1. 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수들 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### CLI로 설정
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 환경 변수 확인
Supabase 대시보드 → **Settings** → **API**에서 확인:
- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 노출 금지)

---

## 데이터베이스 마이그레이션

### Supabase 프로젝트 설정

1. **Supabase 프로젝트 생성**
   - [Supabase Dashboard](https://app.supabase.com) 접속
   - **New Project** 클릭
   - 프로젝트 이름, 비밀번호, 리전 설정
   - 프로젝트 생성 완료 대기 (약 2분)

2. **데이터베이스 마이그레이션 실행**

#### 방법 1: SQL Editor 사용 (추천)
1. Supabase 대시보드 → **SQL Editor**
2. `supabase/migrations/` 폴더의 SQL 파일들을 순서대로 실행:
   - `20250112000000_initial_schema.sql`
   - `20250113000002_disable_users_rls.sql` (RLS 수정)
   - 기타 마이그레이션 파일들

#### 방법 2: Supabase CLI 사용
```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 푸시
supabase db push
```

3. **RLS 정책 확인**
```sql
-- users 테이블 RLS 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';
```

---

## 배포 후 확인사항

### 1. 기본 기능 테스트

#### 회원가입/로그인
1. 배포된 URL 접속
2. 회원가입 페이지에서 테스트 계정 생성
3. 로그인 확인

#### 대시보드 접근
1. 로그인 후 대시보드 페이지 로딩 확인
2. 사이드바 메뉴 네비게이션 확인
3. 병원 정보 표시 확인

#### 광고 계정 관리
1. 광고 계정 추가 페이지 접근
2. Meta/Kakao/Google 계정 등록 시도
3. 계정 목록 표시 확인

#### 캠페인 관리
1. 캠페인 생성 페이지 접근
2. 테스트 캠페인 생성
3. 캠페인 목록 및 상세 페이지 확인

#### 리포트 생성
1. 리포트 페이지 접근
2. Excel/PDF 리포트 생성 테스트
3. 다운로드 확인

#### 팀 관리
1. 팀 관리 페이지 접근
2. 팀원 초대 기능 테스트
3. 권한 변경 기능 테스트

### 2. 성능 확인

```bash
# Lighthouse 점수 확인
npx lighthouse https://your-domain.vercel.app --view
```

**목표 점수:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### 3. 에러 로그 확인

#### Vercel 로그
- Vercel 대시보드 → 프로젝트 → **Logs**
- 런타임 에러 확인

#### Supabase 로그
- Supabase 대시보드 → **Logs** → **Postgres Logs**
- 데이터베이스 에러 확인

---

## 트러블슈팅

### 문제 1: 환경 변수 로딩 안됨
**증상**: `NEXT_PUBLIC_SUPABASE_URL is not defined` 에러

**해결**:
1. Vercel 대시보드에서 환경 변수 확인
2. 변수 이름 정확히 일치하는지 확인
3. 재배포: `vercel --prod`

### 문제 2: RLS 정책 에러
**증상**: `infinite recursion detected in policy for relation "users"` 에러

**해결**:
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### 문제 3: 빌드 실패
**증상**: Vercel 빌드 중 타입 에러

**해결**:
```bash
# 로컬에서 타입 체크
npm run build

# 타입 에러 수정 후 재배포
```

### 문제 4: 데이터베이스 연결 실패
**증상**: 페이지 로딩 시 데이터를 불러올 수 없음

**확인사항**:
1. Supabase URL이 올바른지 확인
2. API 키가 올바른지 확인
3. Supabase 프로젝트가 활성 상태인지 확인

---

## 프로덕션 최적화

### 1. 이미지 최적화
```jsx
// Next.js Image 컴포넌트 사용
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // LCP 개선
/>
```

### 2. 코드 스플리팅
```jsx
// 동적 import 사용
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('@/components/Chart'), {
  ssr: false, // 클라이언트 전용 렌더링
  loading: () => <p>Loading...</p>
})
```

### 3. 캐싱 전략
```ts
// API 라우트에서 캐싱
export const revalidate = 60 // 60초마다 재검증
```

---

## 보안 체크리스트

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경 변수로만 관리 (코드에 노출 금지)
- [ ] RLS 정책 적용 (프로덕션에서는 RLS 활성화 권장)
- [ ] HTTPS 강제 (Vercel 자동 적용)
- [ ] CORS 설정 확인
- [ ] 민감한 정보 로그 출력 금지

---

## 모니터링 설정

### Vercel Analytics
1. Vercel 대시보드 → **Analytics** 탭
2. 무료 플랜 활성화
3. 페이지 로드 시간, 방문자 수 모니터링

### Supabase Monitoring
1. Supabase 대시보드 → **Database** → **Performance**
2. 쿼리 성능 모니터링
3. 느린 쿼리 최적화

---

## 백업 전략

### 1. 데이터베이스 백업
```bash
# 수동 백업 (Supabase CLI)
supabase db dump -f backup.sql
```

### 2. 자동 백업
- Supabase Pro 플랜: 자동 백업 활성화
- 또는 cron job으로 정기 백업 설정

---

## 다음 단계

배포 완료 후:
1. ✅ 사용자 피드백 수집
2. ✅ 성능 모니터링
3. ✅ 정기 보안 업데이트
4. ✅ 새로운 기능 추가 계획

---

## 참고 자료

- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [MediSync 구현 상태](./IMPLEMENTATION_STATUS.md)
