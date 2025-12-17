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

  // 구독 정보
  subscription: {
    // Plan info
    plan_id: string | null
    plan_name: string | null        // 'Free', 'Pro', 'Enterprise'

    // Pricing
    monthly_price: number           // 월 결제금액 (원)
    yearly_price: number            // 연 결제금액 (원)
    billing_cycle: 'monthly' | 'yearly' | null

    // Status
    status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none'

    // Dates
    trial_end_date: string | null   // 체험 종료일
    current_period_end: string | null // 다음 결제일
    subscribed_at: string | null    // 구독 시작일
    canceled_at: string | null      // 취소일

    // Payment history
    payment_stats: {
      total_paid: number            // 총 결제금액 (원)
      payment_count: number         // 결제 횟수
      last_payment_date: string | null // 최근 결제일
    }
  } | null  // null if no subscription
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
