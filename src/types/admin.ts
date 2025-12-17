// Admin system type definitions

export interface CompanyListItem {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string

  // 담당자 정보
  admin_user: {
    id: string
    full_name: string
    email: string
  }

  // 통계
  stats: {
    total_users: number
    total_leads: number
    landing_pages_count: number
  }

  // 구독 정보 (나중에 추가)
  subscription?: {
    plan_type: string
    status: string
  }
}

export interface CompanyDetail extends CompanyListItem {
  // 추가 상세 정보
  phone?: string
  address?: string
  business_number?: string

  // 상세 통계
  detailed_stats: {
    active_users: number
    inactive_users: number
    leads_this_month: number
    leads_last_month: number
    active_landing_pages: number
  }

  recent_activities: Activity[]
}

export interface CompanyUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'user'  // 3단계 권한 (member → user로 변경)
  department?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
}

export interface Activity {
  id: string
  company_id: string
  user_id: string
  user_name: string
  action: string
  description: string
  metadata?: Record<string, any>
  ip_address?: string
  created_at: string
}

export interface CompanyFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
  planType: string
  dateRange: 'all' | '7d' | '30d' | '90d'
  sortBy: 'created_at' | 'name' | 'users_count' | 'leads_count'
  sortOrder: 'asc' | 'desc'
}

export interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CompaniesListResponse {
  companies: CompanyListItem[]
  pagination: PaginationInfo
}

export interface CompanyDetailResponse {
  company: CompanyDetail
}

export interface CompanyUsersResponse {
  users: CompanyUser[]
  pagination: PaginationInfo
}

export interface CompanyActivitiesResponse {
  activities: Activity[]
  pagination: PaginationInfo
}

// User Management Types (3단계 권한 시스템)
export type UserRole =
  | 'admin'     // 관리자 (구 company_owner, company_admin)
  | 'manager'   // 매니저 (구 marketing_manager)
  | 'user'      // 일반 사용자 (구 marketing_staff, viewer, staff)
  // Backward compatibility - 기존 데이터 마이그레이션용
  | 'company_owner'
  | 'company_admin'
  | 'marketing_manager'
  | 'marketing_staff'
  | 'viewer'
  | 'staff'

export interface UserListItem {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  company: {
    id: string
    name: string
  }
  stats: {
    total_leads: number
    total_landing_pages: number
  }
}

export interface UserDetail extends UserListItem {
  company: {
    id: string
    name: string
    is_active: boolean
  }
  stats: {
    total_leads: number
    total_landing_pages: number
    leads_this_month: number
    pages_published: number
  }
  recent_activities: Activity[]
  permissions: string[]
}

export interface UserActivity {
  id: string
  action: string
  description: string
  metadata: Record<string, any>
  ip_address: string
  created_at: string
}

export interface UsersListResponse {
  users: UserListItem[]
  pagination: PaginationInfo
  summary: {
    total_users: number
    active_users: number
    inactive_users: number
    by_role: Record<string, number>
    by_company: Array<{
      company_id: string
      company_name: string
      count: number
    }>
  }
}

export interface UserDetailResponse {
  user: UserDetail
}

export interface UserActivitiesResponse {
  activities: UserActivity[]
  pagination: PaginationInfo
}
