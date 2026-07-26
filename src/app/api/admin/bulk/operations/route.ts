// Phase 4.2: Bulk Operations - Operations Log List API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import type { BulkOperationLog } from '@/types/bulk'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 다른 어드민 라우트와 동일하게 서비스 롤 사용(최고관리자 인증은 이미
    // getSuperAdminUser()로 확인했으므로 RLS를 다시 거칠 필요가 없다)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
