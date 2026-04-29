/**
 * 커스텀 도메인 관련 타입 정의
 */

export type DomainVerificationStatus = 'pending' | 'verified' | 'failed'
export type DomainSslStatus = 'pending' | 'active' | 'error'
export type DomainConfigType = 'cname' | 'a_record'

export interface CompanyCustomDomain {
  id: string
  company_id: string
  domain: string
  is_company_default: boolean

  // 소유권 인증
  verification_token: string
  verification_status: DomainVerificationStatus
  verified_at: string | null
  last_verification_attempt_at: string | null
  verification_error: string | null

  // Vercel 등록
  vercel_registered: boolean
  vercel_registered_at: string | null
  vercel_config_type: DomainConfigType | null

  // SSL
  ssl_status: DomainSslStatus
  ssl_checked_at: string | null

  created_at: string
  updated_at: string
}

/**
 * DNS 설정 안내 정보
 * Vercel API에서 반환하는 DNS 설정값
 */
export interface DomainDnsConfig {
  /** CNAME 대상 (cname.vercel-dns.com) */
  cname?: string
  /** A 레코드 IP 주소 */
  aValues?: string[]
  /** 권장 설정 방식 */
  configType: DomainConfigType
}

/**
 * 도메인 등록 요청 body
 */
export interface CreateCustomDomainRequest {
  domain: string
}

/**
 * 도메인 업데이트 요청 body
 */
export interface UpdateCustomDomainRequest {
  is_company_default?: boolean
}

/**
 * 도메인 인증 확인 결과
 */
export interface DomainVerificationResult {
  verified: boolean
  message: string
  /** 재시도 권장 시간 (초) */
  retryAfter?: number
}

/**
 * Vercel API 도메인 등록 결과
 */
export interface VercelDomainRegistrationResult {
  registered: boolean
  dnsConfig: DomainDnsConfig
  message: string
}

/**
 * 랜딩페이지 URL 결정에 필요한 도메인 컨텍스트
 */
export interface LandingPageDomainContext {
  /** 랜딩페이지별 커스텀 도메인 (1순위) */
  landingPageDomain?: string | null
  /** 회사 기본 커스텀 도메인 (2순위) */
  companyDefaultDomain?: string | null
  /** 서비스 서브도메인용 companyShortId (3순위 폴백) */
  companyShortId: string
}
