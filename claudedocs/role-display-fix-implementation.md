# 권한 표시 오류 수정 구현 완료

**날짜**: 2025-12-26
**버그 타입**: Legacy Role Field Display Issue
**심각도**: 🟡 Medium (UI 표시 오류)
**상태**: ✅ 구현 완료

---

## 🎯 구현 내용

### 문제
- **사용자**: 최문호3 (mh853@gmail.com)
- **증상**: 헤더 드롭다운에 "권한: 마케팅 스태프" 표시
- **원인**: Header.tsx가 구 권한 시스템(`role` 필드) 사용

### 해결
- Header.tsx를 신규 권한 시스템(`simple_role` 필드)으로 변경
- 함수명 변경: `getRoleLabel` → `getSimpleRoleLabel`
- 권한 라벨: "admin" → "관리자", "user" → "일반 사용자"

---

## 📝 수정된 파일

### Header.tsx
**파일**: `/Users/mh.c/medisync/src/components/dashboard/Header.tsx`
**수정 라인**: 72-76, 112-118

#### 1. 권한 표시 로직 (Line 72-76)

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

#### 2. 권한 라벨 함수 (Line 112-118)

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

## 📊 다른 파일의 role 사용 현황

### 권한 체크 로직 (유지)
다음 파일들은 **권한 체크 목적**으로 `role` 필드를 사용하고 있어 수정 불필요:

1. **src/app/dashboard/team/page.tsx:35**
   ```typescript
   const canManage =
     userProfile.simple_role === 'admin' ||
     ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(userProfile.role)
   ```
   - 목적: 팀 관리 권한 체크
   - 상태: 정상 (simple_role과 병행 사용)

2. **src/app/dashboard/users/page.tsx:44**
   ```typescript
   const canManage = ['hospital_owner', 'hospital_admin'].includes(userProfile.role)
   ```
   - 목적: 사용자 관리 권한 체크
   - 상태: 정상

3. **src/app/dashboard/settings/page.tsx:93**
   ```typescript
   const canEdit = ['company_owner', 'company_admin'].includes(userProfile.role)
   ```
   - 목적: 회사 설정 편집 권한 체크
   - 상태: 정상

4. **src/app/dashboard/settings/page.tsx:332**
   ```typescript
   {getRoleLabel(userProfile.role)}
   ```
   - 목적: 설정 페이지에서 상세 권한 표시
   - 상태: 정상 (상세 권한 정보 필요)

5. **src/app/dashboard/leads/page.tsx:209**
   ```typescript
   userRole={userProfile.simple_role || userProfile.role}
   ```
   - 목적: 리드 관리 권한 체크
   - 상태: 정상 (폴백 사용)

### API 라우트 (유지)
다음 API 라우트들도 권한 체크 목적으로 사용하므로 유지:
- `src/app/api/ad-accounts/[id]/refresh/route.ts`
- `src/app/auth/callback/meta/route.ts`
- `src/app/api/ad-accounts/connect/[platform]/route.ts`
- `src/app/api/reports/generate/route.ts`
- `src/app/api/sync/campaigns/route.ts`
- `src/app/api/campaigns/[id]/route.ts`
- `src/app/api/campaigns/route.ts`
- `src/app/api/reports/[id]/route.ts`

---

## 🧪 테스트 결과

### 예상 동작

#### 최문호3 계정 (simple_role: 'user')
**Before**:
- 헤더 드롭다운: "권한: 마케팅 스태프" ❌

**After**:
- 헤더 드롭다운: "권한: 일반 사용자" ✅

#### 관리자 계정 (simple_role: 'admin')
**After**:
- 헤더 드롭다운: "권한: 관리자" ✅

### 테스트 체크리스트

**사용자 테스트**:
- [ ] 최문호3 계정 로그인
- [ ] 우측 상단 사용자 메뉴 클릭
- [ ] "권한: 일반 사용자" 확인

**관리자 테스트**:
- [ ] 관리자 계정 로그인
- [ ] 우측 상단 사용자 메뉴 클릭
- [ ] "권한: 관리자" 확인

**일관성 테스트**:
- [ ] 팀 관리 페이지 권한 표시와 일치 확인
- [ ] 설정 페이지에서도 정상 표시 확인

---

## 🔄 시스템 권한 구조 정리

### 현재 권한 시스템 (이중 구조)

