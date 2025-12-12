import type { UserRole } from '@/types/admin'

export interface RoleInfo {
  label: string
  description: string
  badgeColor: string
  permissions: string[]
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  company_owner: {
    label: '회사 소유자',
    description: '모든 시스템 기능에 대한 전체 권한',
    badgeColor: 'bg-purple-100 text-purple-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports', 'manage_billing'],
  },
  company_admin: {
    label: '회사 관리자',
    description: '회사 내 모든 사용자 및 리소스 관리',
    badgeColor: 'bg-blue-100 text-blue-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports'],
  },
  marketing_manager: {
    label: '마케팅 매니저',
    description: '마케팅 캠페인 및 리드 관리',
    badgeColor: 'bg-green-100 text-green-700',
    permissions: ['manage_leads', 'manage_pages', 'view_reports'],
  },
  marketing_staff: {
    label: '마케팅 스태프',
    description: '리드 관리 및 페이지 조회',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    permissions: ['manage_leads', 'view_pages'],
  },
  viewer: {
    label: '뷰어',
    description: '읽기 전용 권한',
    badgeColor: 'bg-gray-100 text-gray-700',
    permissions: ['view_leads', 'view_pages'],
  },
  // Legacy roles for backward compatibility
  admin: {
    label: '관리자 (구버전)',
    description: '회사 관리자와 동일 (마이그레이션 필요)',
    badgeColor: 'bg-blue-100 text-blue-700',
    permissions: ['manage_users', 'manage_leads', 'manage_pages', 'view_reports'],
  },
  manager: {
    label: '매니저 (구버전)',
    description: '마케팅 매니저와 동일 (마이그레이션 필요)',
    badgeColor: 'bg-green-100 text-green-700',
    permissions: ['manage_leads', 'manage_pages', 'view_reports'],
  },
  staff: {
    label: '스태프 (구버전)',
    description: '마케팅 스태프와 동일 (마이그레이션 필요)',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    permissions: ['manage_leads', 'view_pages'],
  },
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_INFO[role]?.label || role
}

export function getRoleDescription(role: UserRole): string {
  return ROLE_INFO[role]?.description || ''
}

export function getRoleBadgeColor(role: UserRole): string {
  return ROLE_INFO[role]?.badgeColor || 'bg-gray-100 text-gray-700'
}

export function getRolePermissions(role: UserRole): string[] {
  return ROLE_INFO[role]?.permissions || []
}

// 역할 선택 옵션 (UI에서 사용)
export const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  {
    value: 'company_owner',
    label: '회사 소유자',
    description: '모든 시스템 기능에 대한 전체 권한',
  },
  {
    value: 'company_admin',
    label: '회사 관리자',
    description: '회사 내 모든 사용자 및 리소스 관리',
  },
  {
    value: 'marketing_manager',
    label: '마케팅 매니저',
    description: '마케팅 캠페인 및 리드 관리',
  },
  {
    value: 'marketing_staff',
    label: '마케팅 스태프',
    description: '리드 관리 및 페이지 조회',
  },
  {
    value: 'viewer',
    label: '뷰어',
    description: '읽기 전용 권한',
  },
]

// 필터 옵션 (레거시 역할 포함)
export const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '전체 역할' },
  { value: 'company_owner', label: '회사 소유자' },
  { value: 'company_admin', label: '회사 관리자' },
  { value: 'marketing_manager', label: '마케팅 매니저' },
  { value: 'marketing_staff', label: '마케팅 스태프' },
  { value: 'viewer', label: '뷰어' },
]
