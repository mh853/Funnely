import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { executeWorkflow } from '@/lib/automation/workflowEngine'

/**
 * POST /api/admin/workflows/[id]/execute
 * Manually execute a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper RBAC permission check for EXECUTE_WORKFLOWS

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { id } = params
    const body = await request.json().catch(() => ({}))
    const triggerData = body.trigger_data || {}

    console.log(`[Workflow Execute] Manually executing workflow: ${id}`)

    // Execute workflow
    const executionId = await executeWorkflow(
      supabase,
      id,
      'manual',
      {
        ...triggerData,
        triggered_by_user: adminUser.id,
        triggered_by_email: adminUser.email,
      }
    )

    console.log(`[Workflow Execute] Execution started: ${executionId}`)

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      message: 'Workflow execution started',
    })
  } catch (error) {
    console.error('[Workflow Execute] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute workflow',
      },
      { status: 500 }
    )
  }
}
