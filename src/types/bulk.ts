// Phase 4.2: Bulk Operations Types

// ==================== Entity Types ====================

export type BulkEntityType = 'lead' | 'company' | 'subscription'

// ==================== Operation Types ====================

export type LeadBulkOperation =
  | 'change_status'
  | 'add_tags'
  | 'remove_tags'
  | 'assign'
  | 'delete'
  | 'add_note'

export type CompanyBulkOperation =
  | 'change_status'
  | 'add_tags'
  | 'remove_tags'
  | 'recalculate_health'
  | 'add_note'
  | 'assign_cs_manager'

export type SubscriptionBulkOperation =
  | 'change_plan'
  | 'change_billing_cycle'
  | 'change_status'
  | 'extend_next_billing'

export type BulkOperation =
  | LeadBulkOperation
  | CompanyBulkOperation
  | SubscriptionBulkOperation

// ==================== Parameter Types ====================

export interface ChangeStatusParams {
  status: string
}

export interface TagParams {
  tags: string[]
}

export interface AssignParams {
  assignee_id: string
}

export interface DeleteParams {
  confirm: boolean
}

export interface AddNoteParams {
  note: string
  created_by?: string
}

export interface AssignCSManagerParams {
  cs_manager_id: string
}

export interface ChangePlanParams {
  plan_id: string
  effective_date?: string // ISO date
  prorate?: boolean
}

export interface ChangeBillingCycleParams {
  billing_cycle: 'monthly' | 'yearly'
  effective_date?: string
}

export interface ExtendNextBillingParams {
  days: number
}

// ==================== Request/Response Types ====================

/**
 * Bulk operation request payload
 */
export interface BulkOperationRequest {
  entity_type: BulkEntityType
  operation: string
  entity_ids: string[]
  parameters: Record<string, any>
}

/**
 * Bulk operation log record
 */
export interface BulkOperationLog {
  id: string
  entity_type: BulkEntityType
  operation: string
  entity_ids: string[]
  parameters: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_count: number
  success_count: number
  failed_count: number
  error_details: Array<{
    entity_id: string
    error_message: string
  }>
  executed_by?: string
  started_at: string
  completed_at?: string
  created_at: string
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean
  operation_id: string
  total_count: number
  success_count: number
  failed_count: number
  errors?: Array<{
    entity_id: string
    error_message: string
  }>
  message?: string
}

/**
 * Bulk operation progress tracking
 */
export interface BulkOperationProgress {
  operation_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_count: number
  processed_count: number
  success_count: number
  failed_count: number
  percentage: number
}

/**
 * Bulk operations list response
 */
export interface BulkOperationsListResponse {
  operations: BulkOperationLog[]
  total: number
}

// ==================== UI Helper Types ====================

export interface BulkOperationOption {
  value: string
  label: string
  description?: string
  requiresConfirmation?: boolean
}

export const LEAD_BULK_OPERATIONS: BulkOperationOption[] = [
  {
    value: 'change_status',
    label: '상태 변경',
    description: '리드 상태를 일괄 변경합니다',
  },
  {
    value: 'add_tags',
    label: '태그 추가',
    description: '선택한 리드에 태그를 추가합니다',
  },
  {
    value: 'remove_tags',
    label: '태그 제거',
    description: '선택한 리드에서 태그를 제거합니다',
  },
  {
    value: 'assign',
    label: '담당자 할당',
    description: '선택한 리드에 담당자를 할당합니다',
  },
  {
    value: 'add_note',
    label: '메모 추가',
    description: '선택한 리드에 메모를 추가합니다',
  },
  {
    value: 'delete',
    label: '삭제',
    description: '선택한 리드를 삭제합니다',
    requiresConfirmation: true,
  },
]

export const COMPANY_BULK_OPERATIONS: BulkOperationOption[] = [
  {
    value: 'change_status',
    label: '상태 변경',
    description: '회사 상태를 일괄 변경합니다',
  },
  {
    value: 'add_tags',
    label: '태그 추가',
    description: '선택한 회사에 태그를 추가합니다',
  },
  {
    value: 'remove_tags',
    label: '태그 제거',
    description: '선택한 회사에서 태그를 제거합니다',
  },
  {
    value: 'recalculate_health',
    label: '헬스 스코어 재계산',
    description: '선택한 회사의 헬스 스코어를 재계산합니다',
  },
  {
    value: 'assign_cs_manager',
    label: 'CS 매니저 할당',
    description: '선택한 회사에 CS 매니저를 할당합니다',
  },
  {
    value: 'add_note',
    label: '노트 추가',
    description: '선택한 회사에 노트를 추가합니다',
  },
]

export const SUBSCRIPTION_BULK_OPERATIONS: BulkOperationOption[] = [
  {
    value: 'change_plan',
    label: '플랜 변경',
    description: '구독 플랜을 일괄 변경합니다',
  },
  {
    value: 'change_billing_cycle',
    label: '결제 주기 변경',
    description: '월간/연간 결제 주기를 변경합니다',
  },
  {
    value: 'change_status',
    label: '상태 변경',
    description: '구독 상태를 일괄 변경합니다',
  },
  {
    value: 'extend_next_billing',
    label: '다음 결제일 연장',
    description: '다음 결제일을 지정한 일수만큼 연장합니다',
  },
]

// ==================== Helper Functions ====================

export function getOperationsForEntityType(
  entityType: BulkEntityType
): BulkOperationOption[] {
  switch (entityType) {
    case 'lead':
      return LEAD_BULK_OPERATIONS
    case 'company':
      return COMPANY_BULK_OPERATIONS
    case 'subscription':
      return SUBSCRIPTION_BULK_OPERATIONS
    default:
      return []
  }
}

export function requiresConfirmation(operation: string): boolean {
  return operation === 'delete'
}
