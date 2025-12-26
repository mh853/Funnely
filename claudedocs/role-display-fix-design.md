# 권한 표시 오류 수정 설계

**날짜**: 2025-12-26
**버그 타입**: Legacy Role Field Display Issue
**심각도**: 🟡 Medium (UI 표시 오류)
**상태**: 📝 설계 완료

---

## 🎯 문제 상황

### 증상
- **사용자**: 최문호3 (mh853@gmail.com)
- **현상**: 헤더 드롭다운 메뉴에 "권한: 마케팅 스태프" 표시
- **기대값**: "권한: 일반 사용자" 표시

### 스크린샷 분석
- 우측 상단 드롭다운: "권한: 마케팅 스태프"
- 팀 관리 페이지 테이블: "일반 사용자" 정상 표시

---

## 🔍 근본 원인

### 권한 시스템 이중화
현재 시스템에 두 가지 권한 필드가 공존:

**1. 구 권한 시스템 (`role`)**:
- 테이블: `users.role`
- 값: `hospital_owner`, `hospital_admin`, `marketing_manager`, `marketing_staff`, `viewer`
- 상태: **Deprecated** (사용 중단)

**2. 신규 권한 시스템 (`simple_role`)**:
- 테이블: `users.simple_role`
- 값: `admin`, `user`
- 상태: **Active** (현재 사용 중)

### 문제 코드 (Header.tsx:72-76)
```typescript
{userProfile?.role && (
  <p className="text-xs text-gray-500 mt-1">
    권한: {getRoleLabel(userProfile.role)}  // ❌ 구 role 필드 사용
  </p>
)}
```

**getRoleLabel() 함수** (Line 112-121):
```typescript
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    hospital_owner: '회사 관리자',
    hospital_admin: '회사 어드민',
    marketing_manager: '마케팅 매니저',
    marketing_staff: '마케팅 스태프',  // ❌ 이 값이 표시됨
    viewer: '뷰어',
  }
  return labels[role] || role
}
```

### 왜 "마케팅 스태프"가 표시되는가?
1. 최문호3 계정의 `users.role` 필드에 `marketing_staff` 값이 남아있음
2. Header 컴포넌트가 `userProfile.role`을 읽음
3. `getRoleLabel('marketing_staff')` → "마케팅 스태프" 반환

---

## ✅ 해결 방안

### Option 1: Header.tsx 수정 (권장)
**접근**: 신규 권한 시스템 사용하도록 코드 수정

**장점**:
- 빠른 수정
- 시스템 전체와 일관성 유지
- 향후 구 권한 필드 제거 시 문제 없음

**단점**:
- 없음

### Option 2: 데이터베이스 마이그레이션
**접근**: 모든 사용자의 `role` 필드 정리

**장점**:
- 데이터 정합성 확보

**단점**:
- 작업 범위 큼
- 다른 곳에서 `role` 사용 가능성

### 선택: Option 1 (Header.tsx 수정)
신속하고 안전한 해결책

---

## 🔧 상세 설계

### 수정 대상 파일
**파일**: `/Users/mh.c/medisync/src/components/dashboard/Header.tsx`
**라인**: 72-76, 112-121

### 변경 사항

#### 1. 권한 표시 로직 변경 (Line 72-76)

**Before**:
```typescript
{userProfile?.role && (
  <p className="text-xs text-gray-500 mt-1">
    권한: {getRoleLabel(userProfile.role)}
  </p>
)}
```

**After**:
```typescript
{userProfile?.simple_role && (
  <p className="text-xs text-gray-500 mt-1">
    권한: {getSimpleRoleLabel(userProfile.simple_role)}
  </p>
)}
```

#### 2. getRoleLabel 함수 교체 (Line 112-121)

**Before**:
```typescript
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    hospital_owner: '회사 관리자',
    hospital_admin: '회사 어드민',
    marketing_manager: '마케팅 매니저',
    marketing_staff: '마케팅 스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}
```

