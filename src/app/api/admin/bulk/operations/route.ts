// Phase 4.2: Bulk Operations - Operations Log List API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BulkOperationLog } from '@/types/bulk'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entity_type')
    const status = searchParams.get('status')
    const operation = searchParams.get('operation')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('bulk_operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (operation) {
      query = query.eq('operation', operation)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[Bulk Operations Log API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch operations log' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      operations: data as BulkOperationLog[],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Bulk Operations Log API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
