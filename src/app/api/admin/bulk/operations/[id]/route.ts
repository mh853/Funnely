// Phase 4.2: Bulk Operations - Operation Detail API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import type { BulkOperationLog } from '@/types/bulk'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
