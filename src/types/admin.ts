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
  role: 'admin' | 'manager' | 'member'
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
