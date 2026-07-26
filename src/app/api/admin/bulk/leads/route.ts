// Phase 4.2: Bulk Operations - Leads API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { executeBulkOperation } from '@/lib/bulk/bulkProcessor'
import type { LeadBulkOperation } from '@/types/bulk'

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = adminUser.user

    // 서비스 롤 사용: leads/lead_notes 등 대상 테이블의 RLS 정책이 회사 소속
    // 직원 role만 허용하고 최고관리자 우회를 두지 않아, 일반 클라이언트로는
    // 벌크 작업이 에러 없이 조용히 0건 처리되던 문제가 있었다(최고관리자 인증은
    // 이미 위에서 getSuperAdminUser()로 확인했으므로 RLS를 다시 거칠 필요가 없다).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse request body
    const body = await request.json()
    const { operation, entity_ids, parameters } = body

    // Validate required fields
    if (!operation || !entity_ids || !Array.isArray(entity_ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: operation, entity_ids' },
        { status: 400 }
      )
    }

    if (entity_ids.length === 0) {
      return NextResponse.json(
        { error: 'entity_ids array cannot be empty' },
        { status: 400 }
      )
    }

    // Validate operation type
    const validOperations: LeadBulkOperation[] = [
      'change_status',
      'add_tags',
      'remove_tags',
      'assign',
      'delete',
      'add_note',
    ]

    if (!validOperations.includes(operation as LeadBulkOperation)) {
      return NextResponse.json(
        { error: `Invalid operation: ${operation}` },
        { status: 400 }
      )
    }

    // Validate operation-specific parameters
    switch (operation as LeadBulkOperation) {
      case 'change_status':
        if (!parameters?.status) {
          return NextResponse.json(
            { error: 'Missing required parameter: status' },
            { status: 400 }
          )
        }
        break

      case 'add_tags':
      case 'remove_tags':
        if (!parameters?.tags || !Array.isArray(parameters.tags)) {
          return NextResponse.json(
            { error: 'Missing required parameter: tags (array)' },
            { status: 400 }
          )
        }
        break

      case 'assign':
        if (!parameters?.assignee_id) {
          return NextResponse.json(
            { error: 'Missing required parameter: assignee_id' },
            { status: 400 }
          )
        }
        break

      case 'delete':
        if (!parameters?.confirm) {
          return NextResponse.json(
            { error: 'Delete operation requires confirmation' },
            { status: 400 }
          )
        }
        break

      case 'add_note':
        if (!parameters?.note) {
          return NextResponse.json(
            { error: 'Missing required parameter: note' },
            { status: 400 }
          )
        }
        break
    }

    // Execute bulk operation
    const result = await executeBulkOperation(
      supabase,
      'lead',
      operation,
      entity_ids,
      parameters || {},
      user.id
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Bulk Leads API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
