import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const resolved = searchParams.get('resolved')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = supabase
      .from('error_logs')
      .select(
        `
        *,
        user:users!error_logs_user_id_fkey(id, full_name),
        company:companies!error_logs_company_id_fkey(id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true')
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: errors, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 통계
    const { data: stats } = await supabase
      .from('error_logs')
      .select('severity, resolved')

    const severityCounts = stats?.reduce((acc: any, log: any) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1
      return acc
    }, {})

    const resolvedCount = stats?.filter((log: any) => log.resolved).length || 0
    const unresolvedCount = stats?.filter((log: any) => !log.resolved).length || 0

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      errors: errors || [],
      statistics: {
        total: stats?.length || 0,
        resolved: resolvedCount,
        unresolved: unresolvedCount,
        bySeverity: severityCounts || {},
      },
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: errorLog, error } = await supabase
      .from('error_logs')
      .insert({
        severity: body.severity || 'error',
        source: body.source,
        error_type: body.errorType,
        message: body.message,
        stack_trace: body.stackTrace,
        user_id: body.userId,
        company_id: body.companyId,
        request_url: body.requestUrl,
        request_method: body.requestMethod,
        user_agent: body.userAgent,
        ip_address: body.ipAddress,
        metadata: body.metadata,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ errorLog })
  } catch (error) {
    console.error('Error log creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
