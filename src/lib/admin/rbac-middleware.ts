import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AdminRole, AdminRoleAssignment } from '@/types/rbac'

/**
 * 사용자의 권한 목록 가져오기
 * 캐싱 포함 (5분 TTL)
 */

// 간단한 메모리 캐시 (세션 동안 유지)
const permissionCache = new Map<
  string,
  {
    permissions: string[]
    timestamp: number
  }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5분

export async function getUserPermissions(
  userId: string
): Promise<string[]> {
  // 캐시 확인
  const cached = permissionCache.get(userId)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions
  }

  // DB에서 권한 가져오기
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자의 모든 역할 가져오기
  const { data: assignments, error } = await supabase
    .from('admin_role_assignments')
    .select(
      `
      role:admin_roles(permissions)
    `
    )
    .eq('user_id', userId)

  if (error) {
    console.error('[RBAC] Error fetching user permissions:', error)
    return []
  }

  if (!assignments || assignments.length === 0) {
    return []
  }

  // 모든 역할의 권한 합치기 (중복 제거)
  const allPermissions = assignments.flatMap(
    (a: any) => (a.role?.permissions as string[]) || []
  )

  const uniquePermissions = Array.from(new Set(allPermissions))

  // 캐시 저장
  permissionCache.set(userId, {
    permissions: uniquePermissions,
    timestamp: Date.now(),
  })

  return uniquePermissions
}

/**
 * 사용자 권한 캐시 무효화
 * 역할 할당 변경 시 호출
 */
export function invalidateUserPermissionCache(userId: string): void {
  permissionCache.delete(userId)
}

/**
 * 모든 캐시 무효화
 * 역할 자체가 변경된 경우 호출
 */
export function invalidateAllPermissionCaches(): void {
  permissionCache.clear()
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

  return requiredPermissions.some((p) => permissions.includes(p))
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

  return requiredPermissions.every((p) => permissions.includes(p))
}

/**
 * 권한 체크 헬퍼 - API 라우트에서 사용
 * 권한이 없으면 에러 throw
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
 * 여러 권한 중 하나라도 필요 (OR)
 */
export async function requireAnyPermission(
  userId: string,
  permissions: string[]
): Promise<void> {
  const hasAccess = await hasAnyPermission(userId, permissions)

  if (!hasAccess) {
    throw new Error(
      `Permission denied: requires one of [${permissions.join(', ')}]`
    )
  }
}

/**
 * 모든 권한 필요 (AND)
 */
export async function requireAllPermissions(
  userId: string,
  permissions: string[]
): Promise<void> {
  const hasAccess = await hasAllPermissions(userId, permissions)

  if (!hasAccess) {
    throw new Error(
      `Permission denied: requires all of [${permissions.join(', ')}]`
    )
  }
}

/**
 * 사용자의 역할 목록 가져오기 (상세 정보 포함)
 */
export async function getUserRoles(userId: string): Promise<
  Array<
    AdminRoleAssignment & {
      role: AdminRole | null
    }
  >
> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('admin_role_assignments')
    .select(
      `
      id,
      user_id,
      role_id,
      assigned_by,
      assigned_at,
      created_at,
      updated_at,
      role:admin_roles(*)
    `
    )
    .eq('user_id', userId)

  if (error) {
    console.error('[RBAC] Error fetching user roles:', error)
    return []
  }

  return (data as any) || []
}

/**
 * 역할 할당 가능 여부 확인
 * 권한 에스컬레이션 방지
 */
export async function canAssignRole(
  assignerId: string,
  roleId: string
): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 할당자의 권한 가져오기
  const assignerPermissions = await getUserPermissions(assignerId)

  // 슈퍼 관리자는 모든 역할 할당 가능
  if (assignerPermissions.includes('super_admin')) {
    return true
  }

  // manage_roles 권한이 없으면 불가
  if (!assignerPermissions.includes('manage_roles')) {
    return false
  }

  // 대상 역할 정보 가져오기
  const { data: targetRole } = await supabase
    .from('admin_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (!targetRole) {
    return false
  }

  // 슈퍼 관리자 역할은 슈퍼 관리자만 할당 가능
  if (targetRole.code === 'super_admin') {
    return false
  }

  return true
}

/**
 * 역할 수정 가능 여부 확인
 */
export async function canModifyRole(
  userId: string,
  roleCode: string
): Promise<{
  canModify: boolean
  reason?: string
}> {
  const permissions = await getUserPermissions(userId)

  // manage_roles 권한 필요
  if (
    !permissions.includes('super_admin') &&
    !permissions.includes('manage_roles')
  ) {
    return {
      canModify: false,
      reason: 'manage_roles 권한이 필요합니다',
    }
  }

  // 기본 역할의 code는 수정 불가
  const defaultRoleCodes = ['super_admin', 'cs_manager', 'finance', 'analyst']
  if (defaultRoleCodes.includes(roleCode)) {
    return {
      canModify: false,
      reason: '기본 역할은 수정할 수 없습니다',
    }
  }

  return { canModify: true }
}

/**
 * 역할 삭제 가능 여부 확인
 */
export async function canDeleteRole(
  userId: string,
  roleId: string
): Promise<{
  canDelete: boolean
  reason?: string
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const permissions = await getUserPermissions(userId)

  // manage_roles 권한 필요
  if (
    !permissions.includes('super_admin') &&
    !permissions.includes('manage_roles')
  ) {
    return {
      canDelete: false,
      reason: 'manage_roles 권한이 필요합니다',
    }
  }

  // 역할 정보 가져오기
  const { data: role } = await supabase
    .from('admin_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (!role) {
    return {
      canDelete: false,
      reason: '역할을 찾을 수 없습니다',
    }
  }

  // 기본 역할은 삭제 불가
  const defaultRoleCodes = ['super_admin', 'cs_manager', 'finance', 'analyst']
  if (defaultRoleCodes.includes(role.code)) {
    return {
      canDelete: false,
      reason: '기본 역할은 삭제할 수 없습니다',
    }
  }

  // 할당된 사용자가 있는지 확인
  const { count } = await supabase
    .from('admin_role_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)

  if (count && count > 0) {
    return {
      canDelete: false,
      reason: `${count}명의 사용자에게 할당된 역할은 삭제할 수 없습니다`,
    }
  }

  return { canDelete: true }
}

/**
 * 사용자와 역할 정보를 함께 가져오기
 */
export async function getUserWithRoles(userId: string): Promise<{
  id: string
  email: string
  full_name: string | null
  roles: AdminRole[]
  permissions: string[]
} | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 사용자 정보 가져오기
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single()

  if (!user) {
    return null
  }

  // 프로필 정보
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  // 역할 정보
  const roleAssignments = await getUserRoles(userId)
  const roles = roleAssignments
    .map((a) => a.role)
    .filter((r): r is AdminRole => r !== null)

  // 권한 목록
  const permissions = await getUserPermissions(userId)

  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || null,
    roles,
    permissions,
  }
}
