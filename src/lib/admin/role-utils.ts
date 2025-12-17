import type { UserRole } from '@/types/admin'

export interface RoleInfo {
  label: string
  description: string
  badgeColor: string
  permissions: string[]
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  // 3단계 권한 시스템
  admin: {
    label: '관리자',
    description: '모든 시스템 기능에 대한 전체 권한',
    badgeColor: 'bg-purple-100 text-purple-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports', 'manage_billing'],
  },
  manager: {
    label: '매니저',
    description: '마케팅 캠페인 및 리드 관리',
    badgeColor: 'bg-blue-100 text-blue-700',
    permissions: ['manage_leads', 'manage_pages', 'view_reports'],
  },
  user: {
    label: '일반 사용자',
    description: '리드 관리 및 페이지 조회',
    badgeColor: 'bg-gray-100 text-gray-700',
    permissions: ['manage_leads', 'view_pages'],
  },
  // Backward compatibility - 기존 데이터 자동 매핑
  company_owner: {
    label: '관리자',
    description: '모든 시스템 기능에 대한 전체 권한',
    badgeColor: 'bg-purple-100 text-purple-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports', 'manage_billing'],
  },
  company_admin: {
    label: '관리자',
    description: '모든 시스템 기능에 대한 전체 권한',
    badgeColor: 'bg-purple-100 text-purple-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports', 'manage_billing'],
  },
  marketing_manager: {
    label: '매니저',
    description: '마케팅 캠페인 및 리드 관리',
    badgeColor: 'bg-blue-100 text-blue-700',
    permissions: ['manage_leads', 'manage_pages', 'view_reports'],
  },
  marketing_staff: {
    label: '일반 사용자',
    description: '리드 관리 및 페이지 조회',
    badgeColor: 'bg-gray-100 text-gray-700',
    permissions: ['manage_leads', 'view_pages'],
  },
  viewer: {
    label: '일반 사용자',
    description: '리드 관리 및 페이지 조회',
    badgeColor: 'bg-gray-100 text-gray-700',
    permissions: ['manage_leads', 'view_pages'],
  },
  staff: {
    label: '일반 사용자',
    description: '리드 관리 및 페이지 조회',
    badgeColor: 'bg-gray-100 text-gray-700',
    permissions: ['manage_leads', 'view_pages'],
  },
}

export function getRoleLabel(role: UserRole | string): string {
  // admin_roles 테이블에서 온 한글 역할명은 그대로 반환
  if (role === '슈퍼 관리자' || role === '일반 사용자' || !ROLE_INFO[role as UserRole]) {
    return role
  }
  return ROLE_INFO[role as UserRole]?.label || role
}

export function getRoleDescription(role: UserRole): string {
  return ROLE_INFO[role]?.description || ''
}

export function getRoleBadgeColor(role: UserRole | string): string {
  // admin_roles 테이블에서 온 역할에 대한 색상 매핑
  if (role === '슈퍼 관리자') {
    return 'bg-red-100 text-red-700'
  }
  if (role === '일반 사용자') {
    return 'bg-gray-100 text-gray-700'
  }
  return ROLE_INFO[role as UserRole]?.badgeColor || 'bg-gray-100 text-gray-700'
}

export function getRolePermissions(role: UserRole): string[] {
  return ROLE_INFO[role]?.permissions || []
}

// 역할 선택 옵션 (3단계 권한 시스템)
export const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  {
    value: 'admin',
    label: '관리자',
    description: '모든 시스템 기능에 대한 전체 권한',
  },
  {
    value: 'manager',
    label: '매니저',
    description: '마케팅 캠페인 및 리드 관리',
  },
  {
    value: 'user',
    label: '일반 사용자',
    description: '리드 관리 및 페이지 조회',
  },
]

// 필터 옵션 (3단계)
export const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '전체 역할' },
  { value: 'admin', label: '관리자' },
  { value: 'manager', label: '매니저' },
  { value: 'user', label: '일반 사용자' },
]
