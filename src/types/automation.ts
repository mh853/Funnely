// Phase 4.1: Automation Workflow Types

// ==================== Trigger Types ====================

export type TriggerType = 'schedule' | 'event' | 'condition'

/**
 * Schedule-based trigger using cron expressions
 * Example: "0 9 * * 1" = Every Monday at 9 AM
 */
export interface ScheduleTrigger {
  type: 'schedule'
  cron: string // Cron expression
  timezone: string // e.g., "Asia/Seoul"
}

/**
 * Event-based trigger for system events
 */
export interface EventTrigger {
  type: 'event'
  event:
    | 'subscription_created'
    | 'subscription_cancelled'
    | 'health_score_low'
    | 'payment_failed'
    | 'lead_imported'
    | 'churn_risk_detected'
  conditions?: Record<string, any> // Optional additional conditions
}

/**
 * Condition-based trigger checking metrics periodically
 */
export interface ConditionTrigger {
  type: 'condition'
  metric: 'health_score' | 'mrr' | 'usage_rate' | 'churn_risk'
  operator: '<' | '>' | '=' | '<=' | '>='
  value: number
  check_frequency: string // Cron expression for checking frequency
}

export type TriggerConfig = ScheduleTrigger | EventTrigger | ConditionTrigger

// ==================== Action Types ====================

/**
 * Send email action
 */
export interface SendEmailAction {
  type: 'send_email'
  template_id: string
  to: 'company_admin' | 'support_team' | 'custom'
  custom_email?: string
  variables?: Record<string, string>
}

/**
 * Create task action (for task management system)
 */
export interface CreateTaskAction {
  type: 'create_task'
  title: string
  description: string
  assignee_id?: string
  priority: 'low' | 'medium' | 'high'
  due_date?: string // ISO date string
}

/**
 * Update database field action
 */
export interface UpdateFieldAction {
  type: 'update_field'
  entity: 'company' | 'subscription' | 'lead'
  field: string
  value: any
}

/**
 * Send webhook action
 */
export interface SendWebhookAction {
  type: 'send_webhook'
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  body?: Record<string, any>
}

/**
 * Add tag action
 */
export interface AddTagAction {
  type: 'add_tag'
  entity: 'company' | 'lead'
  tag: string
}

/**
 * Change status action
 */
export interface ChangeStatusAction {
  type: 'change_status'
  entity: 'company' | 'subscription' | 'lead'
  status: string
}

export type WorkflowAction =
  | SendEmailAction
  | CreateTaskAction
  | UpdateFieldAction
  | SendWebhookAction
  | AddTagAction
  | ChangeStatusAction

// ==================== Workflow Definition ====================

/**
 * Automation workflow definition
 */
export interface AutomationWorkflow {
  id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_conditions: TriggerConfig
  actions: WorkflowAction[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Workflow creation/update payload
 */
export interface WorkflowPayload {
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_conditions: TriggerConfig
  actions: WorkflowAction[]
  is_active?: boolean
}

// ==================== Execution Types ====================

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string
  workflow_id: string
  triggered_by: 'schedule' | 'manual' | 'event'
  trigger_data?: Record<string, any>
  status: 'pending' | 'running' | 'success' | 'failed'
  started_at: string
  completed_at?: string
  error_message?: string
  execution_result?: Record<string, any>
  workflow?: AutomationWorkflow
}

/**
 * Workflow action execution log
 */
export interface WorkflowActionLog {
  id: string
  execution_id: string
  action_index: number
  action_type: string
  action_config: WorkflowAction
  status: 'pending' | 'success' | 'failed' | 'skipped'
  started_at: string
  completed_at?: string
  error_message?: string
  result?: Record<string, any>
}

/**
 * Workflow execution with action logs
 */
export interface WorkflowExecutionDetail extends WorkflowExecution {
  action_logs: WorkflowActionLog[]
}

// ==================== API Response Types ====================

export interface WorkflowsResponse {
  workflows: AutomationWorkflow[]
  total: number
}

export interface WorkflowExecutionsResponse {
  executions: WorkflowExecution[]
  total: number
}

export interface ExecuteWorkflowResponse {
  success: boolean
  execution_id: string
  message?: string
}

// ==================== Helper Types ====================

/**
 * Workflow filter options
 */
export interface WorkflowFilters {
  trigger_type?: TriggerType
  is_active?: boolean
  search?: string
}

/**
 * Execution filter options
 */
export interface ExecutionFilters {
  workflow_id?: string
  status?: 'pending' | 'running' | 'success' | 'failed'
  triggered_by?: 'schedule' | 'manual' | 'event'
  date_from?: string
  date_to?: string
}
