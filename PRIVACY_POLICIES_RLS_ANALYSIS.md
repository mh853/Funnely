# Privacy Policies RLS Fix - 안전성 분석

## 문제 상황

### 원인
- `privacy_policies` 테이블의 RLS 정책이 존재하지 않는 `users` 테이블을 참조
- 실제 대시보드는 `user_profiles` 테이블 사용
- RLS 정책 검증 실패 → **406 Not Acceptable** 에러 발생

### 에러 로그
```
fetch.js:20 GET https://wsrjfdnxsggwymlrfqcc.supabase.co/rest/v1/privacy_policies?select=*&company_id=eq.971983c1-d197-4ee3-8cda-538551f2cfb2 406 (Not Acceptable)
```

## 시스템 구조 분석

### 1. 대시보드 시스템 (일반 사용자)
**사용 테이블**: `user_profiles`
- **위치**: `/dashboard/settings/privacy-policy/page.tsx`
- **쿼리 패턴**:
  ```typescript
  const { data: profile } = await supabase
    .from('user_profiles')  // ✅ user_profiles 사용
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  ```
- **영향**: `privacy_policies` 테이블 조회/수정/생성 시 RLS 정책 필요

### 2. 어드민 시스템 (관리자)
**사용 테이블**: `users`
- **위치**: `/admin/*` 경로의 모든 API
- **쿼리 패턴**:
  ```typescript
  const query = supabase
    .from('users')  // ✅ users 테이블 사용
    .select('id, full_name, email, role, ...')
  ```
- **영향**: `privacy_policies` 테이블을 **전혀 사용하지 않음** (grep 검색 결과 0건)

## 해결 방안

### 수정 SQL (`20251214000002_fix_privacy_policies_rls.sql`)

```sql
-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Users can update their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Users can insert their company's privacy policies" ON privacy_policies;

-- Create corrected policies using user_profiles table
CREATE POLICY "Users can view their company's privacy policies"
ON privacy_policies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's privacy policies"
ON privacy_policies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their company's privacy policies"
ON privacy_policies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);
```

## 영향 분석

### ✅ 안전성 확인

#### 1. 어드민 시스템 영향: **없음**
- **이유**: 어드민은 `privacy_policies` 테이블을 전혀 사용하지 않음
- **검증**: `grep -r "privacy_policies" src/app/admin` → 0건
- **결론**: RLS 정책 변경이 어드민 시스템에 미치는 영향 **전혀 없음**

#### 2. 대시보드 시스템 영향: **긍정적**
- **현재 상태**: 406 에러로 인해 개인정보 처리 방침 페이지 **작동 불가**
- **수정 후**: RLS 정책이 `user_profiles`를 올바르게 참조하여 **정상 작동**
- **보안 수준**: 동일 (같은 회사 사용자만 접근 가능)

#### 3. 보안 영향: **동일 유지**
**변경 전 (잘못된 정책)**:
```sql
EXISTS (
  SELECT 1 FROM users  -- ❌ 존재하지 않는 테이블
  WHERE users.company_id = privacy_policies.company_id
  AND users.id = auth.uid()
)
```

**변경 후 (올바른 정책)**:
```sql
EXISTS (
  SELECT 1 FROM user_profiles  -- ✅ 올바른 테이블
  WHERE user_profiles.company_id = privacy_policies.company_id
  AND user_profiles.user_id = auth.uid()
)
```

- **보안 로직**: 동일 (같은 회사의 사용자만 접근)
- **차이점**: 테이블 이름만 수정 (`users` → `user_profiles`)

## 실행 권장 사항

### ✅ 실행 가능
- 어드민 시스템에 **영향 없음**
- 대시보드의 개인정보 처리 방침 기능 **수정 필요**
- 보안 수준 **동일 유지**

### 실행 절차
1. Supabase SQL Editor 접속
2. `20251214000002_fix_privacy_policies_rls.sql` 내용 복사
3. 실행 (Run)
4. 성공 메시지 확인

### 검증 방법
**실행 후 테스트**:
1. 대시보드 → 설정 → 개인정보 처리 방침 접속
2. 브라우저 콘솔에서 **406 에러 사라짐** 확인
3. 개인정보 수집 동의 내용 수정 가능 확인
4. 저장 후 다시 로드해서 데이터 유지 확인

## 결론

### 안전성 평가: ✅ 안전
- ❌ 어드민 시스템 영향: **없음** (privacy_policies 미사용)
- ✅ 대시보드 기능 복구: **필수** (현재 오류 상태)
- ✅ 보안 수준: **동일 유지** (로직 변경 없음, 테이블명만 수정)

### 최종 권장사항
**즉시 실행 권장** - 어드민 시스템에 영향 없이 대시보드 오류만 수정
