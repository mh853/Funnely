import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/workflows/executions
 * List workflow executions with optional filtering
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
    const workflowId = searchParams.get('workflow_id')
    const status = searchParams.get('status')
    const triggeredBy = searchParams.get('triggered_by')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('workflow_executions')
      .select(
        `
        *,
        workflow:automation_workflows(id, name, trigger_type)
      `,
        { count: 'exact' }
      )
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (triggeredBy) {
      query = query.eq('triggered_by', triggeredBy)
    }

    if (dateFrom) {
      query = query.gte('started_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('started_at', dateTo)
    }

    const { data: executions, error, count } = await query

    if (error) {
      console.error('[Executions API] Error fetching executions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      executions: executions || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('[Executions API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
