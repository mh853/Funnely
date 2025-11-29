# Migration Scripts

이 디렉토리는 데이터베이스 마이그레이션 및 관리 스크립트를 포함합니다.

## migrate-auth-users.ts

Supabase Auth에 있는 사용자를 `public.users` 테이블로 마이그레이션하는 스크립트입니다.

### 목적

- Supabase Auth에만 존재하고 `users` 테이블에 없는 계정 문제 해결
- 각 사용자에 대해 병원(hospital) 레코드 자동 생성
- 기존 사용자는 건너뛰고 새로운 사용자만 마이그레이션

### 사용 방법

#### 1. 필수 패키지 설치

```bash
npm install
```

#### 2. 환경 변수 확인

`.env.local` 파일에 다음 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 3. 스크립트 실행

```bash
npm run migrate:auth-users
```

또는

```bash
npx tsx scripts/migrate-auth-users.ts
```

### 동작 방식

1. **Auth 사용자 조회**: Supabase Auth의 모든 사용자를 가져옵니다
2. **기존 사용자 확인**: `public.users` 테이블에 이미 존재하는 사용자는 건너뜁니다
3. **병원 생성**: 각 새 사용자에 대해 임시 병원 레코드를 생성합니다
   - 병원 이름: `{사용자 이름}의 병원`
   - 사업자번호: `TEMP-{timestamp}-{random}`
4. **사용자 레코드 생성**: `public.users` 테이블에 사용자 정보를 추가합니다
   - 역할(role): `hospital_owner` (기본값)
   - 상태(is_active): `true`

### 출력 예시

```
═══════════════════════════════════════════════════════
  Auth Users to Public Users Migration Script
═══════════════════════════════════════════════════════

🚀 Starting migration...

📋 Fetching users from Supabase Auth...
✅ Found 2 users in Supabase Auth

📋 Fetching existing users from public.users table...
✅ Found 1 existing users in public.users table

🔄 Processing users...

👤 Processing: munong2@gmail.com (ID: abc123...)
   ⏭️  Already exists in public.users - skipping

👤 Processing: test@example.com (ID: def456...)
   🏥 Creating hospital...
   ✅ Hospital created (ID: ghi789...)
   👤 Creating user record...
   ✅ User record created
   🎉 Migration successful!

═══════════════════════════════════════════════════════
  Migration Complete!
═══════════════════════════════════════════════════════
Total users:     2
Migrated:        1
Skipped:         1
Failed:          0
═══════════════════════════════════════════════════════
```

### 에러 처리

- 병원 생성 실패 시: 해당 사용자 마이그레이션 실패로 표시
- 사용자 레코드 생성 실패 시: 생성된 병원 자동 롤백
- 마이그레이션 중 에러가 발생한 사용자는 `errors` 배열에 기록됨

### 안전 기능

- **멱등성(Idempotency)**: 여러 번 실행해도 안전 (이미 존재하는 사용자는 건너뜀)
- **자동 롤백**: 사용자 생성 실패 시 생성된 병원 레코드 자동 삭제
- **서비스 롤 키 사용**: RLS 정책 우회하여 안전하게 데이터 생성

### 주의사항

⚠️ **프로덕션 환경에서 실행 전 백업 권장**

- 이 스크립트는 데이터를 생성만 하고 수정하거나 삭제하지 않습니다
- 하지만 중요한 데이터베이스 작업이므로 백업 후 실행을 권장합니다

### 이후 단계

마이그레이션 후:

1. **로그인 테스트**: 마이그레이션된 계정으로 로그인 시도
2. **병원 정보 업데이트**: 대시보드 > 설정에서 임시 사업자번호를 실제 번호로 변경
3. **권한 확인**: 필요시 사용자 역할(role) 조정

### 문제 해결

**Q: "Missing environment variables" 에러가 발생합니다**
- A: `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요
- A: `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인하세요

**Q: "Failed to create hospital" 에러가 발생합니다**
- A: Supabase 데이터베이스 연결을 확인하세요
- A: `hospitals` 테이블의 RLS 정책을 확인하세요 (서비스 롤 키는 RLS를 우회해야 합니다)

**Q: 마이그레이션 후에도 로그인이 안 됩니다**
- A: 브라우저 캐시를 지우고 다시 시도하세요
- A: Supabase Dashboard에서 `users` 테이블에 데이터가 제대로 생성되었는지 확인하세요
