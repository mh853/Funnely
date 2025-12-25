# 세션 완료 요약 - 리드 분배 시스템 버그 수정

**날짜**: 2025-12-25
**작업 내용**: 버튼 디자인 통일화 + UUID 타입 에러 버그 수정

---

## ✅ 완료된 작업

### 1. 버튼 디자인 통일화 (/sc:design)

**문제**: "콜 담당자 분배" 버튼이 다른 버튼들과 다른 스타일 사용
- "콜 담당자 분배": 단색 파란색 (`bg-blue-600`)
- "DB 수동 추가" & "Excel": 그라디언트 (`bg-gradient-to-r from-indigo-500 to-purple-600`)

**수정 내용** ([LeadsClient.tsx:1256-1264](src/app/dashboard/leads/LeadsClient.tsx#L1256-L1264)):
```tsx
// Before
bg-blue-600, font-medium, shadow-sm

// After
bg-gradient-to-r from-indigo-500 to-purple-600
font-semibold, shadow-lg hover:shadow-xl
```

**결과**: 3개 버튼 모두 일관된 브랜드 그라디언트 스타일 적용

---

### 2. 🔴 Critical Bug 수정 - UUID 타입 에러

**증상**:
- "DB 배분" 버튼 클릭 시 500 에러 발생
- 16개 리드 모두 분배 실패
- 에러: `invalid input syntax for type uuid: "null"` (code: 22P02)

**근본 원인**:
```typescript
// ❌ 문제 코드 (Line 37-50)
const { data: userProfile } = await supabase
  .from('users')
  .select('company_id, simple_role')
  .eq('id', user.id)
  .single()

if (!userProfile) {
  return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
}

const companyId = userProfile.company_id  // ❌ null일 수 있음
```

**문제 분석**:
1. `userProfile`은 존재하지만 `company_id`가 `null`인 경우 검증 안됨
2. `null` 값이 Supabase 쿼리에 전달됨 (Line 89: `.eq('company_id', companyId)`)
3. PostgreSQL UUID 컬럼에 string `"null"` 전달 시 타입 에러 발생

**수정 내용** ([route.ts:37-73](src/app/api/leads/distribute/route.ts#L37-L73)):
```typescript
// ✅ 수정된 코드
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

// ✅ company_id 유효성 검증 추가
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

// ✅ 디버깅 로그 추가 (개발 환경)
if (process.env.NODE_ENV === 'development') {
  console.log('Distribution request:', {
    userId: user.id,
    companyId,
    role: userProfile.simple_role
  })
}
```

**수정 사항**:
1. ✅ 에러 디스트럭처링 추가 (`profileError`)
2. ✅ `company_id` null 체크 추가
3. ✅ 사용자 친화적 에러 메시지 반환 (400 상태)
4. ✅ 콘솔 에러 로깅 추가
5. ✅ 개발 환경 디버그 로깅 추가

---

## 📊 예상 결과

### 정상 케이스 (company_id 존재):
```json
{
  "success": true,
  "data": {
    "message": "16개의 리드가 3명의 담당자에게 분배되었습니다.",
    "distributed": 16,
    "userCount": 3,
    "stats": [...]
  }
}
```

### 에러 케이스 (company_id null):
```json
{
  "error": {
    "message": "Company ID not found. Please ensure your account is properly configured."
  }
}
```

클라이언트 측 에러 표시:
```
alert("리드 분배 실패: Company ID not found. Please ensure your account is properly configured.")
```

---

## 🔍 다음 단계 (사용자 company_id null인 경우)

만약 사용자가 여전히 에러를 받는다면:

### 1. 사용자 상태 확인
```sql
SELECT
  id,
  email,
  company_id,
  simple_role,
  is_active,
  created_at
FROM users
WHERE id = 'USER_ID';
```

### 2. company_id null 원인 조사
가능한 원인:
- 초기 회원가입 시 company_id 설정 누락
- 초대 수락 프로세스 미완료
- 데이터 마이그레이션 과정에서 누락
- RLS 정책 문제로 업데이트 실패

### 3. 초대 이력 확인
```sql
SELECT
  id,
  company_id,
  email,
  status,
  accepted_by,
  created_at
FROM company_invitations
WHERE email = 'USER_EMAIL'
ORDER BY created_at DESC;
```

### 4. 수정 방법
**Option 1**: 회사 재할당
```sql
UPDATE users
SET company_id = 'VALID_COMPANY_ID'
WHERE id = 'USER_ID';
```

**Option 2**: 계정 재생성 (깨끗한 시작)

**Option 3**: 관리자가 수동으로 초대 재전송

---

## 📁 생성/수정된 파일

### 수정된 파일
1. **src/app/dashboard/leads/LeadsClient.tsx** (Line 1256-1264)
   - 버튼 스타일 통일화

2. **src/app/api/leads/distribute/route.ts** (Line 37-73)
   - company_id null 검증 추가
   - 에러 로깅 추가

### 생성된 문서
1. **claudedocs/button-design-unification.md**
   - 버튼 디자인 시스템 가이드
   - 색상 팔레트, 타이포그래피, 스페이싱 규칙

2. **claudedocs/distribution-api-bug-fix.md**
   - UUID 에러 근본 원인 분석
   - SQL 진단 쿼리
   - 예방 조치 가이드

3. **claudedocs/manual-distribution-testing.md**
   - 수동 분배 기능 테스트 가이드
   - Phase별 검증 절차

---

## ✅ 검증 필요

### 사용자가 확인해야 할 사항:

1. **버튼 디자인**:
   - [ ] 3개 버튼 모두 동일한 그라디언트 스타일 적용 확인
   - [ ] 호버 효과 일관성 확인
   - [ ] 로딩 상태 그라디언트 확인

2. **분배 기능**:
   - [ ] "DB 배분" 버튼 클릭
   - [ ] 성공 시: "16개의 리드가 X명의 담당자에게 분배되었습니다." 메시지 확인
   - [ ] 에러 시: "Company ID not found..." 메시지 확인

3. **에러 발생 시 조치**:
   - [ ] 브라우저 콘솔에서 `Missing company_id for user: [USER_ID]` 로그 확인
   - [ ] 서버 로그에서 동일 에러 확인
   - [ ] SQL 쿼리로 사용자 company_id 상태 확인
   - [ ] 필요 시 관리자에게 계정 수정 요청

---

## 🎯 요약

**버그 심각도**: 🔴 Critical (기능 완전 차단)
**수정 상태**: ✅ 완료 (테스트 대기)
**영향 범위**: 리드 분배 기능 전체
**다음 액션**: 사용자 테스트 및 피드백

---

**분석일**: 2025-12-25
**버그 타입**: UUID Type Error / Null Reference
**수정 방식**: Defensive Validation + Error Logging
