// Phase 4.2: Bulk Operations - Companies API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeBulkOperation } from '@/lib/bulk/bulkProcessor'
import type { CompanyBulkOperation } from '@/types/bulk'

export async function POST(request: NextRequest) {
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
    const validOperations: CompanyBulkOperation[] = [
      'change_status',
      'add_tags',
      'remove_tags',
      'recalculate_health',
      'assign_cs_manager',
      'add_note',
    ]

    if (!validOperations.includes(operation as CompanyBulkOperation)) {
      return NextResponse.json(
        { error: `Invalid operation: ${operation}` },
        { status: 400 }
      )
    }

    // Validate operation-specific parameters
    switch (operation as CompanyBulkOperation) {
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

      case 'assign_cs_manager':
        if (!parameters?.cs_manager_id) {
          return NextResponse.json(
            { error: 'Missing required parameter: cs_manager_id' },
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

      case 'recalculate_health':
        // No additional parameters required
        break
    }

    // Execute bulk operation
    const result = await executeBulkOperation(
      supabase,
      'company',
      operation,
      entity_ids,
      parameters || {},
      user.id
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Bulk Companies API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
