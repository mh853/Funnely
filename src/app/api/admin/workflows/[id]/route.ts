import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import type { WorkflowPayload } from '@/types/automation'

/**
 * GET /api/admin/workflows/[id]
 * Get a specific workflow by ID
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

    const { data: workflow, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error('[Workflow API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/workflows/[id]
 * Update a workflow
 */
export async function PUT(
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
    const payload: WorkflowPayload = await request.json()

    // Validate required fields
    if (!payload.name || !payload.trigger_type || !payload.trigger_conditions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!payload.actions || payload.actions.length === 0) {
      return NextResponse.json(
        { error: 'Workflow must have at least one action' },
        { status: 400 }
      )
    }

    // Update workflow
    const { data: workflow, error } = await supabase
      .from('automation_workflows')
      .update({
        name: payload.name,
        description: payload.description || null,
        trigger_type: payload.trigger_type,
        trigger_conditions: payload.trigger_conditions,
        actions: payload.actions,
        is_active: payload.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !workflow) {
      console.error('[Workflow API] Error updating workflow:', error)
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      )
    }

    console.log(`[Workflow API] Updated workflow: ${id}`)

    return NextResponse.json({
      success: true,
      workflow,
    })
  } catch (error) {
    console.error('[Workflow API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/workflows/[id]
 * Delete a workflow
 */
export async function DELETE(
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

    const { error } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Workflow API] Error deleting workflow:', error)
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      )
    }

    console.log(`[Workflow API] Deleted workflow: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    })
  } catch (error) {
    console.error('[Workflow API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
