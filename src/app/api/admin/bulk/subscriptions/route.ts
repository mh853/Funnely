// Phase 4.2: Bulk Operations - Subscriptions API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { executeBulkOperation } from '@/lib/bulk/bulkProcessor'
import type { SubscriptionBulkOperation } from '@/types/bulk'

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = adminUser.user

    // 서비스 롤 사용: company_subscriptions의 유일한 RLS 정책이 회사 소속
    // 관리자만 허용하고 최고관리자 우회가 전혀 없어, 일반 클라이언트로는 벌크
    // 구독 작업이 에러 없이 조용히 0건 처리되던 문제가 있었다(최고관리자 인증은
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
    const validOperations: SubscriptionBulkOperation[] = [
      'change_plan',
      'change_billing_cycle',
      'change_status',
      'extend_next_billing',
    ]

    if (!validOperations.includes(operation as SubscriptionBulkOperation)) {
      return NextResponse.json(
        { error: `Invalid operation: ${operation}` },
        { status: 400 }
      )
    }

    // Validate operation-specific parameters
    switch (operation as SubscriptionBulkOperation) {
      case 'change_plan':
        if (!parameters?.plan_id) {
          return NextResponse.json(
            { error: 'Missing required parameter: plan_id' },
            { status: 400 }
          )
        }
        break

      case 'change_billing_cycle':
        if (!parameters?.billing_cycle) {
          return NextResponse.json(
            { error: 'Missing required parameter: billing_cycle' },
            { status: 400 }
          )
        }
        if (!['monthly', 'annual'].includes(parameters.billing_cycle)) {
          return NextResponse.json(
            { error: 'billing_cycle must be "monthly" or "annual"' },
            { status: 400 }
          )
        }
        break

      case 'change_status':
        if (!parameters?.status) {
          return NextResponse.json(
            { error: 'Missing required parameter: status' },
            { status: 400 }
          )
        }
        break

      case 'extend_next_billing':
        if (!parameters?.days || typeof parameters.days !== 'number') {
          return NextResponse.json(
            { error: 'Missing required parameter: days (number)' },
            { status: 400 }
          )
        }
        if (parameters.days < 1 || parameters.days > 365) {
          return NextResponse.json(
            { error: 'days must be between 1 and 365' },
            { status: 400 }
          )
        }
        break
    }

    // Execute bulk operation
    const result = await executeBulkOperation(
      supabase,
      'subscription',
      operation,
      entity_ids,
      parameters || {},
      user.id
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Bulk Subscriptions API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
