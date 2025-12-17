// Phase 4.2: Bulk Operations Processor
// Handles batch processing of bulk operations on entities

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BulkEntityType,
  BulkOperationResponse,
  BulkOperationLog,
} from '@/types/bulk'
import { calculateHealthScore } from '@/lib/health/calculateHealthScore'

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
      case 'change_status':
        await this.supabase
          .from('leads')
          .update({ status: parameters.status })
          .eq('id', leadId)
        break

      case 'add_tags':
        const { data: lead } = await this.supabase
          .from('leads')
          .select('tags')
          .eq('id', leadId)
          .single()

        const currentTags = (lead?.tags as string[]) || []
        const newTags = Array.from(
          new Set([...currentTags, ...parameters.tags])
        )

        await this.supabase
          .from('leads')
          .update({ tags: newTags })
          .eq('id', leadId)
        break

      case 'remove_tags':
        const { data: leadData } = await this.supabase
          .from('leads')
          .select('tags')
          .eq('id', leadId)
          .single()

        const filteredTags = ((leadData?.tags as string[]) || []).filter(
          (tag) => !parameters.tags.includes(tag)
        )

        await this.supabase
          .from('leads')
          .update({ tags: filteredTags })
          .eq('id', leadId)
        break

      case 'assign':
        await this.supabase
          .from('leads')
          .update({ assigned_to: parameters.assignee_id })
          .eq('id', leadId)
        break

      case 'delete':
        if (!parameters.confirm) {
          throw new Error('Delete operation requires confirmation')
        }

        await this.supabase.from('leads').delete().eq('id', leadId)
        break

      case 'add_note':
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

        await this.supabase
          .from('leads')
          .update({
            metadata: {
              ...metadata,
              notes,
            },
          })
          .eq('id', leadId)
        break

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
      case 'change_status':
        await this.supabase
          .from('companies')
          .update({ status: parameters.status })
          .eq('id', companyId)
        break

      case 'add_tags':
        const { data: company } = await this.supabase
          .from('companies')
          .select('tags')
          .eq('id', companyId)
          .single()

        const currentTags = (company?.tags as string[]) || []
        const newTags = Array.from(
          new Set([...currentTags, ...parameters.tags])
        )

        await this.supabase
          .from('companies')
          .update({ tags: newTags })
          .eq('id', companyId)
        break

      case 'remove_tags':
        const { data: companyData } = await this.supabase
          .from('companies')
          .select('tags')
          .eq('id', companyId)
          .single()

        const filteredTags = ((companyData?.tags as string[]) || []).filter(
          (tag) => !parameters.tags.includes(tag)
        )

        await this.supabase
          .from('companies')
          .update({ tags: filteredTags })
          .eq('id', companyId)
        break

      case 'recalculate_health':
        // Calculate health score
        const healthScore = await calculateHealthScore(companyId, this.supabase)

        // Check if today's score exists
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data: existingScore } = await this.supabase
          .from('health_scores')
          .select('id')
          .eq('company_id', companyId)
          .gte('calculated_at', today.toISOString())
          .lt('calculated_at', tomorrow.toISOString())
          .single()

        if (existingScore) {
          // Update existing score
          await this.supabase
            .from('health_scores')
            .update({
              overall_score: healthScore.overall_score,
              engagement_score: healthScore.engagement_score,
              product_usage_score: healthScore.product_usage_score,
              support_score: healthScore.support_score,
              payment_score: healthScore.payment_score,
              health_status: healthScore.health_status,
              risk_factors: healthScore.risk_factors,
              recommendations: healthScore.recommendations,
              calculated_at: new Date().toISOString(),
            })
            .eq('id', existingScore.id)
        } else {
          // Insert new score
          await this.supabase.from('health_scores').insert({
            company_id: companyId,
            overall_score: healthScore.overall_score,
            engagement_score: healthScore.engagement_score,
            product_usage_score: healthScore.product_usage_score,
            support_score: healthScore.support_score,
            payment_score: healthScore.payment_score,
            health_status: healthScore.health_status,
            risk_factors: healthScore.risk_factors,
            recommendations: healthScore.recommendations,
            calculated_at: new Date().toISOString(),
          })
        }
        break

      case 'assign_cs_manager':
        await this.supabase
          .from('companies')
          .update({ cs_manager_id: parameters.cs_manager_id })
          .eq('id', companyId)
        break

      case 'add_note':
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

        await this.supabase
          .from('companies')
          .update({
            metadata: {
              ...metadata,
              notes,
            },
          })
          .eq('id', companyId)
        break

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
      case 'change_plan':
        await this.supabase
          .from('company_subscriptions')
          .update({
            plan_id: parameters.plan_id,
            // TODO: Handle effective_date and proration
          })
          .eq('id', subscriptionId)
        break

      case 'change_billing_cycle':
        await this.supabase
          .from('company_subscriptions')
          .update({ billing_cycle: parameters.billing_cycle })
          .eq('id', subscriptionId)
        break

      case 'change_status':
        await this.supabase
          .from('company_subscriptions')
          .update({ status: parameters.status })
          .eq('id', subscriptionId)
        break

      case 'extend_next_billing':
        const { data: subscription } = await this.supabase
          .from('company_subscriptions')
          .select('next_billing_date')
          .eq('id', subscriptionId)
          .single()

        if (!subscription?.next_billing_date) {
          throw new Error('Subscription has no next billing date')
        }

        const currentDate = new Date(subscription.next_billing_date)
        currentDate.setDate(currentDate.getDate() + parameters.days)

        await this.supabase
          .from('company_subscriptions')
          .update({ next_billing_date: currentDate.toISOString() })
          .eq('id', subscriptionId)
        break

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
