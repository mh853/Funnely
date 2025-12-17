// Phase 4.1: Workflow Engine
// Executes automation workflows with action sequencing and error handling

import type {
  AutomationWorkflow,
  WorkflowAction,
  SendEmailAction,
  CreateTaskAction,
  UpdateFieldAction,
  SendWebhookAction,
  AddTagAction,
  ChangeStatusAction,
} from '@/types/automation'
import type { SupabaseClient } from '@supabase/supabase-js'

export class WorkflowEngine {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Execute a workflow
   * @param workflowId - Workflow ID to execute
   * @param triggeredBy - How the workflow was triggered
   * @param triggerData - Context data for the trigger
   * @returns Execution ID
   */
  async executeWorkflow(
    workflowId: string,
    triggeredBy: 'schedule' | 'manual' | 'event',
    triggerData?: Record<string, any>
  ): Promise<string> {
    console.log(
      `[WorkflowEngine] Starting execution: workflow=${workflowId}, trigger=${triggeredBy}`
    )

    // 1. Create execution record
    const { data: execution, error: executionError } = await this.supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        triggered_by: triggeredBy,
        trigger_data: triggerData || null,
        status: 'running',
      })
      .select()
      .single()

    if (executionError || !execution) {
      throw new Error(`Failed to create execution: ${executionError?.message}`)
    }

    const executionId = execution.id

    try {
      // 2. Get workflow
      const { data: workflow, error: workflowError } = await this.supabase
        .from('automation_workflows')
        .select()
        .eq('id', workflowId)
        .single()

      if (workflowError || !workflow) {
        throw new Error(`Workflow not found: ${workflowId}`)
      }

      if (!workflow.is_active) {
        throw new Error(`Workflow is not active: ${workflowId}`)
      }

      // 3. Execute actions sequentially
      const actions = workflow.actions as WorkflowAction[]
      console.log(
        `[WorkflowEngine] Executing ${actions.length} actions for workflow ${workflowId}`
      )

      for (let i = 0; i < actions.length; i++) {
        await this.executeAction(executionId, i, actions[i], triggerData)
      }

      // 4. Mark execution as success
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          execution_result: {
            actions_executed: actions.length,
            success: true,
          },
        })
        .eq('id', executionId)

      console.log(`[WorkflowEngine] Execution completed successfully: ${executionId}`)

      return executionId
    } catch (error) {
      console.error(`[WorkflowEngine] Execution failed:`, error)

      // Mark execution as failed
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId)

      throw error
    }
  }

  /**
   * Execute a single action within a workflow
   */
  private async executeAction(
    executionId: string,
    actionIndex: number,
    action: WorkflowAction,
    context?: Record<string, any>
  ): Promise<void> {
    console.log(
      `[WorkflowEngine] Executing action ${actionIndex}: ${action.type}`
    )

    // Create action log
    const { data: actionLog, error: logError } = await this.supabase
      .from('workflow_action_logs')
      .insert({
        execution_id: executionId,
        action_index: actionIndex,
        action_type: action.type,
        action_config: action,
        status: 'pending',
      })
      .select()
      .single()

    if (logError || !actionLog) {
      throw new Error(`Failed to create action log: ${logError?.message}`)
    }

    try {
      let result: any = null

      // Execute based on action type
      switch (action.type) {
        case 'send_email':
          result = await this.executeSendEmail(action, context)
          break
        case 'create_task':
          result = await this.executeCreateTask(action, context)
          break
        case 'update_field':
          result = await this.executeUpdateField(action, context)
          break
        case 'send_webhook':
          result = await this.executeSendWebhook(action, context)
          break
        case 'add_tag':
          result = await this.executeAddTag(action, context)
          break
        case 'change_status':
          result = await this.executeChangeStatus(action, context)
          break
        default:
          throw new Error(`Unknown action type: ${(action as any).type}`)
      }

      // Mark action as success
      await this.supabase
        .from('workflow_action_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          result,
        })
        .eq('id', actionLog.id)

      console.log(`[WorkflowEngine] Action ${actionIndex} completed successfully`)
    } catch (error) {
      console.error(`[WorkflowEngine] Action ${actionIndex} failed:`, error)

      // Mark action as failed
      await this.supabase
        .from('workflow_action_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', actionLog.id)

      throw error
    }
  }

  // ==================== Action Executors ====================

  /**
   * Send email action (placeholder - will implement in Phase 4.4)
   */
  private async executeSendEmail(
    action: SendEmailAction,
    context?: any
  ): Promise<any> {
    console.log('[WorkflowEngine] Send email action:', action)
    // TODO: Implement in Phase 4.4 with email template system
    return {
      message: 'Email sending not yet implemented',
      template_id: action.template_id,
      to: action.to,
    }
  }

  /**
   * Create task action (placeholder - requires task management system)
   */
  private async executeCreateTask(
    action: CreateTaskAction,
    context?: any
  ): Promise<any> {
    console.log('[WorkflowEngine] Create task action:', action)
    // TODO: Integrate with task management system when available
    return {
      message: 'Task creation not yet implemented',
      title: action.title,
    }
  }

  /**
   * Update database field action
   */
  private async executeUpdateField(
    action: UpdateFieldAction,
    context?: any
  ): Promise<any> {
    const { entity, field, value } = action

    // Determine table name
    const tableName =
      entity === 'company'
        ? 'companies'
        : entity === 'subscription'
          ? 'company_subscriptions'
          : 'leads'

    // Get entity ID from context
    const entityId = context?.entity_id || context?.company_id || context?.id

    if (!entityId) {
      throw new Error(`No entity ID provided in context for update_field action`)
    }

    // Update the field
    const { error } = await this.supabase
      .from(tableName)
      .update({ [field]: value })
      .eq('id', entityId)

    if (error) {
      throw new Error(`Failed to update field: ${error.message}`)
    }

    return {
      updated: true,
      entity,
      field,
      value,
      entity_id: entityId,
    }
  }

  /**
   * Send webhook action
   */
  private async executeSendWebhook(
    action: SendWebhookAction,
    context?: any
  ): Promise<any> {
    const { url, method, headers, body } = action

    // Validate URL is HTTPS
    if (!url.startsWith('https://')) {
      throw new Error('Webhook URL must use HTTPS')
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...body,
        context, // Include trigger context
        timestamp: new Date().toISOString(),
      }),
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(
        `Webhook request failed: ${response.status} ${response.statusText}`
      )
    }

    return {
      status: response.status,
      ok: response.ok,
      url,
      response: responseText,
    }
  }

  /**
   * Add tag action
   */
  private async executeAddTag(
    action: AddTagAction,
    context?: any
  ): Promise<any> {
    const { entity, tag } = action

    // Determine table name
    const tableName = entity === 'company' ? 'companies' : 'leads'

    // Get entity ID from context
    const entityId = context?.entity_id || context?.company_id || context?.id

    if (!entityId) {
      throw new Error(`No entity ID provided in context for add_tag action`)
    }

    // Get current tags
    const { data: current, error: fetchError } = await this.supabase
      .from(tableName)
      .select('tags')
      .eq('id', entityId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch current tags: ${fetchError.message}`)
    }

    // Add new tag if not already present
    const currentTags = (current?.tags as string[]) || []
    if (!currentTags.includes(tag)) {
      const updatedTags = [...currentTags, tag]

      const { error: updateError } = await this.supabase
        .from(tableName)
        .update({ tags: updatedTags })
        .eq('id', entityId)

      if (updateError) {
        throw new Error(`Failed to add tag: ${updateError.message}`)
      }

      return {
        added: true,
        entity,
        tag,
        entity_id: entityId,
      }
    }

    return {
      added: false,
      message: 'Tag already exists',
      entity,
      tag,
    }
  }

  /**
   * Change status action
   */
  private async executeChangeStatus(
    action: ChangeStatusAction,
    context?: any
  ): Promise<any> {
    const { entity, status } = action

    // Determine table name
    const tableName =
      entity === 'company'
        ? 'companies'
        : entity === 'subscription'
          ? 'company_subscriptions'
          : 'leads'

    // Get entity ID from context
    const entityId = context?.entity_id || context?.company_id || context?.id

    if (!entityId) {
      throw new Error(`No entity ID provided in context for change_status action`)
    }

    // Update status
    const { error } = await this.supabase
      .from(tableName)
      .update({ status })
      .eq('id', entityId)

    if (error) {
      throw new Error(`Failed to change status: ${error.message}`)
    }

    return {
      updated: true,
      entity,
      status,
      entity_id: entityId,
    }
  }
}

/**
 * Helper function to create and execute a workflow
 */
export async function executeWorkflow(
  supabase: SupabaseClient,
  workflowId: string,
  triggeredBy: 'schedule' | 'manual' | 'event',
  triggerData?: Record<string, any>
): Promise<string> {
  const engine = new WorkflowEngine(supabase)
  return engine.executeWorkflow(workflowId, triggeredBy, triggerData)
}