**After**:
```typescript
function getSimpleRoleLabel(simpleRole: string): string {
  const labels: Record<string, string> = {
    admin: '관리자',
    user: '일반 사용자',
  }
  return labels[simpleRole] || simpleRole
}
```

---

## 📊 영향 범위 분석

### 직접 영향
- **Header.tsx**: 권한 표시 로직
- **사용자**: 모든 로그인 사용자 (헤더 드롭다운)

### 간접 영향
- 없음 (Header 컴포넌트만 수정)

### 다른 파일 확인 필요
```bash
# role 필드를 사용하는 다른 파일 검색
grep -r "userProfile?.role" src/
grep -r "userProfile.role" src/
```

**검색 결과 예상**:
- 팀 관리 페이지: `simple_role` 사용 (정상)
- 설정 페이지: `simple_role` 사용 (정상)
- Header.tsx: `role` 사용 (수정 필요) ✅

---

## 🧪 테스트 계획

### 1. 최문호3 계정 테스트
**simple_role**: `user`

**Before**:
- 헤더 드롭다운: "권한: 마케팅 스태프" ❌

**After**:
- 헤더 드롭다운: "권한: 일반 사용자" ✅

### 2. 관리자 계정 테스트
**simple_role**: `admin`

**After**:
- 헤더 드롭다운: "권한: 관리자" ✅

### 3. 모든 계정 테스트
- [ ] 각 계정으로 로그인
- [ ] 헤더 드롭다운 확인
- [ ] 팀 관리 페이지 권한 표시 확인 (일관성)

---

## 🔄 후속 작업 (선택사항)

### 데이터 정리
구 `role` 필드 완전 제거:

```sql
-- 1. role 필드 확인
SELECT id, email, role, simple_role FROM users WHERE role IS NOT NULL;

-- 2. role 필드를 NULL로 설정
UPDATE users SET role = NULL WHERE role IS NOT NULL;

-- 3. (선택) role 컬럼 제거
ALTER TABLE users DROP COLUMN role;
```

### 코드베이스 정리
```bash
# role 필드 사용하는 모든 코드 검색 및 제거
grep -r "\.role" src/ --include="*.tsx" --include="*.ts"
```

---

## 📋 체크리스트

### 수정 전 확인
- [x] 문제 재현 확인 (스크린샷)
- [x] 근본 원인 분석 완료
- [x] 영향 범위 파악 완료

### 수정 작업
- [ ] Header.tsx Line 72-76 수정
- [ ] getRoleLabel → getSimpleRoleLabel 변경
- [ ] 다른 파일에서 role 사용 여부 확인

### 테스트
- [ ] 최문호3 계정 로그인 → "일반 사용자" 확인
- [ ] 관리자 계정 로그인 → "관리자" 확인
- [ ] 팀 관리 페이지와 일관성 확인

### 문서화
- [x] 설계 문서 작성
- [ ] 구현 완료 문서 작성

---

## 📁 관련 파일

### 수정 대상
1. **src/components/dashboard/Header.tsx**
   - Line 72-76: 권한 표시 조건문
   - Line 112-121: getRoleLabel 함수

### 참고 파일
2. **src/app/dashboard/settings/page.tsx**
   - simple_role 사용 예시 (올바른 방식)

3. **src/components/users/EditUserModal.tsx**
   - simple_role 기반 권한 관리

---

## 🎯 기대 효과

### 사용자 경험
- 정확한 권한 정보 표시
- 팀 관리 페이지와 일관성 유지
- 혼란 방지

### 시스템 안정성
- 신규 권한 시스템으로 완전 전환
- 레거시 코드 제거
- 향후 유지보수 용이

---

**설계일**: 2025-12-26
**설계자**: Claude Code
**타입**: Bug Fix - UI Display
**우선순위**: Medium
**예상 작업 시간**: 10분
**영향**: Header 컴포넌트 권한 표시
