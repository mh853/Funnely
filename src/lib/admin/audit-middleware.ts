import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface AuditContext {
  userId?: string
  companyId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}

/**
 * 감사 로그 생성
 * 모든 중요한 관리자 작업을 자동으로 기록합니다.
 */
export async function createAuditLog(
  request: NextRequest,
  context: AuditContext
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // IP 주소 추출 (프록시 환경 고려)
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // User Agent 추출
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { error } = await supabase.from('audit_logs').insert({
      user_id: context.userId || null,
      company_id: context.companyId || null,
      action: context.action,
      entity_type: context.entityType || null,
      entity_id: context.entityId || null,
      metadata: context.metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    if (error) {
      console.error('[Audit Log] Failed to create audit log:', error)
      // 감사 로그 실패가 API 요청을 차단하지 않도록 에러를 던지지 않음
    }
  } catch (err) {
    console.error('[Audit Log] Exception while creating audit log:', err)
    // 감사 로그 실패가 API 요청을 차단하지 않도록 에러를 던지지 않음
  }
}

/**
 * 감사 로그 작업 상수
 * 모든 로깅 가능한 작업 타입을 정의합니다.
 */
export const AUDIT_ACTIONS = {
  // 회사 관리
  COMPANY_CREATE: 'company.create',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DELETE: 'company.delete',
  COMPANY_ACTIVATE: 'company.activate',
  COMPANY_DEACTIVATE: 'company.deactivate',
  COMPANY_VIEW: 'company.view',

  // 사용자 관리
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_ACTIVATE: 'user.activate',
  USER_DEACTIVATE: 'user.deactivate',

  // 리드 관리
  LEAD_CREATE: 'lead.create',
  LEAD_UPDATE: 'lead.update',
  LEAD_DELETE: 'lead.delete',
  LEAD_STATUS_CHANGE: 'lead.status_change',
  LEAD_BULK_UPDATE: 'lead.bulk_update',
  LEAD_EXPORT: 'lead.export',

  // 구독 관리
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_UPDATE: 'subscription.update',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',
  SUBSCRIPTION_RENEW: 'subscription.renew',

  // 결제 관리
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_ADJUST: 'payment.adjust',

  // 랜딩페이지 관리
  LANDING_PAGE_CREATE: 'landing_page.create',
  LANDING_PAGE_UPDATE: 'landing_page.update',
  LANDING_PAGE_DELETE: 'landing_page.delete',
  LANDING_PAGE_PUBLISH: 'landing_page.publish',
  LANDING_PAGE_UNPUBLISH: 'landing_page.unpublish',

  // 설정 변경
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_PRIVACY_UPDATE: 'settings.privacy_update',
  SETTINGS_NOTIFICATION_UPDATE: 'settings.notification_update',

  // 데이터 내보내기
  DATA_EXPORT: 'data.export',
  DATA_EXPORT_USERS: 'data.export_users',
  DATA_EXPORT_LEADS: 'data.export_leads',
  DATA_EXPORT_COMPANIES: 'data.export_companies',

  // 관리자 인증
  ADMIN_LOGIN: 'admin.login',
  ADMIN_LOGOUT: 'admin.logout',
  ADMIN_LOGIN_FAILED: 'admin.login_failed',

  // 지원 티켓
  SUPPORT_TICKET_CREATE: 'support.ticket_create',
  SUPPORT_TICKET_UPDATE: 'support.ticket_update',
  SUPPORT_TICKET_CLOSE: 'support.ticket_close',

  // 시스템 설정
  SYSTEM_SETTINGS_UPDATE: 'system.settings_update',
  SYSTEM_MAINTENANCE_START: 'system.maintenance_start',
  SYSTEM_MAINTENANCE_END: 'system.maintenance_end',

  // 공지사항
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_UPDATE: 'announcement.update',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  ANNOUNCEMENT_PUBLISH: 'announcement.publish',

  // 일괄 작업
  BULK_OPERATION_START: 'bulk.operation_start',
  BULK_OPERATION_COMPLETE: 'bulk.operation_complete',
  BULK_OPERATION_FAILED: 'bulk.operation_failed',
} as const

/**
 * 엔티티 타입 상수
 */
export const ENTITY_TYPES = {
  COMPANY: 'company',
  USER: 'user',
  LEAD: 'lead',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  LANDING_PAGE: 'landing_page',
  SUPPORT_TICKET: 'support_ticket',
  ANNOUNCEMENT: 'announcement',
  SETTINGS: 'settings',
} as const

/**
 * 감사 로그 헬퍼 함수
 * 자주 사용되는 로깅 패턴을 간편하게 사용할 수 있습니다.
 */
export const auditLogHelpers = {
  /**
   * 회사 관련 작업 로깅
   */
  async logCompanyAction(
    request: NextRequest,
    action: string,
    companyId: string,
    userId: string,
    metadata?: Record<string, any>
  ) {
    return createAuditLog(request, {
      userId,
      companyId,
      action,
      entityType: ENTITY_TYPES.COMPANY,
      entityId: companyId,
      metadata,
    })
  },

  /**
   * 사용자 관련 작업 로깅
   */
  async logUserAction(
    request: NextRequest,
    action: string,
    targetUserId: string,
    adminUserId: string,
    companyId?: string,
    metadata?: Record<string, any>
  ) {
    return createAuditLog(request, {
      userId: adminUserId,
      companyId,
      action,
      entityType: ENTITY_TYPES.USER,
      entityId: targetUserId,
      metadata,
    })
  },

  /**
   * 데이터 내보내기 작업 로깅
   */
  async logDataExport(
    request: NextRequest,
    exportType: string,
    userId: string,
    companyId?: string,
    metadata?: Record<string, any>
  ) {
    return createAuditLog(request, {
      userId,
      companyId,
      action: exportType,
      entityType: 'export',
      metadata: {
        ...metadata,
        exportedAt: new Date().toISOString(),
      },
    })
  },

  /**
   * 설정 변경 작업 로깅
   */
  async logSettingsChange(
    request: NextRequest,
    settingType: string,
    userId: string,
    companyId?: string,
    metadata?: Record<string, any>
  ) {
    return createAuditLog(request, {
      userId,
      companyId,
      action: settingType,
      entityType: ENTITY_TYPES.SETTINGS,
      metadata,
    })
  },
}
