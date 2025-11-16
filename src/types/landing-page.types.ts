/**
 * DB 게더링 랜딩 페이지 시스템 타입 정의
 */

// ============================================================================
// ENUMS
// ============================================================================

export type LeadStatus =
  | 'new'           // 신규
  | 'assigned'      // 배정됨
  | 'contacting'    // 연락중
  | 'consulting'    // 상담중
  | 'completed'     // 상담완료
  | 'on_hold'       // 보류
  | 'cancelled';    // 취소

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EventType =
  | 'consultation'  // 상담
  | 'callback'      // 재연락
  | 'meeting'       // 미팅
  | 'task'          // 업무
  | 'reminder';     // 리마인더

export type LandingPageStatus = 'draft' | 'published' | 'archived';

// ============================================================================
// FORM BUILDER TYPES
// ============================================================================

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    custom?: string;
  };
  options?: string[]; // For select/checkbox/radio
}

export interface FormTemplate {
  id: string;
  hospital_id: string;
  name: string;
  description?: string;
  fields: FormField[];
  validation_rules: Record<string, any>;
  success_message: string;
  style: {
    layout: 'stacked' | 'horizontal' | 'inline';
    buttonColor: string;
    [key: string]: any;
  };
  enable_timer: boolean;
  timer_deadline?: string;
  enable_counter: boolean;
  counter_limit?: number;
  counter_current: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// LANDING PAGE TYPES
// ============================================================================

export type SectionType =
  | 'hero'
  | 'features'
  | 'form'
  | 'testimonials'
  | 'cta'
  | 'timer'
  | 'faq'
  | 'pricing';

export interface SectionProps {
  [key: string]: any;
}

export interface Section {
  id: string;
  type: SectionType;
  props: SectionProps;
  styles?: React.CSSProperties;
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background?: string;
    text?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface LandingPage {
  id: string;
  hospital_id: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  template_id: string;
  theme: Theme;
  sections: Section[];
  meta_title?: string;
  meta_description?: string;
  meta_image?: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  views_count: number;
  submissions_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export interface Lead {
  id: string;
  hospital_id: string;
  landing_page_id?: string;

  // 개인정보
  name: string;
  phone: string; // 암호화된 전화번호
  phone_hash: string;
  email?: string;

  // 상담 정보
  consultation_items?: string[];
  preferred_date?: string;
  preferred_time?: string;
  message?: string;

  // 리드 관리
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to?: string;
  tags: string[];

  // 유입 분석
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  ip_address?: string;
  user_agent?: string;

  // 타임스탬프
  created_at: string;
  updated_at: string;
  first_contact_at?: string;
  last_contact_at?: string;
  completed_at?: string;
}

export interface LeadWithRelations extends Lead {
  landing_page?: {
    id: string;
    title: string;
    slug: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  attachments: string[];
  status_changed_from?: LeadStatus;
  status_changed_to?: LeadStatus;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface CalendarEvent {
  id: string;
  hospital_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  all_day: boolean;
  assigned_to: string[]; // User IDs
  reminder_minutes: number[];
  location?: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventWithRelations extends CalendarEvent {
  lead?: {
    id: string;
    name: string;
    phone: string;
  };
  assigned_users?: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface LandingPageAnalytics {
  id: string;
  landing_page_id: string;
  date: string;
  page_views: number;
  unique_visitors: number;
  form_submissions: number;
  conversion_rate: number;
  utm_breakdown: Record<string, number>;
  desktop_views: number;
  mobile_views: number;
  tablet_views: number;
  created_at: string;
}

// ============================================================================
// FORM SUBMISSION TYPES
// ============================================================================

export interface FormSubmission {
  landing_page_id: string;
  form_data: Record<string, any>;
  utm_params?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  metadata?: {
    referrer?: string;
    ip_address?: string;
    user_agent?: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface LeadsStats {
  total: number;
  new: number;
  assigned: number;
  contacting: number;
  consulting: number;
  completed: number;
  on_hold: number;
  cancelled: number;
  today: number;
  this_week: number;
  this_month: number;
  conversion_rate: number;
}

export interface CallCenterStats {
  total_leads: number;
  my_leads: number;
  pending_leads: number;
  completed_today: number;
  avg_response_time: number; // in minutes
  conversion_rate: number;
}
