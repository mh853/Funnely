# 문제 해결 가이드 (Troubleshooting)

## 인증 관련 문제

### 회원가입이 동작하지 않는 문제 (해결됨 - 2025-11-12)

**증상**:
- 회원가입 폼에서 제출 버튼을 눌러도 아무 반응이 없음
- 사용자가 생성되지 않음
- 콘솔에 `GET /sw.js 404` 에러 (무관한 에러)

**원인**:
1. 데이터베이스 스키마의 `users` 테이블이 `hospital_id` 외래키를 필수로 요구
2. 기존 클라이언트 사이드 회원가입 로직이 `auth.users`만 생성하고 `public.hospitals`와 `public.users`는 생성하지 않음
3. Row Level Security (RLS) 정책이 유효한 hospital_id 없이는 users 테이블에 삽입을 허용하지 않음

**해결 방법**:
서버사이드 API 라우트를 생성하여 트랜잭션 방식으로 처리:

1. **API 라우트 생성**: `src/app/api/auth/signup/route.ts`
   ```typescript
   // 1. auth.users 생성 (Supabase Auth)
   // 2. hospitals 테이블에 병원 레코드 생성
   // 3. public.users 테이블에 사용자 레코드 생성 (hospital_id 연결)
   // 4. 에러 발생 시 모든 변경사항 롤백
   ```

2. **회원가입 페이지 수정**: `src/app/auth/signup/page.tsx`
   ```typescript
   // 직접 supabase.auth.signUp() 호출 대신
   // /api/auth/signup POST 요청으로 변경
   ```

**핵심 코드**:

`src/app/api/auth/signup/route.ts`의 주요 로직:
```typescript
// 1. Auth 사용자 생성
const { data: authData } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true
})

// 2. 병원 생성
const { data: hospitalData } = await supabase
  .from('hospitals')
  .insert({ name: hospitalName || `${fullName}의 병원` })
  .single()

// 3. 사용자 프로필 생성
await supabase.from('users').insert({
  id: authData.user.id,
  hospital_id: hospitalData.id,
  role: 'hospital_owner'
})
```

**테스트 방법**:
1. 개발 서버 재시작: `npm run dev`
2. http://localhost:3000/auth/signup 접속
3. 회원가입 폼 작성 및 제출
4. 성공 시 자동으로 대시보드로 리디렉션

---

### "병원 정보 생성에 실패했습니다" 오류 (해결됨 - 2025-11-13)

**증상**:
- 회원가입 폼 제출 시 "가입 중..." 표시 후 "병원 정보 생성에 실패했습니다" 오류 발생
- 회원가입이 완료되지 않음

**원인**:
- 데이터베이스 스키마에서 `hospitals.business_number` 컬럼이 `NOT NULL` 제약조건을 가지고 있음
- 회원가입 시 사업자번호를 입력하지 않으면 NULL 값이 전달되어 제약조건 위반

**해결 방법**:

**방법 1: 임시 사업자번호 생성 (✅ 현재 적용됨)**

이미 코드가 수정되어 임시 고유 번호를 자동 생성합니다:
```typescript
// src/app/api/auth/signup/route.ts (73번 라인)
const tempBusinessNumber = businessNumber || `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`
```

**방법 2: 데이터베이스 스키마 수정 (권장 - 장기 해결책)**

Supabase SQL Editor에서 다음 SQL 실행:
```sql
-- business_number를 선택적(nullable)으로 변경
ALTER TABLE hospitals
  ALTER COLUMN business_number DROP NOT NULL;

-- 기존 TEMP 번호를 NULL로 정리 (선택사항)
UPDATE hospitals
SET business_number = NULL
WHERE business_number LIKE 'TEMP-%';
```

마이그레이션 파일: [supabase/migrations/20250112000001_fix_business_number.sql](supabase/migrations/20250112000001_fix_business_number.sql)

**테스트 방법**:
1. 개발 서버가 실행 중인지 확인 (코드 수정이 핫 리로드됨)
2. 브라우저에서 회원가입 재시도
3. 성공 시 대시보드로 리디렉션 확인
4. Supabase Dashboard → Table Editor → hospitals 테이블에서 `TEMP-` 시작하는 business_number 확인

