# UUID 에러 심층 분석 - 일반 사용자 ID 문제

**날짜**: 2025-12-25
**버그 타입**: UUID Type Error in Lead Assignment
**심각도**: 🔴 Critical

---

## 🔍 문제 상황

### 증상
```
Distribution errors: [16개 동일 에러]
{
  error: {
    code: '22P02',
    message: 'invalid input syntax for type uuid: "null"'
  }
}
```

### 디버그 로그 분석
```javascript
Distribution request: {
  userId: '505905b1-3201-47b9-9cd4-962e972117d8',  // ✅ 정상
  companyId: '971983c1-d197-4ee3-8cda-538551f2cfb2',  // ✅ 정상
  role: 'admin'  // ✅ 정상
}
```

**관찰**:
- ✅ 인증 사용자 정보: 정상
- ✅ company_id 검증: 통과
- ❌ 리드 업데이트 쿼리: 16개 모두 실패

---

## 🎯 근본 원인 가설

### 가설 1: 일반 사용자 테이블의 ID가 null
```sql
-- 문제 확인 쿼리
SELECT
  id,
  full_name,
  simple_role,
  is_active,
  company_id
FROM users
WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2'
  AND simple_role = 'user'
  AND is_active = true
ORDER BY created_at;
```

**예상 결과 (문제 케이스)**:
```
| id   | full_name | simple_role | is_active | company_id |
|------|-----------|-------------|-----------|------------|
| null | User 1    | user        | true      | 971983... |
| null | User 2    | user        | true      | 971983... |
```

### 가설 2: Supabase 쿼리 결과 변환 문제
```typescript
// Line 114-116
const { data: regularUsers, error: usersError } = await supabase
  .from('users')
  .select('id, full_name')  // 'id' 필드가 null로 반환될 가능성
```

**가능한 원인**:
1. **RLS 정책 문제**: `users` 테이블의 RLS 정책이 `id` 필드를 마스킹하고 있을 가능성
2. **타입 변환 이슈**: PostgreSQL의 UUID → JavaScript string 변환 과정에서 문제
3. **데이터 무결성**: 실제로 `users.id`가 null인 레코드 존재

---

## 🔧 적용된 수정 사항

