# Phase 1.3: 역할 기반 접근 제어 (RBAC) 설계

## 📋 개요

Phase 1.3에서는 관리자에게 역할을 할당하고 권한을 관리하는 RBAC (Role-Based Access Control) 시스템을 구현합니다.

---

## 🎯 주요 목표

1. **역할 관리**: 사전 정의된 역할 및 커스텀 역할 생성/수정/삭제
2. **권한 체크**: 각 API 엔드포인트에서 권한 검증
3. **역할 할당**: 사용자에게 역할 할당 및 해제
4. **UI 통합**: 역할 관리 페이지 및 권한 기반 UI 표시

---

## 📐 시스템 아키텍처

### 데이터 흐름

```
User Request
    ↓
[Authorization Middleware]
    ↓
Check User Roles → admin_role_assignments
    ↓
Check Permissions → admin_roles.permissions
    ↓
Validate Action
    ↓
Allow/Deny Request
```

---

## 🗄️ 데이터 모델

### admin_roles 테이블

이미 Phase 1.1에서 생성됨:

```sql
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,  -- 권한 목록
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Seed 데이터** (4개 기본 역할):
- `super_admin`: 슈퍼 관리자 (모든 권한)
- `cs_manager`: 고객 성공 매니저
- `finance`: 재무 담당자
- `analyst`: 데이터 분석가

### admin_role_assignments 테이블

이미 Phase 1.1에서 생성됨:

```sql
CREATE TABLE admin_role_assignments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES admin_roles(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP,
  UNIQUE(user_id, role_id)
);
```

---

## 📊 TypeScript 인터페이스

```typescript
// src/types/rbac.ts
export interface AdminRole {
  id: string
  code: string
  name: string
  description: string | null
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface AdminRoleAssignment {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
  created_at: string
  updated_at: string
}

export interface UserWithRoles {
  id: string
  email: string
  full_name: string | null
  roles: AdminRole[]
  permissions: string[]  // 모든 역할의 권한 합집합
}

export interface RoleAssignmentRequest {
  userId: string
  roleIds: string[]
}

// 권한 상수
export const PERMISSIONS = {
  // 회사 관리
  MANAGE_COMPANIES: 'manage_companies',
  VIEW_COMPANIES: 'view_companies',

  // 사용자 관리
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // 구독 관리
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',
  VIEW_SUBSCRIPTIONS: 'view_subscriptions',

  // 결제/청구 관리
  MANAGE_BILLING: 'manage_billing',
  VIEW_BILLING: 'view_billing',

  // 분석 및 리포트
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',

  // 지원 및 고객 성공
  MANAGE_SUPPORT: 'manage_support',
  VIEW_HEALTH_SCORES: 'view_health_scores',
  MANAGE_ONBOARDING: 'manage_onboarding',

  // 시스템 설정
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // 개인정보/컴플라이언스
  MANAGE_PRIVACY_REQUESTS: 'manage_privacy_requests',

  // 커뮤니케이션
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',

  // 슈퍼 관리자 전용
  SUPER_ADMIN: 'super_admin',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
```

---

## 🔐 권한 검증 시스템

### 권한 체크 미들웨어

```typescript
// src/lib/admin/rbac-middleware.ts

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from './permissions'

/**
 * 사용자의 권한 목록 가져오기
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자의 모든 역할 가져오기
  const { data: assignments } = await supabase
    .from('admin_role_assignments')
    .select(`
      role:admin_roles(permissions)
    `)
    .eq('user_id', userId)

  if (!assignments || assignments.length === 0) {
    return []
  }

  // 모든 역할의 권한 합치기 (중복 제거)
  const allPermissions = assignments
    .flatMap(a => a.role?.permissions || [])

  return Array.from(new Set(allPermissions))
}

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export async function hasPermission(
  userId: string,
  requiredPermission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  // super_admin 권한이 있으면 모든 권한 허용
  if (permissions.includes('super_admin')) {
    return true
  }

  return permissions.includes(requiredPermission)
}

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인 (OR)
 */
export async function hasAnyPermission(
  userId: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  if (permissions.includes('super_admin')) {
    return true
  }

  return requiredPermissions.some(p => permissions.includes(p))
}

/**
 * 사용자가 모든 권한을 가지고 있는지 확인 (AND)
 */
export async function hasAllPermissions(
  userId: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  if (permissions.includes('super_admin')) {
    return true
  }

  return requiredPermissions.every(p => permissions.includes(p))
}

/**
 * 권한 체크 헬퍼 - API 라우트에서 사용
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<void> {
  const hasAccess = await hasPermission(userId, permission)

  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * 사용자의 역할 목록 가져오기
 */
export async function getUserRoles(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('admin_role_assignments')
    .select(`
      id,
      user_id,
      role_id,
      assigned_by,
      assigned_at,
      created_at,
      updated_at,
      role:admin_roles(*)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('[RBAC] Error fetching user roles:', error)
    return []
  }

  return data || []
}
```

---

## 🌐 API 엔드포인트 설계

### 1. GET /api/admin/roles

**목적**: 모든 역할 목록 조회

**권한**: `view_roles` 또는 `manage_roles`

**Query Parameters**:
- `includeUsers`: boolean (각 역할에 할당된 사용자 수 포함)

**Response**:
```typescript
{
  success: true,
  roles: AdminRole[],
  userCounts?: { [roleId: string]: number }
}
```

---

### 2. POST /api/admin/roles

**목적**: 새 역할 생성

**권한**: `manage_roles`

**Request Body**:
```typescript
{
  code: string,
  name: string,
  description?: string,
  permissions: string[]
}
```

**Response**:
```typescript
{
  success: true,
  role: AdminRole
}
```

---

### 3. PUT /api/admin/roles/[id]

**목적**: 기존 역할 수정

**권한**: `manage_roles`

**Request Body**:
```typescript
{
  name?: string,
  description?: string,
  permissions?: string[]
}
```

**주의**: 기본 역할(super_admin, cs_manager 등)의 code는 수정 불가

**Response**:
```typescript
{
  success: true,
  role: AdminRole
}
```

---

### 4. DELETE /api/admin/roles/[id]

**목적**: 역할 삭제

**권한**: `manage_roles`

**제약**:
- 기본 역할 삭제 불가
- 할당된 사용자가 있는 역할 삭제 불가 (또는 강제 삭제 옵션)

**Response**:
```typescript
{
  success: true,
  deletedRoleId: string
}
```

---

### 5. GET /api/admin/users/[userId]/roles

**목적**: 특정 사용자의 역할 조회

**권한**: `view_users` 또는 `manage_users`

**Response**:
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    full_name: string,
    roles: AdminRole[],
    permissions: string[]
  }
}
```

---

### 6. POST /api/admin/users/[userId]/roles

**목적**: 사용자에게 역할 할당

**권한**: `manage_roles`

**Request Body**:
```typescript
{
  roleIds: string[]
}
```

**동작**:
- 기존 역할 할당은 모두 제거
- 새로운 역할 목록으로 교체
- 감사 로그 생성

**Response**:
```typescript
{
  success: true,
  assignments: AdminRoleAssignment[]
}
```

---

### 7. DELETE /api/admin/users/[userId]/roles/[roleId]

**목적**: 사용자에게서 특정 역할 제거

**권한**: `manage_roles`

**Response**:
```typescript
{
  success: true,
  removedRoleId: string
}
```

---

### 8. GET /api/admin/permissions

**목적**: 사용 가능한 모든 권한 목록 조회

**권한**: `manage_roles`

**Response**:
```typescript
{
  success: true,
  permissions: {
    code: string,
    name: string,
    description: string,
    category: string
  }[]
}
```

---

## 🎨 UI 컴포넌트 설계

### 1. 역할 관리 페이지 (`/admin/settings/roles`)

**주요 섹션**:
- 역할 목록 테이블
- 역할 생성 버튼
- 각 역할의 사용자 수 표시
- 역할 수정/삭제 액션

**테이블 컬럼**:
- 역할 이름
- 설명
- 권한 수 (예: 5개 권한)
- 할당된 사용자 수
- 생성일
- 액션 (수정, 삭제)

---

### 2. 역할 생성/수정 모달

**필드**:
- 역할 코드 (생성 시만, 영문 소문자/언더스코어)
- 역할 이름 (한글)
- 설명 (옵션)
- 권한 체크박스 리스트 (카테고리별 그룹화)

**권한 카테고리**:
- 회사 관리
- 사용자 관리
- 구독/청구
- 분석/리포트
- 고객 성공
- 시스템 설정
- 보안/컴플라이언스

---

### 3. 사용자 역할 할당 모달 (`/admin/users` 페이지에서)

**기능**:
- 사용자 검색/선택
- 현재 할당된 역할 표시
- 역할 체크박스 (다중 선택 가능)
- 저장 시 기존 역할 교체

---

### 4. 권한 기반 UI 표시

**AdminNav 컴포넌트**:
```typescript
// 예시: 메뉴 아이템 조건부 렌더링
{hasPermission(userPermissions, PERMISSIONS.VIEW_COMPANIES) && (
  <NavItem href="/admin/companies" label="회사 관리" />
)}

{hasPermission(userPermissions, PERMISSIONS.MANAGE_ROLES) && (
  <NavItem href="/admin/settings/roles" label="역할 관리" />
)}
```

**버튼/액션 비활성화**:
```typescript
<Button
  disabled={!hasPermission(userPermissions, PERMISSIONS.MANAGE_USERS)}
  onClick={handleDeleteUser}
>
  사용자 삭제
</Button>
```

---

## 🔄 통합 전략

### 1. 기존 API에 권한 체크 추가

**예시: 회사 삭제 API**:

```typescript
// src/app/api/admin/companies/[id]/route.ts (DELETE)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 권한 체크 추가
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

    // 기존 로직 계속...
  } catch (error) {
    if (error.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

### 2. 감사 로그 통합

모든 역할 관리 작업은 감사 로그에 기록:

```typescript
// 역할 생성
await createAuditLog(request, {
  userId: adminUser.user.id,
  action: AUDIT_ACTIONS.ROLE_CREATE,
  entityType: 'admin_role',
  entityId: newRole.id,
  metadata: {
    roleCode: newRole.code,
    roleName: newRole.name,
    permissions: newRole.permissions,
  },
})

// 역할 할당
await createAuditLog(request, {
  userId: adminUser.user.id,
  action: AUDIT_ACTIONS.ROLE_ASSIGN,
  entityType: 'user',
  entityId: targetUserId,
  metadata: {
    assignedRoles: roleIds,
    assignedBy: adminUser.profile.full_name,
  },
})
```

**새 감사 액션**:
- `role.create`
- `role.update`
- `role.delete`
- `role.assign`
- `role.unassign`

---

## ⚡ 성능 최적화

### 1. 권한 캐싱

```typescript
// 간단한 메모리 캐시 (세션 동안 유지)
const permissionCache = new Map<string, {
  permissions: string[],
  timestamp: number
}>()

const CACHE_TTL = 5 * 60 * 1000 // 5분

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = permissionCache.get(userId)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions
  }

  // DB에서 권한 가져오기
  const permissions = await fetchPermissionsFromDB(userId)

  permissionCache.set(userId, {
    permissions,
    timestamp: Date.now(),
  })

  return permissions
}

// 역할 할당 변경 시 캐시 무효화
export function invalidateUserPermissionCache(userId: string) {
  permissionCache.delete(userId)
}
```

---

### 2. 데이터베이스 인덱스

이미 Phase 1.1에서 생성됨:
- `idx_role_assignment_user` on `admin_role_assignments(user_id)`
- `idx_role_assignment_role` on `admin_role_assignments(role_id)`
- `idx_admin_role_code` on `admin_roles(code)`

---

## 🔒 보안 고려사항

### 1. 권한 에스컬레이션 방지

- 사용자는 자신이 가지지 않은 권한을 다른 사용자에게 부여할 수 없음
- `manage_roles` 권한이 있어도 `super_admin` 역할은 특별 처리 필요

```typescript
// 역할 할당 시 체크
async function canAssignRole(assignerId: string, roleId: string): Promise<boolean> {
  const assignerPermissions = await getUserPermissions(assignerId)

  // 슈퍼 관리자는 모든 역할 할당 가능
  if (assignerPermissions.includes('super_admin')) {
    return true
  }

  // 슈퍼 관리자 역할은 슈퍼 관리자만 할당 가능
  const targetRole = await getRoleById(roleId)
  if (targetRole.code === 'super_admin') {
    return false
  }

  return assignerPermissions.includes('manage_roles')
}
```

---

### 2. 기본 역할 보호

- 기본 역할(super_admin, cs_manager, finance, analyst)은 삭제 불가
- 기본 역할의 code는 수정 불가 (이름/설명/권한은 수정 가능)

---

### 3. 최소 권한 원칙

- 새 사용자는 기본적으로 역할이 없음
- 명시적으로 역할을 할당해야 권한 획득
- 필요한 최소한의 권한만 부여

---

## 📝 구현 체크리스트

### Backend
- [ ] `src/types/rbac.ts` - TypeScript 인터페이스 및 권한 상수
- [ ] `src/lib/admin/rbac-middleware.ts` - 권한 체크 미들웨어
- [ ] `src/app/api/admin/roles/route.ts` - 역할 CRUD (GET, POST)
- [ ] `src/app/api/admin/roles/[id]/route.ts` - 역할 CRUD (PUT, DELETE)
- [ ] `src/app/api/admin/users/[userId]/roles/route.ts` - 사용자 역할 할당 (GET, POST)
- [ ] `src/app/api/admin/users/[userId]/roles/[roleId]/route.ts` - 역할 제거 (DELETE)
- [ ] `src/app/api/admin/permissions/route.ts` - 권한 목록 조회 (GET)

### Frontend
- [ ] `src/app/admin/settings/roles/page.tsx` - 역할 관리 페이지
- [ ] `src/components/admin/RoleModal.tsx` - 역할 생성/수정 모달
- [ ] `src/components/admin/UserRoleAssignmentModal.tsx` - 사용자 역할 할당 모달
- [ ] `src/hooks/usePermissions.ts` - 권한 체크 훅
- [ ] `src/app/admin/components/AdminNav.tsx` - 권한 기반 메뉴 표시 업데이트

### Integration
- [ ] 감사 로그 액션 추가 (`src/lib/admin/audit-middleware.ts`)
- [ ] 기존 API 엔드포인트에 권한 체크 추가 (우선순위 높은 것부터)

### Documentation
- [ ] `claudedocs/phase1-3-usage.md` - RBAC 사용 가이드

---

## 🎯 다음 단계

Phase 1.3 구현 완료 후:
- **Phase 1.4**: 기본 API 엔드포인트 구현
- 기존 API에 권한 체크 점진적 적용
- 사용자 피드백 수집 및 권한 체계 개선
