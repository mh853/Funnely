# 🚀 빠른 시작 가이드

## 현재 상태

퍼널리 프로젝트의 기반 구조가 완성되었습니다!

✅ **완료된 작업**:
- Next.js 14 + TypeScript 프로젝트 초기화
- 데이터베이스 스키마 설계 및 마이그레이션 파일
- TypeScript 타입 정의
- 프로젝트 전체 문서화
- 기본 UI 구조

---

## 다음 단계 (시작하기)

### 1. 의존성 설치

```bash
cd ~/funnely
npm install
```

### 2. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `funnely`
   - Password: 안전한 비밀번호
   - Region: `Northeast Asia (Seoul)`
4. 프로젝트 생성 (약 2분)

### 3. 환경 변수 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local
```

Supabase Dashboard에서 정보 복사:
- Settings → API → Project URL
- Settings → API → `anon` `public` key
- Settings → API → `service_role` `secret` key

`.env.local`에 입력:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_URL=http://localhost:3000
```

### 4. 데이터베이스 마이그레이션

**방법 A: Supabase CLI (권장)**
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

**방법 B: SQL Editor**
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20250112000000_initial_schema.sql` 내용 복사
3. 붙여넣기 및 실행

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 확인!

---

## 📚 상세 문서

### 필수 읽기
1. **[README.md](./README.md)** - 프로젝트 개요
2. **[docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md)** - 전체 개요
3. **[docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md)** - 개발 환경 설정
4. **[docs/IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md)** - 구현 현황 및 다음 단계

### 참고 문서
- **[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - DB 스키마
- **[docs/AD_PLATFORM_INTEGRATION.md](./docs/AD_PLATFORM_INTEGRATION.md)** - 광고 플랫폼 연동

---

## 🎯 개발 우선순위

### 즉시 시작 가능
1. **인증 시스템** - Supabase Auth 설정 및 로그인/회원가입
2. **대시보드 레이아웃** - 기본 네비게이션 및 사이드바
3. **회사 관리** - 회사 등록 및 사용자 관리

### 병렬 진행 (시간 소요)
광고 플랫폼 개발자 계정 생성 및 검수:
- Meta Ads: 2-4주
- Kakao Moment: 1-2주
- Google Ads: 1-3주

---

## 💡 유용한 명령어

```bash
# 개발 서버
npm run dev

# 타입 체크
npm run type-check

# Lint 검사
npm run lint

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start
```

---

## 🛠️ 트러블슈팅

### Supabase 연결 안 됨
- `.env.local` 파일의 URL과 Key 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 마이그레이션 실패
- SQL 에러 확인
- 기존 테이블이 있다면 삭제 후 재실행

### 의존성 설치 에러
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 도움이 필요하신가요?

- 프로젝트 문서: `docs/` 폴더
- 구현 현황: [docs/IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md)

---

**퍼널리 팀과 함께 멋진 플랫폼을 만들어봅시다! 🚀**
