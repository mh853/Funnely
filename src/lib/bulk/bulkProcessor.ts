// Phase 4.2: Bulk Operations Processor
// Handles batch processing of bulk operations on entities

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BulkEntityType,
  BulkOperationResponse,
  BulkOperationLog,
} from '@/types/bulk'
import { calculateHealthScore, toCustomerHealthScoreRow } from '@/lib/health/calculateHealthScore'

export class BulkProcessor {
  private static readonly BATCH_SIZE = 100 // Process 100 entities at a time

  constructor(private supabase: SupabaseClient) {}

  /**
   * Main entry point for bulk operation processing
   */
  async processOperation(
    entityType: BulkEntityType,
    operation: string,
    entityIds: string[],
    parameters: Record<string, any>,
    executedBy: string
  ): Promise<BulkOperationResponse> {
    console.log(
      `[BulkProcessor] Starting ${operation} on ${entityIds.length} ${entityType}(s)`
    )

    // 1. Create operation log
    const log = await this.createLog({
      entity_type: entityType,
      operation,
      entity_ids: entityIds,
      parameters,
      total_count: entityIds.length,
      executed_by: executedBy,
      status: 'processing',
    })

    // 2. Process entities in batches
    const errors: Array<{ entity_id: string; error_message: string }> = []
    let successCount = 0

    for (let i = 0; i < entityIds.length; i += BulkProcessor.BATCH_SIZE) {
      const batch = entityIds.slice(i, i + BulkProcessor.BATCH_SIZE)

      console.log(
        `[BulkProcessor] Processing batch ${Math.floor(i / BulkProcessor.BATCH_SIZE) + 1} (${batch.length} items)`
      )

      for (const entityId of batch) {
        try {
          await this.processEntity(entityType, operation, entityId, parameters)
          successCount++
        } catch (error) {
          console.error(
            `[BulkProcessor] Failed to process ${entityId}:`,
            error
          )
          errors.push({
            entity_id: entityId,
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    const failedCount = errors.length

    // 3. Update operation log
    await this.updateLog(log.id, {
      status: failedCount === 0 ? 'completed' : failedCount === entityIds.length ? 'failed' : 'completed',
      success_count: successCount,
      failed_count: failedCount,
      error_details: errors,
      completed_at: new Date().toISOString(),
    })

    console.log(
      `[BulkProcessor] Completed: ${successCount} success, ${failedCount} failed`
    )

    return {
      success: failedCount === 0,
      operation_id: log.id,
      total_count: entityIds.length,
      success_count: successCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message:
        failedCount === 0
          ? `모든 항목이 성공적으로 처리되었습니다 (${successCount}개)`
          : `${successCount}개 성공, ${failedCount}개 실패`,
    }
  }

  /**
   * Process a single entity based on type and operation
   */
  private async processEntity(
    entityType: BulkEntityType,
    operation: string,
    entityId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    switch (entityType) {
      case 'lead':
        return this.processLead(operation, entityId, parameters)
      case 'company':
        return this.processCompany(operation, entityId, parameters)
      case 'subscription':
        return this.processSubscription(operation, entityId, parameters)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  // ==================== Lead Operations ====================

  private async processLead(
    operation: string,
    leadId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    switch (operation) {
      case 'change_status': {
        const { error } = await this.supabase
          .from('leads')
          .update({ status: parameters.status })
          .eq('id', leadId)
        if (error) throw error
        break
      }

      case 'add_tags': {
        const { data: lead } = await this.supabase
          .from('leads')
          .select('tags')
          .eq('id', leadId)
          .single()

        const currentTags = (lead?.tags as string[]) || []
        const newTags = Array.from(
          new Set([...currentTags, ...parameters.tags])
        )

        const { error } = await this.supabase
          .from('leads')
          .update({ tags: newTags })
          .eq('id', leadId)
        if (error) throw error
        break
      }

      case 'remove_tags': {
        const { data: leadData } = await this.supabase
          .from('leads')
          .select('tags')
          .eq('id', leadId)
          .single()

        const filteredTags = ((leadData?.tags as string[]) || []).filter(
          (tag) => !parameters.tags.includes(tag)
        )

        const { error } = await this.supabase
          .from('leads')
          .update({ tags: filteredTags })
          .eq('id', leadId)
        if (error) throw error
        break
      }

      case 'assign': {
        const { error } = await this.supabase
          .from('leads')
          .update({ assigned_to: parameters.assignee_id })
          .eq('id', leadId)
        if (error) throw error
        break
      }

      case 'delete': {
        if (!parameters.confirm) {
          throw new Error('Delete operation requires confirmation')
        }

        const { error } = await this.supabase.from('leads').delete().eq('id', leadId)
        if (error) throw error
        break
      }

      case 'add_note': {
        // Add note to lead metadata or separate notes table if exists
        const { data: leadForNote } = await this.supabase
          .from('leads')
          .select('metadata')
          .eq('id', leadId)
          .single()

        const metadata = (leadForNote?.metadata as Record<string, any>) || {}
        const notes = (metadata.notes as Array<{ note: string; created_by: string; created_at: string }>) || []

        notes.push({
          note: parameters.note,
          created_by: parameters.created_by || 'system',
          created_at: new Date().toISOString(),
        })

        const { error } = await this.supabase
          .from('leads')
          .update({
            metadata: {
              ...metadata,
              notes,
            },
          })
          .eq('id', leadId)
        if (error) throw error
        break
      }

      default:
        throw new Error(`Unknown lead operation: ${operation}`)
    }
  }

  // ==================== Company Operations ====================

  private async processCompany(
    operation: string,
    companyId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    switch (operation) {
      case 'change_status': {
        // companies 테이블에는 'status' 컬럼이 없다 (is_active boolean + withdrawn_at으로 관리됨).
        // 존재하지 않는 컬럼에 update를 시도하면 매번 에러가 나며, 에러 체크가 없어 무시되어 왔다.
        const { error } = await this.supabase
          .from('companies')
          .update({ is_active: parameters.status === 'active' })
          .eq('id', companyId)
        if (error) throw error
        break
      }

      case 'add_tags': {
        const { data: company } = await this.supabase
          .from('companies')
          .select('tags')
          .eq('id', companyId)
          .single()

        const currentTags = (company?.tags as string[]) || []
        const newTags = Array.from(
          new Set([...currentTags, ...parameters.tags])
        )

        const { error } = await this.supabase
          .from('companies')
          .update({ tags: newTags })
          .eq('id', companyId)
        if (error) throw error
        break
      }

      case 'remove_tags': {
        const { data: companyData } = await this.supabase
          .from('companies')
          .select('tags')
          .eq('id', companyId)
          .single()

        const filteredTags = ((companyData?.tags as string[]) || []).filter(
          (tag) => !parameters.tags.includes(tag)
        )

        const { error } = await this.supabase
          .from('companies')
          .update({ tags: filteredTags })
          .eq('id', companyId)
        if (error) throw error
        break
      }

      case 'recalculate_health': {
        // Calculate health score
        const healthScore = await calculateHealthScore(companyId, this.supabase)
        const row = toCustomerHealthScoreRow(companyId, healthScore)

        // Check if today's score exists
        // 실제 테이블명은 'health_scores'가 아니라 'customer_health_scores'이다.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data: existingScore } = await this.supabase
          .from('customer_health_scores')
          .select('id')
          .eq('company_id', companyId)
          .gte('calculated_at', today.toISOString())
          .lt('calculated_at', tomorrow.toISOString())
          .single()

        if (existingScore) {
          // Update existing score
          const { error } = await this.supabase
            .from('customer_health_scores')
            .update(row)
            .eq('id', existingScore.id)
          if (error) throw error
        } else {
          // Insert new score
          const { error } = await this.supabase.from('customer_health_scores').insert(row)
          if (error) throw error
        }
        break
      }

      case 'assign_cs_manager': {
        const { error } = await this.supabase
          .from('companies')
          .update({ cs_manager_id: parameters.cs_manager_id })
          .eq('id', companyId)
        if (error) throw error
        break
      }

      case 'add_note': {
        // Add note to company metadata
        const { data: companyForNote } = await this.supabase
          .from('companies')
          .select('metadata')
          .eq('id', companyId)
          .single()

        const metadata = (companyForNote?.metadata as Record<string, any>) || {}
        const notes = (metadata.notes as any[]) || []

        notes.push({
          note: parameters.note,
          created_by: parameters.created_by || 'system',
          created_at: new Date().toISOString(),
        })

        const { error } = await this.supabase
          .from('companies')
          .update({
            metadata: {
              ...metadata,
              notes,
            },
          })
          .eq('id', companyId)
        if (error) throw error
        break
      }

      default:
        throw new Error(`Unknown company operation: ${operation}`)
    }
  }

  // ==================== Subscription Operations ====================

  private async processSubscription(
    operation: string,
    subscriptionId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    switch (operation) {
      case 'change_plan': {
        const { error } = await this.supabase
          .from('company_subscriptions')
          .update({
            plan_id: parameters.plan_id,
            // TODO: Handle effective_date and proration
          })
          .eq('id', subscriptionId)
        if (error) throw error
        break
      }

      case 'change_billing_cycle': {
        const { error } = await this.supabase
          .from('company_subscriptions')
          .update({ billing_cycle: parameters.billing_cycle })
          .eq('id', subscriptionId)
        if (error) throw error
        break
      }

      case 'change_status': {
        // 단건 관리자 API(/api/admin/subscriptions/[id])와 동일한 부작용을 적용한다.
        // status만 바꾸고 끝내면: cancelled 전환 시 cancelled_at이 비어있고,
        // expired/trial 등에서 active로 재활성화할 때 current_period_end가 과거이거나
        // 아예 null로 남아 미들웨어의 만료 체크를 통과하지 못하거나(access 차단) 반대로
        // 무기한 무료 이용이 가능해지는 등 실제 접근 제어가 깨진다.
        const updateData: Record<string, any> = { status: parameters.status }

        if (parameters.status === 'cancelled') {
          updateData.cancelled_at = new Date().toISOString()
        }

        if (parameters.status === 'trial') {
          const { data: current } = await this.supabase
            .from('company_subscriptions')
            .select('trial_end_date')
            .eq('id', subscriptionId)
            .single()

          if (!current?.trial_end_date) {
            const now = new Date()
            const trialEnd = new Date(now)
            trialEnd.setDate(trialEnd.getDate() + 7)
            updateData.trial_start_date = now.toISOString()
            updateData.trial_end_date = trialEnd.toISOString()
          }
        }

        if (parameters.status === 'active') {
          const { data: current } = await this.supabase
            .from('company_subscriptions')
            .select('status, current_period_end, billing_cycle')
            .eq('id', subscriptionId)
            .single()

          const reactivatingFromExpired =
            current && ['expired', 'cancelled', 'suspended'].includes(current.status)
          const periodEndInPast =
            current?.current_period_end && current.current_period_end < new Date().toISOString()
          const neverHadPeriod = current && !current.current_period_end

          if (reactivatingFromExpired || periodEndInPast || neverHadPeriod) {
            const now = new Date()
            const periodEnd = new Date(now)
            if (current?.billing_cycle === 'yearly') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1)
            }
            updateData.current_period_start = now.toISOString()
            updateData.current_period_end = periodEnd.toISOString()
            updateData.grace_period_end = null
            updateData.cancelled_at = null
          }
        }

        const { error } = await this.supabase
          .from('company_subscriptions')
          .update(updateData)
          .eq('id', subscriptionId)
        if (error) throw error
        break
      }

      case 'extend_next_billing': {
        // company_subscriptions에는 'next_billing_date' 컬럼이 없다. 다음 결제일에
        // 해당하는 실제 컬럼은 current_period_end이다 (존재하지 않는 컬럼을 select하면
        // 항상 undefined가 반환되어 이 작업은 매번 "no next billing date" 에러로 실패했다).
        const { data: subscription } = await this.supabase
          .from('company_subscriptions')
          .select('current_period_end')
          .eq('id', subscriptionId)
          .single()

        if (!subscription?.current_period_end) {
          throw new Error('Subscription has no current billing period end')
        }

        const currentDate = new Date(subscription.current_period_end)
        currentDate.setDate(currentDate.getDate() + parameters.days)

        const { error } = await this.supabase
          .from('company_subscriptions')
          .update({ current_period_end: currentDate.toISOString() })
          .eq('id', subscriptionId)
        if (error) throw error
        break
      }

      default:
        throw new Error(`Unknown subscription operation: ${operation}`)
    }
  }

  // ==================== Log Management ====================

  private async createLog(data: {
    entity_type: BulkEntityType
    operation: string
    entity_ids: string[]
    parameters: Record<string, any>
    total_count: number
    executed_by: string
    status: string
  }): Promise<BulkOperationLog> {
    const { data: log, error } = await this.supabase
      .from('bulk_operation_logs')
      .insert(data)
      .select()
      .single()

    if (error || !log) {
      throw new Error(`Failed to create bulk operation log: ${error?.message}`)
    }

    return log as BulkOperationLog
  }

  private async updateLog(
    logId: string,
    updates: {
      status: string
      success_count: number
      failed_count: number
      error_details: Array<{ entity_id: string; error_message: string }>
      completed_at: string
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('bulk_operation_logs')
      .update(updates)
      .eq('id', logId)

    if (error) {
      console.error(
        `[BulkProcessor] Failed to update log ${logId}:`,
        error
      )
    }
  }
}

/**
 * Helper function to execute bulk operation
 */
export async function executeBulkOperation(
  supabase: SupabaseClient,
  entityType: BulkEntityType,
  operation: string,
  entityIds: string[],
  parameters: Record<string, any>,
  executedBy: string
): Promise<BulkOperationResponse> {
  const processor = new BulkProcessor(supabase)
  return processor.processOperation(
    entityType,
    operation,
    entityIds,
    parameters,
    executedBy
  )
}
