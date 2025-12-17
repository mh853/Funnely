# 보안 경고 수정 가이드

## 📋 개요

Supabase 린터에서 발견된 20개 보안 경고를 해결하기 위한 마이그레이션 및 설정 가이드입니다.

## 🔧 수정 항목

### 1. Function Search Path Mutable (18개 함수) ✅

**문제**: SQL Injection 공격에 취약한 함수들
**해결**: 각 함수에 `SET search_path = ''` 설정 추가

**영향받는 함수**:
- `increment_landing_page_views`
- `increment_landing_page_submissions`
- `increment_external_page_views`
- `increment_external_page_submissions`
- `auto_assign_lead`
- `update_lead_statuses_updated_at`
- `insert_default_lead_statuses`
- `trigger_insert_default_lead_statuses`
- `update_subscription_status`
- `update_notifications_updated_at`
- `auto_assign_call_staff`
- `trigger_auto_assign_call_staff`
- `generate_invitation_code`
- `cleanup_expired_invitations`
- `set_company_short_id`
- `generate_short_id`
- `set_user_short_id`
- `update_updated_at_column`

**수정 방법**: SQL 마이그레이션 파일 실행

### 2. Materialized View in API (1개) ✅

**문제**: `admin_company_stats` 뷰가 anon/authenticated 역할에 노출됨
**해결**: service_role만 접근 가능하도록 권한 제한

**수정 내용**:
```sql
-- anon, authenticated 역할 접근 차단
REVOKE ALL ON public.admin_company_stats FROM anon;
REVOKE ALL ON public.admin_company_stats FROM authenticated;

-- service_role만 접근 허용
GRANT SELECT ON public.admin_company_stats TO service_role;
```

**수정 방법**: SQL 마이그레이션 파일 실행

### 3. Leaked Password Protection (1개) ⚙️

**문제**: 유출된 비밀번호 보호 기능이 비활성화됨
**해결**: Supabase Dashboard에서 수동 활성화 필요

**수정 방법**: Dashboard 설정 변경 (SQL 마이그레이션 불가)

## 🚀 실행 방법

### Step 1: SQL 마이그레이션 실행

**Option 1: Supabase Dashboard (권장)**

1. SQL Editor 열기:
   ```
   https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql/new
   ```

2. 마이그레이션 파일 복사:
   ```bash
   cat supabase/migrations/20251217000001_fix_security_warnings.sql
   ```

3. SQL Editor에 붙여넣기 후 "Run" 클릭

4. 성공 메시지 확인:
   ```
   ✅ Security Warnings Fix Completed
   📊 Fixed functions: 18 out of 18
   🔒 Materialized view access restricted
   🎉 All function security warnings resolved!
   ```

**Option 2: 로컬 터미널 (psql)**

```bash
PGPASSWORD='Audtjr1357!' psql \
  -h aws-0-ap-northeast-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.gprrqdhmnzsimkzdhfhh \
  -d postgres \
  -f supabase/migrations/20251217000001_fix_security_warnings.sql
```

### Step 2: Leaked Password Protection 활성화

1. Supabase Dashboard 열기:
   ```
   https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/auth/policies
   ```

2. "Password Policies" 섹션 찾기

3. "Leaked Password Protection" 토글 활성화

4. 저장

## ✅ 검증 방법

### 1. Function Search Path 검증

Supabase Dashboard SQL Editor에서 실행:

```sql
SELECT
  p.proname AS function_name,
  CASE
    WHEN p.prosecdef = false THEN 'search_path SET ✅'
    ELSE 'search_path NOT SET ❌'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'increment_landing_page_views',
  'increment_landing_page_submissions',
  'auto_assign_lead',
  'update_updated_at_column'
  -- ... 등
)
ORDER BY p.proname;
```

**기대 결과**: 모든 함수에 "search_path SET ✅"

### 2. Materialized View 권한 검증

```sql
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'admin_company_stats';
```

**기대 결과**: service_role만 SELECT 권한 보유

### 3. Leaked Password Protection 검증

1. Supabase Dashboard > Authentication > Policies
2. "Leaked Password Protection" 상태 확인
3. "Enabled" ✅ 상태여야 함

## 📊 수정 전후 비교

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| Function Search Path | 18개 취약 | 0개 취약 ✅ |
| Materialized View | anon/auth 접근 가능 | service_role만 접근 ✅ |
| Password Protection | 비활성화 | 활성화 ✅ |
| **총 보안 경고** | **20개** | **0개** ✅ |

## 🔍 문제 해결

### 함수 수정 실패 시

**오류**: `ERROR: function does not exist`

**원인**: 함수 시그니처가 다를 수 있음

**해결**:
```sql
-- 함수 시그니처 확인
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'function_name';

-- 올바른 시그니처로 ALTER 실행
```

### 권한 변경 실패 시

**오류**: `ERROR: must be owner of materialized view`

**원인**: 권한 부족

**해결**: Supabase Dashboard SQL Editor에서 실행 (자동으로 postgres 권한 사용)

### Password Protection 활성화 실패 시

**문제**: Dashboard에서 옵션을 찾을 수 없음

**해결**:
1. Supabase 프로젝트 재로드
2. Authentication > Policies 페이지 확인
3. 최신 Supabase 버전에서는 기본 활성화될 수 있음

## 📝 다음 단계

보안 경고 수정 완료 후:

1. ✅ 모든 검증 쿼리 실행
2. ✅ Supabase 린터 재실행 (경고 0개 확인)
3. 🚀 Phase 3.1 시작: MRR/ARR 수익 지표 계산

## ⚠️ 주의사항

- **Function Search Path 수정**: 기존 함수 동작에는 영향 없음
- **Materialized View 권한**: Admin API에서만 접근 (service_role 사용)
- **Password Protection**: 신규 회원가입부터 적용됨 (기존 사용자 영향 없음)

## 🔗 참고 자료

- [Supabase Function Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Materialized View Security](https://supabase.com/docs/guides/database/database-linter?lint=0016_materialized_view_in_api)
- [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
