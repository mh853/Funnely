import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/workflows/executions/[id]
 * Get execution details with action logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper RBAC permission check for VIEW_WORKFLOWS

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { id } = params

    // Get execution with workflow info
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .select(
        `
        *,
        workflow:automation_workflows(*)
      `
      )
      .eq('id', id)
      .single()

    if (executionError || !execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Get action logs
    const { data: actionLogs, error: logsError } = await supabase
      .from('workflow_action_logs')
      .select('*')
      .eq('execution_id', id)
      .order('action_index', { ascending: true })

    if (logsError) {
      console.error('[Execution Detail] Error fetching action logs:', logsError)
    }

    return NextResponse.json({
      execution: {
        ...execution,
        action_logs: actionLogs || [],
      },
    })
  } catch (error) {
    console.error('[Execution Detail] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
