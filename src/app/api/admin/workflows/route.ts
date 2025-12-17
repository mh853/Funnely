import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import type { WorkflowPayload, WorkflowFilters } from '@/types/automation'

/**
 * GET /api/admin/workflows
 * List automation workflows with optional filtering
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const triggerType = searchParams.get('trigger_type')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    let query = supabase
      .from('automation_workflows')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (triggerType) {
      query = query.eq('trigger_type', triggerType)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: workflows, error, count } = await query

    if (error) {
      console.error('[Workflows API] Error fetching workflows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      workflows: workflows || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('[Workflows API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/workflows
 * Create a new automation workflow
 */
export async function POST(request: NextRequest) {
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

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('automation_workflows')
      .insert({
        name: payload.name,
        description: payload.description || null,
        trigger_type: payload.trigger_type,
        trigger_conditions: payload.trigger_conditions,
        actions: payload.actions,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Workflows API] Error creating workflow:', error)
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      )
    }

    console.log(`[Workflows API] Created workflow: ${workflow.id}`)

    return NextResponse.json({
      success: true,
      workflow,
    })
  } catch (error) {
    console.error('[Workflows API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