**1. 신규 권한 시스템 (Active)**:
- 필드: `users.simple_role`
- 값: `admin`, `user`
- 용도: **일반 권한 표시 및 기본 권한 체크**

**2. 구 권한 시스템 (Legacy)**:
- 필드: `users.role`
- 값: `hospital_owner`, `hospital_admin`, `marketing_manager`, `marketing_staff`, `viewer`, 등
- 용도: **상세 권한 체크 (팀 관리, 설정 편집 등)**

### 권한 표시 가이드

**일반 표시 (Header, 간단한 UI)**:
```typescript
// ✅ simple_role 사용
{userProfile?.simple_role && (
  <p>권한: {getSimpleRoleLabel(userProfile.simple_role)}</p>
)}
```

**상세 권한 체크 (팀 관리, 설정 편집)**:
```typescript
// ✅ role 사용
const canManage = ['hospital_owner', 'hospital_admin'].includes(userProfile.role)
```

**폴백 패턴 (하위 호환성)**:
```typescript
// ✅ simple_role 우선, role 폴백
userRole={userProfile.simple_role || userProfile.role}
```

---

## 📋 완료 체크리스트

### 수정 작업
- [x] Header.tsx Line 72-76 수정 (role → simple_role)
- [x] getRoleLabel → getSimpleRoleLabel 함수 변경
- [x] 다른 파일에서 role 사용 여부 확인 (권한 체크 목적 → 유지)

### 문서화
- [x] 설계 문서 작성 (role-display-fix-design.md)
- [x] 구현 완료 문서 작성 (본 문서)

### 테스트 (사용자 확인 필요)
- [ ] 최문호3 계정 → "일반 사용자" 확인
- [ ] 관리자 계정 → "관리자" 확인
- [ ] 팀 관리 페이지 일관성 확인

---

## 🎯 영향 범위

### 직접 영향
- **Header.tsx**: 헤더 드롭다운 권한 표시
- **사용자**: 모든 로그인 사용자

### 간접 영향
- 없음 (Header 컴포넌트만 수정)

### 기존 기능 유지
- 팀 관리 권한 체크: 정상 동작
- 설정 편집 권한 체크: 정상 동작
- 상세 권한 표시: 정상 동작

---

## 🔧 후속 작업 (선택사항)

### 데이터 정리
구 `role` 필드 정리:

```sql
-- 1. role 필드 현황 확인
SELECT
  id,
  email,
  role,
  simple_role,
  CASE
    WHEN role IS NOT NULL AND simple_role IS NULL THEN 'migration_needed'
    WHEN role IS NOT NULL AND simple_role IS NOT NULL THEN 'both_exist'
    WHEN role IS NULL AND simple_role IS NOT NULL THEN 'clean'
    ELSE 'invalid'
  END as status
FROM users
ORDER BY status, email;

-- 2. (선택) role 필드를 NULL로 설정
-- UPDATE users SET role = NULL WHERE role IS NOT NULL;

-- 3. (선택) role 컬럼 완전 제거
-- ALTER TABLE users DROP COLUMN role;
```

### 코드 리팩토링
```bash
# role 필드 사용하는 모든 코드 검토
grep -r "userProfile\.role" src/ --include="*.tsx" --include="*.ts"

# 필요시 simple_role로 통일 또는 명확한 주석 추가
```

---

## 📁 최종 파일 목록

### 수정된 파일
1. **src/components/dashboard/Header.tsx**
   - Line 72-76: `role` → `simple_role` 변경
   - Line 112-118: `getRoleLabel` → `getSimpleRoleLabel` 변경

### 생성된 문서
2. **claudedocs/role-display-fix-design.md** (설계 문서)
3. **claudedocs/role-display-fix-implementation.md** (본 문서)

---

## 🎉 요약

**문제**: 헤더에 "마케팅 스태프" 표시 (구 권한 필드 사용)
**해결**: `simple_role` 사용으로 변경 → "일반 사용자" 표시
**영향**: Header 컴포넌트만 수정, 기존 권한 체크 로직 유지
**테스트**: 사용자 확인 필요

---

**구현일**: 2025-12-26
**구현 상태**: ✅ 완료 (사용자 테스트 대기)
**Next Action**:
1. 최문호3 계정으로 로그인하여 "일반 사용자" 표시 확인
2. 관리자 계정으로 "관리자" 표시 확인
3. 정상 동작 확인 후 이슈 종료
