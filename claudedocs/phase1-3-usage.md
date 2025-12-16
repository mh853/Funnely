# Phase 1.3: RBAC (역할 기반 접근 제어) 사용 가이드

## 📋 개요

Phase 1.3에서 구현된 RBAC (Role-Based Access Control) 시스템의 사용 방법을 안내합니다.

---

## 🎯 주요 기능

1. **역할 관리**: 역할 생성, 수정, 삭제
2. **권한 체계**: 20+ 세분화된 권한
3. **역할 할당**: 사용자에게 역할 할당/제거
4. **권한 캐싱**: 5분 TTL 메모리 캐시로 성능 최적화
5. **감사 로깅**: 모든 역할 관리 작업 자동 기록

---

## 🖥️ UI 사용 방법

### 1. 역할 관리 페이지 접근

Admin 네비게이션에서 **"역할 관리"** 메뉴 클릭:
- URL: `/admin/settings/roles`
- 아이콘: Shield (방패)

### 2. 역할 목록 보기

**표시 정보**:
- 역할 이름 및 코드
- 설명
- 권한 수
- 할당된 사용자 수
- 생성일
- 기본 역할 배지 (super_admin, cs_manager, finance, analyst)

### 3. 새 역할 만들기

1. "새 역할 만들기" 버튼 클릭
2. 역할 정보 입력:
   - **코드**: 영문 소문자, 숫자, 언더스코어만 허용 (예: `content_manager`)
   - **이름**: 한글 이름 (예: `콘텐츠 관리자`)
   - **설명**: 역할에 대한 설명 (선택)
   - **권한**: 체크박스로 권한 선택
3. 저장 버튼 클릭

### 4. 역할 수정

1. 역할 행의 수정(Edit) 버튼 클릭
2. 정보 수정 (코드는 수정 불가)
3. 저장 버튼 클릭

**제약사항**:
- 기본 역할의 코드는 수정할 수 없음
- 이름, 설명, 권한은 수정 가능

### 5. 역할 삭제

1. 역할 행의 삭제(Trash) 버튼 클릭
2. 확인 대화상자에서 승인

**제약사항**:
- 기본 역할은 삭제 불가
- 사용자가 할당된 역할은 삭제 불가

---

## 💻 프로그래밍 방식 사용

### 1. 권한 체크 미들웨어

#### 단일 권한 체크

```typescript
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

export async function POST(request: NextRequest) {
  const adminUser = await getSuperAdminUser()

  // 권한 체크 (없으면 에러 throw)
  await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

  // 비즈니스 로직 진행...
}
```

#### 여러 권한 중 하나 (OR)

```typescript
import { requireAnyPermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

export async function GET(request: NextRequest) {
  const adminUser = await getSuperAdminUser()

  // VIEW_USERS 또는 MANAGE_USERS 권한 중 하나 필요
  await requireAnyPermission(adminUser.user.id, [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
  ])

  // 비즈니스 로직...
}
```

#### 모든 권한 필요 (AND)

```typescript
import { requireAllPermissions } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

export async function POST(request: NextRequest) {
  const adminUser = await getSuperAdminUser()

  // 두 권한 모두 필요
  await requireAllPermissions(adminUser.user.id, [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
  ])

  // 비즈니스 로직...
}
```

---

### 2. 사용자 권한 조회

```typescript
import { getUserPermissions, getUserWithRoles } from '@/lib/admin/rbac-middleware'

// 권한 목록만 가져오기
const permissions = await getUserPermissions(userId)
console.log(permissions) // ['manage_companies', 'view_users', ...]

// 사용자 정보 + 역할 + 권한
const userWithRoles = await getUserWithRoles(userId)
console.log(userWithRoles)
// {
//   id: '...',
//   email: 'user@example.com',
//   full_name: '홍길동',
//   roles: [{ id: '...', name: '고객 성공 매니저', ... }],
//   permissions: ['manage_support', 'view_health_scores', ...]
// }
```

---

### 3. API 엔드포인트 사용

#### 역할 목록 조회

```typescript
// GET /api/admin/roles?includeUsers=true
const response = await fetch('/api/admin/roles?includeUsers=true')
const data = await response.json()

console.log(data.roles) // 역할 배열
console.log(data.userCounts) // { roleId: userCount }
```

#### 역할 생성

