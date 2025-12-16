// RBAC (Role-Based Access Control) Types

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
  permissions: string[] // 모든 역할의 권한 합집합
}

export interface RoleAssignmentRequest {
  roleIds: string[]
}

export interface CreateRoleRequest {
  code: string
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permissions?: string[]
}

export interface PermissionInfo {
  code: string
  name: string
  description: string
  category: string
}

// 권한 상수
export const PERMISSIONS = {
  // 슈퍼 관리자 (모든 권한)
  SUPER_ADMIN: 'super_admin',

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
  CALCULATE_HEALTH_SCORES: 'calculate_health_scores',
  MANAGE_ONBOARDING: 'manage_onboarding',

  // 시스템 설정
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // 개인정보/컴플라이언스
  MANAGE_PRIVACY_REQUESTS: 'manage_privacy_requests',

  // 커뮤니케이션
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// 권한 정보 매핑 (UI 표시용)
export const PERMISSION_INFO: Record<string, PermissionInfo> = {
  [PERMISSIONS.SUPER_ADMIN]: {
    code: PERMISSIONS.SUPER_ADMIN,
    name: '슈퍼 관리자',
    description: '모든 권한 보유 (최상위 권한)',
    category: '시스템',
  },

  // 회사 관리
  [PERMISSIONS.MANAGE_COMPANIES]: {
    code: PERMISSIONS.MANAGE_COMPANIES,
    name: '회사 관리',
    description: '회사 생성, 수정, 삭제',
    category: '회사 관리',
  },
  [PERMISSIONS.VIEW_COMPANIES]: {
    code: PERMISSIONS.VIEW_COMPANIES,
    name: '회사 조회',
    description: '회사 정보 조회',
    category: '회사 관리',
  },

  // 사용자 관리
  [PERMISSIONS.MANAGE_USERS]: {
    code: PERMISSIONS.MANAGE_USERS,
    name: '사용자 관리',
    description: '사용자 생성, 수정, 삭제',
    category: '사용자 관리',
  },
  [PERMISSIONS.VIEW_USERS]: {
    code: PERMISSIONS.VIEW_USERS,
    name: '사용자 조회',
    description: '사용자 정보 조회',
    category: '사용자 관리',
  },

  // 구독 관리
  [PERMISSIONS.MANAGE_SUBSCRIPTIONS]: {
    code: PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    name: '구독 관리',
    description: '구독 생성, 변경, 취소',
    category: '구독/청구',
  },
  [PERMISSIONS.VIEW_SUBSCRIPTIONS]: {
    code: PERMISSIONS.VIEW_SUBSCRIPTIONS,
    name: '구독 조회',
    description: '구독 정보 조회',
    category: '구독/청구',
  },

  // 결제/청구
  [PERMISSIONS.MANAGE_BILLING]: {
    code: PERMISSIONS.MANAGE_BILLING,
    name: '청구 관리',
    description: '결제 및 청구 관리',
    category: '구독/청구',
  },
  [PERMISSIONS.VIEW_BILLING]: {
    code: PERMISSIONS.VIEW_BILLING,
    name: '청구 조회',
    description: '결제 및 청구 내역 조회',
    category: '구독/청구',
  },

  // 분석
  [PERMISSIONS.VIEW_ANALYTICS]: {
    code: PERMISSIONS.VIEW_ANALYTICS,
    name: '분석 조회',
    description: '분석 데이터 및 리포트 조회',
    category: '분석/리포트',
  },
  [PERMISSIONS.EXPORT_DATA]: {
    code: PERMISSIONS.EXPORT_DATA,
    name: '데이터 내보내기',
    description: '데이터 CSV/Excel 내보내기',
    category: '분석/리포트',
  },

  // 고객 성공
  [PERMISSIONS.MANAGE_SUPPORT]: {
    code: PERMISSIONS.MANAGE_SUPPORT,
    name: '지원 관리',
    description: '고객 문의 및 지원 티켓 관리',
    category: '고객 성공',
  },
  [PERMISSIONS.VIEW_HEALTH_SCORES]: {
    code: PERMISSIONS.VIEW_HEALTH_SCORES,
    name: '건강도 조회',
    description: '고객사 건강도 점수 조회',
    category: '고객 성공',
  },
  [PERMISSIONS.CALCULATE_HEALTH_SCORES]: {
    code: PERMISSIONS.CALCULATE_HEALTH_SCORES,
    name: '건강도 계산',
    description: '고객사 건강도 점수 계산 및 갱신',
    category: '고객 성공',
  },
  [PERMISSIONS.MANAGE_ONBOARDING]: {
    code: PERMISSIONS.MANAGE_ONBOARDING,
    name: '온보딩 관리',
    description: '고객사 온보딩 프로세스 관리',
    category: '고객 성공',
  },

  // 시스템 설정
  [PERMISSIONS.MANAGE_SYSTEM_SETTINGS]: {
    code: PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    name: '시스템 설정 관리',
    description: '시스템 전체 설정 관리',
    category: '시스템 설정',
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    code: PERMISSIONS.MANAGE_ROLES,
    name: '역할 관리',
    description: '관리자 역할 및 권한 관리',
    category: '시스템 설정',
  },
  [PERMISSIONS.VIEW_AUDIT_LOGS]: {
    code: PERMISSIONS.VIEW_AUDIT_LOGS,
    name: '감사 로그 조회',
    description: '시스템 감사 로그 조회',
    category: '시스템 설정',
  },

  // 개인정보/컴플라이언스
  [PERMISSIONS.MANAGE_PRIVACY_REQUESTS]: {
    code: PERMISSIONS.MANAGE_PRIVACY_REQUESTS,
    name: '개인정보 요청 관리',
    description: 'GDPR/개인정보보호법 요청 처리',
    category: '보안/컴플라이언스',
  },

  // 커뮤니케이션
  [PERMISSIONS.MANAGE_ANNOUNCEMENTS]: {
    code: PERMISSIONS.MANAGE_ANNOUNCEMENTS,
    name: '공지사항 관리',
    description: '시스템 공지사항 작성 및 관리',
    category: '커뮤니케이션',
  },
}

// 권한 카테고리별 그룹화
export const PERMISSION_CATEGORIES = [
  {
    name: '시스템',
    permissions: [PERMISSIONS.SUPER_ADMIN],
  },
  {
    name: '회사 관리',
    permissions: [PERMISSIONS.MANAGE_COMPANIES, PERMISSIONS.VIEW_COMPANIES],
  },
  {
    name: '사용자 관리',
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS],
  },
  {
    name: '구독/청구',
    permissions: [
      PERMISSIONS.MANAGE_SUBSCRIPTIONS,
      PERMISSIONS.VIEW_SUBSCRIPTIONS,
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.VIEW_BILLING,
    ],
  },
  {
    name: '분석/리포트',
    permissions: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EXPORT_DATA],
  },
  {
    name: '고객 성공',
    permissions: [
      PERMISSIONS.MANAGE_SUPPORT,
      PERMISSIONS.VIEW_HEALTH_SCORES,
      PERMISSIONS.CALCULATE_HEALTH_SCORES,
      PERMISSIONS.MANAGE_ONBOARDING,
    ],
  },
  {
    name: '시스템 설정',
    permissions: [
      PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
  },
  {
    name: '보안/컴플라이언스',
    permissions: [PERMISSIONS.MANAGE_PRIVACY_REQUESTS],
  },
  {
    name: '커뮤니케이션',
    permissions: [PERMISSIONS.MANAGE_ANNOUNCEMENTS],
  },
]

// 기본 역할 코드
export const DEFAULT_ROLES = {
  SUPER_ADMIN: 'super_admin',
  CS_MANAGER: 'cs_manager',
  FINANCE: 'finance',
  ANALYST: 'analyst',
} as const

// 기본 역할은 삭제 불가
export function isDefaultRole(roleCode: string): boolean {
  return Object.values(DEFAULT_ROLES).includes(
    roleCode as (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES]
  )
}

// 권한 체크 헬퍼
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // super_admin 권한이 있으면 모든 권한 허용
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) {
    return true
  }

  return userPermissions.includes(requiredPermission)
}

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) {
    return true
  }

  return requiredPermissions.some((p) => userPermissions.includes(p))
}

export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) {
    return true
  }

  return requiredPermissions.every((p) => userPermissions.includes(p))
}
