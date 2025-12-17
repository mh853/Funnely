// Phase 4.2: Bulk Operations - Operation Detail API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BulkOperationLog } from '@/types/bulk'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing operation ID' },
        { status: 400 }
      )
    }

    // Fetch operation log
    const { data, error } = await supabase
      .from('bulk_operation_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Operation not found' },
          { status: 404 }
        )
      }
      console.error('[Bulk Operation Detail API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch operation detail' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      operation: data as BulkOperationLog,
    })
  } catch (error) {
    console.error('[Bulk Operation Detail API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