### 1. 일반 사용자 목록 디버깅 로그 추가
**위치**: [route.ts:137-141](src/app/api/leads/distribute/route.ts#L137-L141)

```typescript
// 디버깅: 일반 사용자 목록 확인
if (process.env.NODE_ENV === 'development') {
  console.log('Regular users found:', regularUsers.length)
  console.log('User IDs:', regularUsers.map(u => ({
    id: u.id,
    name: u.full_name,
    idType: typeof u.id
  })))
}
```

**목적**:
- 일반 사용자가 몇 명 조회되었는지 확인
- 각 사용자의 `id` 필드 값과 타입 확인
- null 또는 undefined 여부 확인

### 2. Round Robin 알고리즘에 사용자 검증 추가
**위치**: [route.ts:158-162](src/app/api/leads/distribute/route.ts#L158-L162)

```typescript
// userId 유효성 검증
if (!user || !user.id) {
  console.error('Invalid user at index:', userIndex, user)
  throw new Error(`배정 대상 사용자 정보가 유효하지 않습니다 (index: ${userIndex})`)
}
```

**목적**:
- 배정 전에 사용자 객체와 ID 유효성 검증
- 문제가 있는 사용자의 인덱스 로깅
- 명확한 에러 메시지 제공

### 3. Assignment 배열 디버깅 로그
**위치**: [route.ts:174-183](src/app/api/leads/distribute/route.ts#L174-L183)

```typescript
// 디버깅: assignments 확인
if (process.env.NODE_ENV === 'development') {
  console.log('First 3 assignments:', assignments.slice(0, 3).map(a => ({
    leadId: a.leadId,
    userId: a.userId,
    userIdType: typeof a.userId,
    userIdValue: a.userId,
    userName: a.userName
  })))
}
```

**목적**:
- 실제 업데이트 쿼리로 전달되는 `userId` 값 확인
- 타입과 값이 정상인지 검증
- 문자열 `"null"`이 전달되는지 확인

---

## 🧪 다음 테스트 단계

### 1. 개발 서버 재시작
```bash
# 터미널에서 Ctrl+C로 서버 중지 후
npm run dev
```

### 2. 브라우저 강제 새로고침
```
Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)
```

### 3. 분배 버튼 클릭 후 로그 확인

**예상 로그 (정상 케이스)**:
```javascript
Distribution request: {
  userId: '505905b1-3201-47b9-9cd4-962e972117d8',
  companyId: '971983c1-d197-4ee3-8cda-538551f2cfb2',
  role: 'admin'
}

Regular users found: 3
User IDs: [
  { id: 'uuid-1', name: 'User A', idType: 'string' },
  { id: 'uuid-2', name: 'User B', idType: 'string' },
  { id: 'uuid-3', name: 'User C', idType: 'string' }
]

First 3 assignments: [
  { leadId: 'lead-1', userId: 'uuid-1', userIdType: 'string', userIdValue: 'uuid-1', userName: 'User A' },
  { leadId: 'lead-2', userId: 'uuid-2', userIdType: 'string', userIdValue: 'uuid-2', userName: 'User B' },
  { leadId: 'lead-3', userId: 'uuid-3', userIdType: 'string', userIdValue: 'uuid-3', userName: 'User C' }
]
```

**예상 로그 (문제 케이스)**:
```javascript
Regular users found: 3
User IDs: [
  { id: null, name: 'User A', idType: 'object' },  // ❌ null
  { id: null, name: 'User B', idType: 'object' },  // ❌ null
  { id: null, name: 'User C', idType: 'object' }   // ❌ null
]

// 또는
Invalid user at index: 0 { id: null, full_name: 'User A' }
Error: 배정 대상 사용자 정보가 유효하지 않습니다 (index: 0)
```

---

## 🔍 문제 발견 시 진단 절차

### 시나리오 A: User IDs가 모두 null인 경우

**진단 쿼리 1 - 데이터 확인**:
```sql
SELECT
  id,
  email,
  full_name,
  simple_role,
  is_active,
  company_id,
  created_at
FROM users
WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2'
  AND simple_role = 'user'
  AND is_active = true;
```

**진단 쿼리 2 - RLS 정책 확인**:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

**가능한 원인**:
1. ✅ **데이터가 정상이면**: RLS 정책이 `id` 필드를 필터링하고 있음
2. ❌ **데이터에 id가 null이면**: 데이터 무결성 문제 (NOT NULL 제약 조건 위반)

### 시나리오 B: 특정 사용자만 ID가 null인 경우

**진단 쿼리**:
```sql
-- id가 null인 사용자 찾기
SELECT
  email,
  full_name,
  simple_role,
  company_id,
  created_at
FROM users
WHERE id IS NULL;
```

**조치 방안**:
```sql
-- 해당 사용자 데이터 삭제 후 재생성
DELETE FROM users WHERE id IS NULL;
```

---

## 🛡️ 임시 해결 방안 (긴급 상황)

### Option 1: admin이 직접 배정
```sql
-- 미배정 리드 확인
SELECT id, name, phone, created_at
FROM leads
WHERE company_id = '971983c1-d197-4ee3-8cda-538551f2cfb2'
  AND call_assigned_to IS NULL
ORDER BY created_at;

-- 수동 배정
UPDATE leads
SET call_assigned_to = 'VALID_USER_UUID'
WHERE id IN ('lead_id_1', 'lead_id_2', ...);
```

### Option 2: 자동 배정 트리거 재활성화 (롤백)
```sql
-- 기존 자동 배정 트리거 재활성화
CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();
```

---

## 📊 예상 결과별 조치

### 결과 1: 로그에서 User IDs가 정상 (UUID string)
→ **원인**: 다른 곳에서 문제 발생 (예: lead.id가 null)
→ **조치**: 미배정 리드 쿼리 검증 추가

### 결과 2: 로그에서 User IDs가 null
→ **원인**: RLS 정책 또는 데이터 무결성 문제
→ **조치**: SQL 진단 쿼리 실행 → RLS 정책 수정 또는 데이터 복구

### 결과 3: "배정 대상 사용자 정보가 유효하지 않습니다" 에러
→ **원인**: userId 검증에서 걸림 (명확히 null 감지)
→ **조치**: 즉시 SQL 쿼리로 데이터 확인

---

## 📁 수정된 파일

**파일**: `/Users/mh.c/medisync/src/app/api/leads/distribute/route.ts`

**수정 라인**:
- Line 137-141: 일반 사용자 목록 디버깅 로그
- Line 158-162: userId 유효성 검증
- Line 174-183: Assignment 배열 디버깅 로그

**수정 타입**: Defensive Programming + Enhanced Logging
**영향 범위**: 리드 분배 API 전체
**테스트 필요**: 즉시 재테스트 필요

---

**분석일**: 2025-12-25
**상태**: 🔄 디버깅 로그 추가 완료 → 재테스트 대기
**Next Action**: 사용자가 분배 버튼 클릭 → 서버 로그 확인 → 근본 원인 식별
