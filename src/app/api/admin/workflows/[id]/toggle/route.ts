import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * POST /api/admin/workflows/[id]/toggle
 * Toggle workflow active status
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

    // TODO: Add proper RBAC permission check for MANAGE_WORKFLOWS

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { id } = params

    // Get current status
    const { data: currentWorkflow, error: fetchError } = await supabase
      .from('automation_workflows')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError || !currentWorkflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Toggle status
    const newStatus = !currentWorkflow.is_active

    const { data: workflow, error } = await supabase
      .from('automation_workflows')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Workflow Toggle] Error toggling workflow:', error)
      return NextResponse.json(
        { error: 'Failed to toggle workflow' },
        { status: 500 }
      )
    }

    console.log(`[Workflow Toggle] Toggled workflow ${id} to ${newStatus}`)

    return NextResponse.json({
      success: true,
      workflow,
      message: `Workflow ${newStatus ? 'activated' : 'deactivated'}`,
    })
  } catch (error) {
    console.error('[Workflow Toggle] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