```typescript
// POST /api/admin/roles
const response = await fetch('/api/admin/roles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'content_manager',
    name: '콘텐츠 관리자',
    description: '공지사항 및 콘텐츠 관리',
    permissions: [
      'manage_announcements',
      'view_companies',
      'view_users',
    ],
  }),
})

const data = await response.json()
console.log(data.role) // 생성된 역할
```

#### 역할 수정

```typescript
// PUT /api/admin/roles/[id]
const response = await fetch(`/api/admin/roles/${roleId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '콘텐츠 총괄 관리자', // 이름 변경
    permissions: [
      'manage_announcements',
      'view_companies',
      'view_users',
      'export_data', // 권한 추가
    ],
  }),
})
```

#### 역할 삭제

```typescript
// DELETE /api/admin/roles/[id]
const response = await fetch(`/api/admin/roles/${roleId}`, {
  method: 'DELETE',
})
```

#### 사용자 역할 조회

```typescript
// GET /api/admin/users/[userId]/roles
const response = await fetch(`/api/admin/users/${userId}/roles`)
const data = await response.json()

console.log(data.user.roles) // 할당된 역할 목록
console.log(data.user.permissions) // 모든 권한 합집합
```

#### 사용자에게 역할 할당

```typescript
// POST /api/admin/users/[userId]/roles
const response = await fetch(`/api/admin/users/${userId}/roles`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roleIds: [role1Id, role2Id], // 기존 역할 모두 교체
  }),
})
```

#### 사용자에게서 역할 제거

```typescript
// DELETE /api/admin/users/[userId]/roles/[roleId]
const response = await fetch(`/api/admin/users/${userId}/roles/${roleId}`, {
  method: 'DELETE',
})
```

#### 권한 목록 조회

```typescript
// GET /api/admin/permissions
const response = await fetch('/api/admin/permissions')
const data = await response.json()

console.log(data.permissions) // 모든 권한 정보
console.log(data.categories) // 카테고리별 그룹화
```

---

## 📊 사용 가능한 권한 목록

### 시스템
- `super_admin` - 슈퍼 관리자 (모든 권한)

### 회사 관리
- `manage_companies` - 회사 생성, 수정, 삭제
- `view_companies` - 회사 정보 조회

### 사용자 관리
- `manage_users` - 사용자 생성, 수정, 삭제
- `view_users` - 사용자 정보 조회

### 구독/청구
- `manage_subscriptions` - 구독 생성, 변경, 취소
- `view_subscriptions` - 구독 정보 조회
- `manage_billing` - 결제 및 청구 관리
- `view_billing` - 결제 및 청구 내역 조회

### 분석/리포트
- `view_analytics` - 분석 데이터 및 리포트 조회
- `export_data` - 데이터 CSV/Excel 내보내기

### 고객 성공
- `manage_support` - 고객 문의 및 지원 티켓 관리
- `view_health_scores` - 고객사 건강도 점수 조회
- `manage_onboarding` - 고객사 온보딩 프로세스 관리

### 시스템 설정
- `manage_system_settings` - 시스템 전체 설정 관리
- `manage_roles` - 관리자 역할 및 권한 관리
- `view_audit_logs` - 시스템 감사 로그 조회

### 보안/컴플라이언스
- `manage_privacy_requests` - GDPR/개인정보보호법 요청 처리

### 커뮤니케이션
- `manage_announcements` - 시스템 공지사항 작성 및 관리

---

## 🔒 보안 고려사항

### 1. 권한 에스컬레이션 방지

```typescript
// ✅ 안전: canAssignRole 함수가 체크
await canAssignRole(assignerId, roleId)

// ❌ 위험: 직접 할당하지 말 것
// 슈퍼 관리자 역할은 슈퍼 관리자만 할당 가능
```

### 2. 기본 역할 보호

```typescript
// 기본 역할 확인
import { isDefaultRole } from '@/types/rbac'

if (isDefaultRole(role.code)) {
  // 삭제 불가
  // code 수정 불가
  // 이름/설명/권한은 수정 가능
}
```

### 3. 캐시 무효화

역할이나 권한이 변경되면 자동으로 캐시가 무효화됩니다:

```typescript
// 역할 할당/제거 시
invalidateUserPermissionCache(userId)

