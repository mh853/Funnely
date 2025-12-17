// 기능 사용 분석 타입 정의

export interface FeatureUsage {
  id: string
  company_id: string
  feature_name: string
  usage_count: number
  last_used_at: string | null
  first_used_at: string
  unique_users: number
  adoption_rate: number
  created_at: string
  updated_at: string
}

export interface FeatureInfo {
  key: string
  display_name: string
  category: 'core' | 'collaboration' | 'advanced'
  description: string
}

export interface FeatureAnalysis {
  feature_name: string
  display_name: string
  category: string
  usage_count: number
  last_used_at: string | null
  unique_users: number
  adoption_rate: number
  is_used: boolean
}

export interface FeatureRecommendation {
  feature_name: string
  display_name: string
  reason: string
  benefit: string
  priority: 'low' | 'medium' | 'high'
}

export interface CompanyFeatureAnalysis {
  company: {
    id: string
    name: string
  }
  analysis: {
    total_features: number
    used_features: number
    adoption_rate: number
    features: FeatureAnalysis[]
    recommendations: FeatureRecommendation[]
  }
}

// 추적 대상 기능 목록
export const TRACKED_FEATURES: Record<string, FeatureInfo> = {
  landing_page_create: {
    key: 'landing_page_create',
    display_name: '랜딩페이지 생성',
    category: 'core',
    description: '새로운 랜딩페이지 생성',
  },
  landing_page_publish: {
    key: 'landing_page_publish',
    display_name: '랜딩페이지 발행',
    category: 'core',
    description: '랜딩페이지 공개 발행',
  },
  lead_collection: {
    key: 'lead_collection',
    display_name: '리드 수집',
    category: 'core',
    description: '리드 폼 제출 및 수집',
  },
  team_invite: {
    key: 'team_invite',
    display_name: '팀원 초대',
    category: 'collaboration',
    description: '팀원 추가 및 협업',
  },
  custom_domain: {
    key: 'custom_domain',
    display_name: '커스텀 도메인',
    category: 'advanced',
    description: '사용자 지정 도메인 연결',
  },
  api_integration: {
    key: 'api_integration',
    display_name: 'API 연동',
    category: 'advanced',
    description: 'API를 통한 외부 서비스 연동',
  },
  data_export: {
    key: 'data_export',
    display_name: '데이터 내보내기',
    category: 'advanced',
    description: 'CSV/Excel로 데이터 내보내기',
  },
}

export const FEATURE_CATEGORIES = {
  core: '핵심 기능',
  collaboration: '협업',
  advanced: '고급 기능',
}
