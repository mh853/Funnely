// Email Template System Types
// Phase 4.4: Email Template Management
// Leverages Phase 1.1 email_templates schema

export type EmailCategory = 'onboarding' | 'billing' | 'engagement' | 'support' | 'marketing'

export type TriggerType =
  | 'immediate'
  | 'scheduled'
  | 'event'
  | 'condition'

export interface EmailTrigger {
  type: TriggerType
  event?: string
  condition?: Record<string, unknown>
  delay_minutes?: number
}

export interface EmailSettings {
  fromName: string
  fromEmail: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  attachments?: string[]
  priority?: 'low' | 'normal' | 'high'
  trackOpens?: boolean
  trackClicks?: boolean
}

export interface EmailSchedule {
  type: 'immediate' | 'scheduled' | 'recurring'
  send_at?: string
  timezone?: string
  recurring_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    days_of_week?: number[]
    day_of_month?: number
  }
}

export interface EmailStats {
  sent: number
  opened: number
  clicked: number
  bounced: number
  failed?: number
  unsubscribed?: number
}

export interface EmailTemplate {
  id: string
  name: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject: string
  html_body: string  // Note: Phase 1.1 uses html_body, not body_html
  text_body?: string
  variables: string[]  // TEXT[] array, not JSONB
  settings: EmailSettings
  schedule?: EmailSchedule
  is_active: boolean
  stats: EmailStats
  created_by?: string
  created_at: string
  updated_at: string
}

export interface EmailTemplateCreateInput {
  name: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject: string
  html_body: string
  text_body?: string
  variables?: string[]
  settings: EmailSettings
  schedule?: EmailSchedule
  is_active?: boolean
}

export interface EmailTemplateUpdateInput {
  name?: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject?: string
  html_body?: string
  text_body?: string
  variables?: string[]
  settings?: EmailSettings
  schedule?: EmailSchedule
  is_active?: boolean
}

export interface EmailTemplateFilter {
  category?: EmailCategory
  is_active?: boolean
  search?: string
}

export interface EmailLog {
  id: string
  template_id: string
  recipient: string
  subject: string
  html_body: string
  text_body?: string
  status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked'
  error_message?: string
  sent_at: string
  opened_at?: string
  clicked_at?: string
  metadata?: Record<string, unknown>
}

export interface EmailVariable {
  key: string
  label: string
  description: string
  category: 'user' | 'company' | 'subscription' | 'lead' | 'system' | 'custom'
  example?: string
}

export const AVAILABLE_VARIABLES: readonly EmailVariable[] = [
  // User variables
  { key: 'user_name', label: '사용자 이름', description: '수신자 이름', category: 'user', example: '홍길동' },
  { key: 'user_email', label: '사용자 이메일', description: '수신자 이메일 주소', category: 'user', example: 'user@example.com' },
  { key: 'user_role', label: '사용자 역할', description: '수신자의 역할', category: 'user', example: '관리자' },

  // Company variables
  { key: 'company_name', label: '회사명', description: '고객사 회사명', category: 'company', example: 'ABC 병원' },
  { key: 'company_contact', label: '회사 연락처', description: '고객사 연락처', category: 'company', example: '02-1234-5678' },

  // Subscription variables
  { key: 'subscription_plan', label: '구독 플랜', description: '현재 구독 플랜명', category: 'subscription', example: 'Professional' },
  { key: 'subscription_status', label: '구독 상태', description: '구독 상태', category: 'subscription', example: '활성' },
  { key: 'subscription_end_date', label: '구독 만료일', description: '구독 종료일', category: 'subscription', example: '2024-12-31' },
  { key: 'billing_amount', label: '청구 금액', description: '다음 청구 금액', category: 'subscription', example: '99,000원' },

  // Lead variables
  { key: 'lead_name', label: '리드 이름', description: '리드 담당자 이름', category: 'lead', example: '김영희' },
  { key: 'lead_company', label: '리드 회사', description: '리드 회사명', category: 'lead', example: 'XYZ 클리닉' },
  { key: 'lead_status', label: '리드 상태', description: '현재 리드 상태', category: 'lead', example: '상담 중' },

  // System variables
  { key: 'action_url', label: '액션 URL', description: 'CTA 버튼 링크', category: 'system', example: 'https://app.medisync.com/action' },
  { key: 'unsubscribe_url', label: '수신거부 URL', description: '구독 취소 링크', category: 'system', example: 'https://app.medisync.com/unsubscribe' },
  { key: 'current_date', label: '현재 날짜', description: '이메일 발송 날짜', category: 'system', example: '2024-01-03' },
  { key: 'support_email', label: '고객지원 이메일', description: '고객지원 이메일 주소', category: 'system', example: 'support@medisync.com' },
] as const

export const EMAIL_CATEGORIES: readonly { value: EmailCategory; label: string; description: string }[] = [
  { value: 'onboarding', label: '온보딩', description: '신규 사용자 환영 및 안내' },
  { value: 'billing', label: '결제', description: '결제, 청구서, 영수증 관련' },
  { value: 'engagement', label: '참여 유도', description: '사용자 참여 및 활동 촉진' },
  { value: 'support', label: '고객지원', description: '고객 문의 및 지원 관련' },
  { value: 'marketing', label: '마케팅', description: '프로모션 및 마케팅 캠페인' },
] as const

export const TRIGGER_TYPES: readonly { value: TriggerType; label: string; description: string }[] = [
  { value: 'immediate', label: '즉시', description: '트리거 발생 시 즉시 발송' },
  { value: 'scheduled', label: '예약', description: '특정 시간에 발송' },
  { value: 'event', label: '이벤트', description: '특정 이벤트 발생 시' },
  { value: 'condition', label: '조건', description: '조건 충족 시' },
] as const