// 역할 자체 변경 시 (모든 사용자 영향)
invalidateAllPermissionCaches()
```

---

## 🎯 모범 사례

### 1. 최소 권한 원칙

```typescript
// ✅ 좋은 예: 필요한 최소 권한만 부여
const customerSupportRole = {
  permissions: [
    'view_companies',    // 조회만
    'manage_support',    // 지원 티켓 관리
    'view_health_scores', // 건강도 조회만
  ],
}

// ❌ 나쁜 예: 과도한 권한
const customerSupportRole = {
  permissions: [
    'manage_companies',  // 삭제 권한까지 불필요
    'manage_users',      // 사용자 관리 불필요
    'super_admin',       // 절대 안됨!
  ],
}
```

### 2. 역할 이름 명명 규칙

```typescript
// ✅ 좋은 예
code: 'content_manager'      // 소문자_언더스코어
name: '콘텐츠 관리자'        // 명확한 한글 이름

// ❌ 나쁜 예
code: 'ContentManager'       // 카멜케이스 사용 금지
code: 'content-manager'      // 하이픈 사용 금지
name: 'CM'                   // 축약어 사용 지양
```

### 3. 역할 설명 작성

```typescript
// ✅ 좋은 예: 구체적인 설명
description: '공지사항 및 인앱 메시지 작성/관리 담당. 사용자 및 회사 정보 조회 가능.'

// ❌ 나쁜 예: 모호한 설명
description: '콘텐츠 담당자'
```

### 4. UI에서 권한 기반 조건부 렌더링

```typescript
import { PERMISSIONS } from '@/types/rbac'
import { usePermissions } from '@/hooks/usePermissions'

function CompanyManagementPage() {
  const { hasPermission } = usePermissions()

  return (
    <div>
      {/* 조회 권한만 있으면 목록 표시 */}
      {hasPermission(PERMISSIONS.VIEW_COMPANIES) && (
        <CompanyList />
      )}

      {/* 관리 권한 있으면 생성 버튼 표시 */}
      {hasPermission(PERMISSIONS.MANAGE_COMPANIES) && (
        <CreateCompanyButton />
      )}
    </div>
  )
}
```

---

## 📈 성능 최적화

### 1. 권한 캐싱

권한은 자동으로 5분간 메모리에 캐싱됩니다:

```typescript
// 첫 번째 호출: DB 쿼리
const permissions1 = await getUserPermissions(userId)

// 두 번째 호출 (5분 이내): 캐시에서 반환
const permissions2 = await getUserPermissions(userId) // 빠름!
```

### 2. 배치 권한 체크

```typescript
// ❌ 나쁜 예: 반복적인 DB 쿼리
for (const item of items) {
  await hasPermission(userId, PERMISSIONS.VIEW_COMPANIES) // 매번 쿼리
  // ...
}

// ✅ 좋은 예: 한 번만 조회
const permissions = await getUserPermissions(userId)
const canView = permissions.includes(PERMISSIONS.VIEW_COMPANIES)

for (const item of items) {
  if (canView) {
    // ...
  }
}
```

---

## 🔧 문제 해결

### 권한이 적용되지 않을 때

1. **캐시 확인**: 역할 변경 후 5분 기다리거나 서버 재시작
2. **역할 할당 확인**: 사용자에게 역할이 제대로 할당되었는지 확인
3. **권한 코드 확인**: 올바른 권한 코드를 사용하고 있는지 확인

```bash
# 데이터베이스에서 직접 확인
SELECT u.email, ar.name, ar.permissions
FROM users u
JOIN admin_role_assignments ara ON u.id = ara.user_id
JOIN admin_roles ar ON ara.role_id = ar.id
WHERE u.id = 'user-id';
```

### 403 Forbidden 에러

```typescript
// 에러 메시지 확인
if (error.message.startsWith('Permission denied')) {
  console.log(error.message) // "Permission denied: manage_companies"
}

// 필요한 권한 확인
await requirePermission(userId, PERMISSIONS.MANAGE_COMPANIES)
```

---

## 📚 추가 리소스

- **설계 문서**: [phase1-3-design.md](./phase1-3-design.md)
- **구현 진행**: [implementation-progress.md](./implementation-progress.md)
- **전체 설계**: [admin-enhancement-design.md](./admin-enhancement-design.md)
- **감사 로그**: [phase1-2-usage.md](./phase1-2-usage.md)
