# Users RLS 무한 재귀 오류 수정

## 문제 상황

**에러 메시지**:
```
{
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "users"',
  digest: '2923454253'
}
```

**발생 위치**: `/dashboard` 접근 시 500 에러

## 원인 분석

### 문제가 되는 RLS 정책들 (복수!)

**파일 1**: `supabase/migrations/20251213000004_add_admin_rls_policies.sql:20-30`

```sql
CREATE POLICY "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user  -- ❌ 문제: users 테이블을 조회
      WHERE admin_user.id = auth.uid()
      AND admin_user.is_super_admin = true
    )
  );
```

**파일 2**: `supabase/migrations/20250121000000_rename_hospitals_to_companies.sql:92-109`

```sql
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()  -- ❌ 재귀!
    )
  );

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users  -- ❌ 재귀!
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );
```

**총 3개의 재귀 정책 발견!**

### 무한 재귀가 발생하는 이유

1. 사용자가 `/dashboard` 페이지 접근
2. 코드에서 `users` 테이블 조회 시도
3. RLS 정책 "Super admins can view all users" 실행
4. 정책 내부에서 `users` 테이블을 다시 조회 (`SELECT 1 FROM users`)
5. 다시 RLS 정책 실행 → **무한 재귀** 발생
6. PostgreSQL이 재귀 감지하고 에러 반환

### PostgreSQL RLS 무한 재귀 패턴

이는 매우 흔한 Supabase/PostgreSQL RLS 오류입니다:

```sql
-- ❌ 나쁜 예: 자기 자신을 참조
CREATE POLICY "policy_name" ON table_name
  USING (
    EXISTS (SELECT 1 FROM table_name WHERE ...)  -- 무한 재귀!
  );

-- ✅ 좋은 예 1: JWT 클레임 사용
CREATE POLICY "policy_name" ON table_name
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true
  );

-- ✅ 좋은 예 2: 별도 테이블 사용
CREATE POLICY "policy_name" ON table_name
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- ✅ 좋은 예 3: 애플리케이션 레벨 권한 체크
CREATE POLICY "policy_name" ON table_name
  USING (true);  -- API에서 RBAC로 권한 체크
```

## 해결 방안

### 선택한 해결책: API 레벨 권한 체크

**이유**:
- 프로젝트에 이미 강력한 RBAC 시스템이 구현되어 있음 (`src/types/rbac.ts`)
- 모든 API 엔드포인트에서 권한 검증 수행
- RLS는 최소한의 보안만 제공하고, 세밀한 권한은 애플리케이션 레벨에서 처리

**구현**: `20250103000000_fix_users_rls_infinite_recursion.sql`

```sql
DROP POLICY IF EXISTS "Super admins can view all users" ON users;

CREATE POLICY "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);  -- 인증된 사용자는 조회 가능, 세부 권한은 API에서 체크
```

### 대안 1: JWT 클레임 사용 (장기적으로 권장)

```sql
CREATE POLICY "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true
  );
```

**장점**:
- 무한 재귀 없음
- RLS 레벨에서 강력한 보안
- 빠른 성능 (테이블 조회 없음)

**단점**:
- JWT에 `is_super_admin` 클레임을 설정하는 로직 필요
- 로그인 시 Supabase Auth Hooks 또는 Database Triggers 필요

### 대안 2: 별도 테이블 사용

```sql
-- admin_roles 테이블 생성
CREATE TABLE admin_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_super_admin BOOLEAN DEFAULT false
);

-- RLS 정책
CREATE POLICY "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
      AND admin_roles.is_super_admin = true
    )
  );
```

**장점**:
- 무한 재귀 없음
- RLS 레벨에서 보안 제공

**단점**:
- 추가 테이블 관리 필요
- 데이터 동기화 복잡도

## 실행 순서

### 1. ⚠️ 포괄적 수정 마이그레이션 실행 (최종 해결책)

**중요**: `20250103000000_fix_users_rls_infinite_recursion.sql`만으로는 부족합니다!
여러 마이그레이션 파일에서 재귀 정책이 발견되었습니다.

**Supabase Dashboard SQL Editor**에서 실행:

```sql
-- 모든 재귀 정책을 한 번에 제거하고 재생성
-- 파일: 20250103000001_fix_all_users_rls_recursion.sql
```

이 마이그레이션은:
- ✅ **모든** users 테이블 RLS 정책을 동적으로 삭제
- ✅ 재귀 없는 새로운 5개 정책 생성
- ✅ API 레벨 RBAC와 조화로운 이중 보안 모델
- ✅ 상세한 주석으로 문서화

**새로운 정책들**:
1. `users_select_own`: 자신의 프로필 조회
2. `users_update_own`: 자신의 프로필 수정
3. `users_select_all_authenticated`: 인증된 사용자는 모든 users 조회 (API에서 세밀한 권한 체크)
4. `users_insert_super_admin`: INSERT 권한 (API 체크)
5. `users_delete_super_admin`: DELETE 권한 (API 체크)

### 2. 서버 재시작

```bash
# Next.js 개발 서버 재시작
# Ctrl+C 후 다시 실행
npm run dev
```

### 3. 검증

1. `/dashboard` 페이지 접근
2. 500 에러가 사라졌는지 확인
3. Users 목록 페이지 정상 작동 확인

## 장기 개선 방안

### Phase 5에서 구현할 사항

1. **JWT 클레임 설정**:
   - Supabase Auth Hooks 또는 Database Triggers로 로그인 시 JWT에 `is_super_admin` 설정
   - `auth.jwt()` 사용하도록 모든 RLS 정책 업데이트

2. **RLS 정책 감사**:
   - 다른 테이블들도 유사한 무한 재귀 패턴 확인
   - `companies`, `leads` 등의 RLS 정책 검토

3. **보안 강화**:
   - API 레벨 권한 체크 + RLS 이중 보안
   - Audit Logging 강화

## 참고 자료

- [Supabase RLS Performance Tips](https://supabase.com/docs/guides/auth/row-level-security#performance)
- [PostgreSQL Infinite Recursion in Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)

## 체크리스트

- [x] 문제 원인 분석 완료 (3개 재귀 정책 발견)
- [x] 포괄적 수정 마이그레이션 생성 (`20250103000001_fix_all_users_rls_recursion.sql`)
- [ ] 마이그레이션 실행 ⬅️ **현재 단계**
- [ ] 서버 재시작
- [ ] `/dashboard` 정상 작동 확인
- [ ] 다른 테이블 RLS 정책 검토 (companies, leads 등)
- [ ] JWT 클레임 기반 RLS로 전환 (Phase 5)

## 결론

**즉시 조치**: `20250103000001_fix_all_users_rls_recursion.sql` 실행하여 **모든** 무한 재귀 해결

이 마이그레이션은:
1. 동적으로 모든 기존 정책 삭제 (어떤 정책이 있든 상관없이)
2. 재귀 없는 5개의 새로운 정책 생성
3. 이중 보안 모델 (RLS + API RBAC) 구현

**장기 계획**: JWT 클레임 기반 RLS로 전환하여 더 강력한 보안과 성능 확보 (Phase 5)
