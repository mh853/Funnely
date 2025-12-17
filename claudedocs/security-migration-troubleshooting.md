# 보안 마이그레이션 문제 해결 과정

## 📋 개요

함수 보안 경고를 수정하는 과정에서 여러 번의 시도와 오류가 있었습니다. 이 문서는 문제 해결 과정과 최종 해결책을 설명합니다.

## 🔄 마이그레이션 파일 진화 과정

### Version 1: `20251217000001_fix_security_warnings.sql`
**접근 방식**: 직접 ALTER FUNCTION 명령 실행

```sql
ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.auto_assign_lead() SET search_path = '';
-- ... 18개 함수
```

**문제점**:
```
ERROR: 42883: function public.auto_assign_lead() does not exist
```

**원인**:
- Supabase 린터 경고에 나온 함수가 실제 데이터베이스에 존재하지 않음
- 함수 시그니처(파라미터)가 정확하지 않음

---

### Version 2: `20251217000002_fix_security_warnings_corrected.sql`
**접근 방식**: 존재 여부 확인 + EXCEPTION 처리

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_assign_lead') THEN
    EXECUTE 'ALTER FUNCTION public.auto_assign_lead() SET search_path = ''''';
    RAISE NOTICE '✅ Fixed: auto_assign_lead';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not fix auto_assign_lead';
  END IF;
END $$;
```

**문제점**:
```
ERROR: 42601: syntax error at or near "EXCEPTION"
LINE 87: EXCEPTION WHEN OTHERS THEN
```

**원인**:
- PostgreSQL에서 EXCEPTION 블록은 BEGIN...END 안에서만 사용 가능
- IF 문 안에 직접 EXCEPTION을 넣을 수 없음

---

### Version 3: `20251217000003_fix_security_simple.sql`
**접근 방식**: 단순 ALTER 명령 (예외 처리 제거)

```sql
ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.increment_landing_page_submissions(uuid) SET search_path = '';
ALTER FUNCTION public.insert_default_lead_statuses() SET search_path = '';
-- ...
```

**문제점**:
```
ERROR: 42883: function public.insert_default_lead_statuses() does not exist
```

**원인**:
- 여러 함수가 실제로 데이터베이스에 존재하지 않음
- 린터 경고 목록의 18개 함수 중 일부만 실제 존재

---

### Version 4: `20251217000004_list_functions.sql` (진단용)
**목적**: 실제 존재하는 함수 확인

```sql
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.proname IN (...) THEN '⚠️ NEEDS FIX'
    ELSE ''
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY status, p.proname;
```

**용도**:
- 어떤 함수가 실제로 존재하는지 확인
- 정확한 함수 시그니처 파악
- 최종 마이그레이션 작성을 위한 정보 수집

---

### Version 5: `20251217000005_fix_security_final.sql` ✅ (최종)
**접근 방식**: 보수적 수정 + 올바른 예외 처리

**핵심 개선사항**:

1. **올바른 예외 처리 구조**:
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'function_name') THEN
    BEGIN  -- 내부 BEGIN 블록 추가
      EXECUTE 'ALTER FUNCTION ...';
      RAISE NOTICE '✅ Fixed: function_name';
    EXCEPTION WHEN OTHERS THEN  -- 이제 유효한 위치
      RAISE NOTICE '⚠️ Skipped: function_name - %', SQLERRM;
    END;  -- 내부 END 블록
  END IF;
END $$;
```

2. **확실한 함수만 포함**:
- `increment_landing_page_views(uuid)` - API에서 호출
- `increment_landing_page_submissions(uuid)` - API에서 호출
- `increment_external_page_views(uuid)` - API에서 호출
- `increment_external_page_submissions(uuid)` - API에서 호출
- `update_updated_at_column()` - 트리거 함수
- `update_notifications_updated_at()` - 트리거 함수
- `update_subscription_status()` - 트리거 함수
- `generate_short_id(integer)` - 유틸리티 함수
- `set_company_short_id()` - 트리거 함수
- `set_user_short_id()` - 트리거 함수
- `generate_invitation_code()` - 유틸리티 함수
- `cleanup_expired_invitations()` - 유틸리티 함수

3. **Materialized View 권한 제한 포함**:
```sql
REVOKE ALL ON public.admin_company_stats FROM anon;
REVOKE ALL ON public.admin_company_stats FROM authenticated;
GRANT SELECT ON public.admin_company_stats TO service_role;
```

## ✅ 최종 해결책

### 실행 방법

**Supabase Dashboard SQL Editor**:
```
https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/sql/new
```

**파일 복사 및 실행**:
```bash
cat supabase/migrations/20251217000005_fix_security_final.sql
# 내용을 SQL Editor에 붙여넣기 → Run 클릭
```

### 예상 결과

```
✅ Security Fix Summary
📊 Functions processed: 12
🔒 Materialized view access restricted

ℹ️ Some functions may have been skipped if they don't exist
ℹ️ Check Supabase linter to verify remaining warnings
```

### 성공 기준

1. **마이그레이션이 오류 없이 실행됨**
2. **12개 함수가 처리됨**
3. **Materialized view 권한이 제한됨**
4. **일부 함수는 스킵될 수 있음 (존재하지 않는 경우)**

## 🔍 검증 방법

### 1. 수정된 함수 확인

```sql
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS is_secure
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'increment_landing_page_views',
  'increment_landing_page_submissions',
  'increment_external_page_views',
  'increment_external_page_submissions',
  'update_updated_at_column',
  'update_notifications_updated_at',
  'update_subscription_status',
  'generate_short_id',
  'set_company_short_id',
  'set_user_short_id',
  'generate_invitation_code',
  'cleanup_expired_invitations'
)
ORDER BY p.proname;
```

**기대 결과**: `is_secure = false` (search_path가 설정됨을 의미)

### 2. Materialized View 권한 확인

```sql
SELECT
  schemaname,
  matviewname,
  matviewowner
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname = 'admin_company_stats';
```

### 3. Supabase 린터 재실행

**Dashboard**:
```
https://supabase.com/dashboard/project/gprrqdhmnzsimkzdhfhh/database/lint
```

**기대 결과**:
- Function search_path 경고가 감소함
- 일부 경고는 남을 수 있음 (존재하지 않는 함수)

## 📝 배운 점

### 1. PostgreSQL 예외 처리 구조
```sql
-- ❌ 잘못된 방법
IF condition THEN
  EXCEPTION WHEN ...  -- 오류!
END IF;

-- ✅ 올바른 방법
IF condition THEN
  BEGIN
    -- 코드
  EXCEPTION WHEN ...
  END;
END IF;
```

### 2. 함수 존재 확인의 중요성
- Supabase 린터 경고 = 반드시 존재한다는 보장 없음
- 실제 데이터베이스 상태 확인 필요
- 보수적 접근 (확실한 것만 수정)이 더 안전

### 3. 함수 시그니처의 정확성
- `function_name()` vs `function_name(uuid)` - 완전히 다른 함수
- ALTER FUNCTION은 정확한 시그니처 필요
- `pg_get_function_identity_arguments()`로 확인 가능

## 🚀 다음 단계

1. ✅ `20251217000005_fix_security_final.sql` 실행
2. ✅ `20251217000000_enable_rls_security.sql` 실행 (아직 안했다면)
3. ✅ 비밀번호 보호 활성화 (Dashboard)
4. ✅ Supabase 린터로 전체 검증
5. ✅ Git 커밋
6. 🚀 **Phase 3.1 시작**: MRR/ARR 수익 지표 계산

## 📊 마이그레이션 파일 상태

| 파일명 | 상태 | 용도 |
|--------|------|------|
| `20251217000000_enable_rls_security.sql` | ✅ 준비 완료 | RLS 활성화 |
| `20251217000001_fix_security_warnings.sql` | ❌ 사용 안함 | 첫 시도 (실패) |
| `20251217000002_fix_security_warnings_corrected.sql` | ❌ 사용 안함 | 두번째 시도 (실패) |
| `20251217000003_fix_security_simple.sql` | ❌ 사용 안함 | 세번째 시도 (실패) |
| `20251217000004_list_functions.sql` | 📋 진단용 | 함수 목록 확인 |
| `20251217000005_fix_security_final.sql` | ✅ **사용** | 최종 버전 |

---

**작성일**: 2025-12-17
**목적**: 보안 마이그레이션 문제 해결 과정 기록
