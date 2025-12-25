# 리드 분배 API 버그 수정 - UUID 에러 해결

## 🐛 문제 분석

### 에러 로그
```
invalid input syntax for type uuid: "null"
code: '22P02'
```

### 근본 원인
`/api/leads/distribute` API에서 `company_id` 값 검증 없이 사용하여 발생한 문제:

1. **userProfile.company_id가 `null`인 경우** 처리 누락
2. **company_id 유효성 검증** 부재
3. 16개 리드 모두 동일한 UUID 에러로 실패

### 코드 분석

**현재 코드 (Line 37-50):**
```typescript
const { data: userProfile } = await supabase
  .from('users')
  .select('company_id, simple_role')
  .eq('id', user.id)
  .single()

if (!userProfile) {
  return NextResponse.json(
    { error: { message: 'User profile not found' } },
    { status: 404 }
  )
}

const companyId = userProfile.company_id  // ❌ null일 수 있음
```

**문제:**
- `userProfile`은 존재하지만 `company_id`가 `null`인 경우 검증 안됨
- `null` 값이 그대로 Supabase 쿼리에 전달됨
- PostgreSQL UUID 컬럼에 `null` 전달 시 타입 에러 발생

## 🎯 해결 방안

### 1. company_id null 체크 추가

```typescript
const { data: userProfile } = await supabase
  .from('users')
  .select('company_id, simple_role')
  .eq('id', user.id)
  .single()

if (!userProfile) {
  return NextResponse.json(
    { error: { message: 'User profile not found' } },
    { status: 404 }
  )
}

// ✅ company_id 검증 추가
if (!userProfile.company_id) {
  return NextResponse.json(
    { error: { message: 'Company ID not found. Please contact administrator.' } },
    { status: 400 }
  )
}

const companyId = userProfile.company_id
```

### 2. 추가 디버깅 로그

문제 진단을 위한 로그 추가:

```typescript
// 디버깅 로그
console.log('User ID:', user.id)
console.log('User Profile:', userProfile)
console.log('Company ID:', userProfile.company_id)

if (!userProfile.company_id) {
  console.error('Missing company_id for user:', user.id)
  return NextResponse.json(
    { error: { message: 'Company ID not found. Please contact administrator.' } },
    { status: 400 }
  )
}
```

### 3. 데이터베이스 상태 확인

사용자 테이블에서 `company_id` 확인:

```sql
-- 현재 인증된 사용자의 company_id 확인
SELECT
  id,
  email,
  company_id,
  simple_role,
  is_active
FROM users
WHERE id = 'YOUR_USER_ID';

-- company_id가 null인 사용자 확인
SELECT
  id,
  email,
  company_id,
  simple_role
FROM users
WHERE company_id IS NULL;
```

## 🔧 수정 코드

### API Route 수정 (route.ts)

```typescript
// ========================================================================
// 2. 사용자 프로필 및 권한 확인
// ========================================================================
const { data: userProfile, error: profileError } = await supabase
  .from('users')
  .select('company_id, simple_role')
  .eq('id', user.id)
  .single()

if (profileError || !userProfile) {
  console.error('User profile error:', profileError)
  return NextResponse.json(
    { error: { message: 'User profile not found' } },
    { status: 404 }
  )
}

// ✅ company_id 유효성 검증
if (!userProfile.company_id) {
  console.error('Missing company_id for user:', user.id)
  return NextResponse.json(
    {
      error: {
        message: 'Company ID not found. Please ensure your account is properly configured.'
      }
    },
    { status: 400 }
  )
}

const companyId = userProfile.company_id

// 디버깅 로그 (개발 환경)
if (process.env.NODE_ENV === 'development') {
  console.log('Distribution request:', {
    userId: user.id,
    companyId,
    role: userProfile.simple_role
  })
}
```

## 📊 테스트 시나리오

### 1. company_id가 null인 사용자
```bash
# 예상 응답:
{
  "error": {
    "message": "Company ID not found. Please ensure your account is properly configured."
  }
}
# Status: 400
```

### 2. company_id가 유효한 사용자
```bash
# 예상: 정상 분배 진행
{
  "success": true,
  "data": {
    "message": "16개의 리드가 3명의 담당자에게 분배되었습니다.",
    ...
  }
}
```

### 3. 사용자 프로필 없음
```bash
# 예상 응답:
{
  "error": {
    "message": "User profile not found"
  }
}
# Status: 404
```

## 🔍 근본 원인 조사

### company_id가 null인 이유

가능한 원인:
1. **초기 회원가입 시** company_id 설정 누락
2. **초대 수락 프로세스** 미완료
3. **데이터 마이그레이션** 과정에서 누락
4. **RLS 정책** 문제로 company_id 업데이트 실패

### 확인 방법

```sql
-- 1. 사용자 상태 확인
SELECT
  u.id,
  u.email,
  u.company_id,
  u.simple_role,
  u.created_at,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = 'YOUR_USER_ID';

-- 2. 초대 이력 확인
SELECT
  id,
  company_id,
  email,
  status,
  accepted_by,
  created_at
FROM company_invitations
WHERE email = 'YOUR_EMAIL'
ORDER BY created_at DESC;
```

## ✅ 수정 체크리스트

- [ ] API Route에 company_id null 체크 추가
- [ ] 디버깅 로그 추가
- [ ] 에러 메시지 사용자 친화적으로 개선
- [ ] 데이터베이스에서 company_id null 사용자 확인
- [ ] company_id null 사용자에 대한 수정 방법 결정:
  - Option 1: 회사 재할당
  - Option 2: 계정 재생성
  - Option 3: 관리자 수동 수정
- [ ] 테스트 (정상 사용자 + company_id null 사용자)
- [ ] 프로덕션 배포 전 검증

## 🛡️ 예방 조치

### 1. 회원가입 프로세스 검증
```typescript
// 회원가입 시 company_id 필수 확인
if (!newUser.company_id) {
  throw new Error('Company ID is required')
}
```

### 2. Database Constraint 추가
```sql
-- users 테이블에 NOT NULL constraint 추가 (옵션)
ALTER TABLE users
ALTER COLUMN company_id SET NOT NULL;

-- 기존 null 값이 있다면 먼저 수정 필요
UPDATE users
SET company_id = 'DEFAULT_COMPANY_ID'
WHERE company_id IS NULL;
```

### 3. RLS 정책 검증
```sql
-- users 테이블 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

## 📝 파일 정보

**수정 대상**: `/Users/mh.c/medisync/src/app/api/leads/distribute/route.ts`
**수정 라인**: 37-50 (사용자 프로필 검증 부분)
**우선순위**: 🔴 Critical (기능 완전 차단 버그)
**영향 범위**: 리드 분배 기능 전체

---

**분석일**: 2025-12-25
**버그 심각도**: Critical
**타입**: UUID Type Error / Null Reference
**상태**: 분석 완료 → 수정 대기