**장기 개선사항**:
- 온보딩 페이지에서 실제 사업자번호 입력받기
- 병원 설정 페이지에서 TEMP 번호를 실제 번호로 업데이트하는 기능 추가

---

## 데이터베이스 관련 문제

### SQL 마이그레이션 실행 시 "type already exists" 에러

**증상**:
```
ERROR: 42710: type "user_role" already exists
```

**원인**:
- 마이그레이션 SQL을 이미 한 번 실행했음
- PostgreSQL은 이미 존재하는 타입을 다시 생성하려고 하면 에러 발생

**해결 방법**:

**방법 1: 에러 무시하고 계속 진행**
- 이미 테이블이 생성되어 있다면 정상 상태
- 다른 테이블들도 이미 생성되어 있을 가능성이 높음
- Supabase SQL Editor에서 테이블 확인:
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public';
  ```

**방법 2: 조건부 생성으로 마이그레이션 파일 수정**
```sql
-- Type 생성 시 존재 여부 확인
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

**방법 3: 완전 초기화 (개발 환경에서만)**
```sql
-- ⚠️ 주의: 모든 데이터가 삭제됩니다!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- 그 다음 마이그레이션 SQL 전체 실행
```

---

## 환경 변수 관련 문제

### Supabase 연결 오류

**증상**:
```
Error: supabase url and anon key are required
```

**해결 방법**:
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 환경 변수가 올바르게 설정되어 있는지 확인:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. 개발 서버 재시작: `npm run dev`

---

## npm 관련 문제

### npm install 시 deprecation 경고

**증상**:
```
npm warn deprecated inflight@1.0.6
npm warn deprecated glob@7.2.3
4 vulnerabilities (2 moderate, 2 high)
```

**해결 방법**:
- 이것은 정상입니다 (Next.js 프로젝트의 일반적인 경고)
- 안전한 수정: `npm audit fix` (권장)
- 위험한 수정: `npm audit fix --force` (⚠️ 사용 금지 - 프로젝트 손상 가능)

---

## 다음 단계

### 회원가입 시스템 개선

현재 구현된 회원가입은 기본 기능만 제공합니다. 다음 개선사항을 고려하세요:

1. **병원 정보 입력 추가**:
   - 회원가입 폼에 병원명, 사업자번호 필드 추가
   - 또는 회원가입 후 온보딩 페이지에서 입력

2. **이메일 인증**:
   ```typescript
   // src/app/api/auth/signup/route.ts 수정
   email_confirm: false  // 이메일 인증 활성화
   ```

3. **비밀번호 강도 검증**:
   - 최소 8자 이상
   - 대문자, 소문자, 숫자, 특수문자 포함

4. **초대 코드 시스템**:
   - 병원 관리자가 팀원 초대
   - 초대 코드로 회원가입 시 자동으로 해당 병원에 연결

---

## 디버깅 팁

### Supabase 로그 확인

Supabase Dashboard에서 실시간 로그 확인:
1. Supabase Dashboard → Database → Logs
2. Auth → Logs (인증 관련 로그)

### 브라우저 콘솔 확인

개발자 도구 (F12) → Console 탭:
- 네트워크 요청 오류
- JavaScript 에러
- API 응답 내용

### 서버 로그 확인

터미널에서 Next.js 개발 서버 출력 확인:
```bash
npm run dev
# 서버 사이드 에러가 여기에 표시됨
```

---

## 자주 묻는 질문 (FAQ)

### Q: 회원가입 후 자동으로 로그인되나요?
A: 네, 회원가입 성공 후 자동으로 로그인되고 대시보드로 이동합니다.

### Q: 첫 사용자가 자동으로 병원 관리자가 되나요?
A: 네, 첫 사용자는 자동으로 `hospital_owner` 권한을 받습니다.

### Q: 여러 병원을 관리할 수 있나요?
A: 현재 구현에서는 한 사용자는 하나의 병원에만 속합니다. 여러 병원 관리는 추후 구현 예정입니다.

### Q: 비밀번호를 잊어버렸을 때는?
A: 비밀번호 재설정 기능은 아직 구현되지 않았습니다. 다음 단계에서 구현 예정입니다.
