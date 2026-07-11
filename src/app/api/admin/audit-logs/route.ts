import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/audit-logs
 * 감사 로그 조회 (필터링 및 페이지네이션 지원)
 */
export async function GET(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const companyId = searchParams.get('companyId')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search') // IP 주소 또는 User Agent 검색
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // 최대 100개
    const offset = parseInt(searchParams.get('offset') || '0')

    // audit_logs에는 company_id 컬럼이 없다(회사와 무관한 플랫폼 레벨 로그).
    // company_id는 대신 new_values(JSONB) 안에 companyId 키로 기록된다
    // (src/lib/admin/audit-middleware.ts 참고). entity_type/entity_id/metadata도
    // 실제 컬럼명은 resource_type/resource_id/new_values다.
    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        user:user_id(id, email, full_name)
      `,
        { count: 'exact' }
      )

    // 필터 적용
    if (userId) query = query.eq('user_id', userId)
    if (companyId) query = query.eq('new_values->>companyId', companyId)
    if (action) query = query.eq('action', action)
    if (entityType) query = query.eq('resource_type', entityType)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    if (search) {
      const safeSearch = search.replace(/[,()]/g, '')
      query = query.or(`ip_address.ilike.%${safeSearch}%,user_agent.ilike.%${safeSearch}%`)
    }

    // 정렬 및 페이지네이션
    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('[Audit Logs API] Error fetching logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // audit_logs에는 company_id 컬럼(FK)이 없어 embed로 회사명을 바로 가져올 수
    // 없다. new_values.companyId를 모아 별도 조회 후 병합한다.
    const companyIds = Array.from(
      new Set((logs || []).map((log: any) => log.new_values?.companyId).filter(Boolean))
    )

    const companyNameById = new Map<string, string>()
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds)

      for (const company of companies || []) {
        companyNameById.set(company.id, company.name)
      }
    }

    // 응답 데이터 포맷팅
    const formattedLogs = (logs || []).map((log: any) => {
      const companyId = log.new_values?.companyId || null
      return {
        id: log.id,
        userId: log.user_id,
        userName: log.user?.full_name || log.user?.email || 'Unknown',
        userEmail: log.user?.email || null,
        companyId,
        companyName: companyId ? companyNameById.get(companyId) || null : null,
        action: log.action,
        entityType: log.resource_type,
        entityId: log.resource_id,
        metadata: log.new_values,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at,
      }
    })

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('[Audit Logs API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/audit-logs
 * 수동으로 감사 로그 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, entityType, entityId, metadata, companyId } = body

    // 필수 필드 검증
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // IP 주소 및 User Agent 추출
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // audit_logs에는 company_id/entity_type/entity_id/metadata 컬럼이 없다.
    // 실제 컬럼명은 resource_type/resource_id/new_values이며, company_id는
    // 컬럼 자체가 없으므로 new_values 안에 함께 기록한다.
    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: adminUser.user.id,
        action,
        resource_type: entityType || null,
        resource_id: entityId || null,
        new_values: { ...(metadata || {}), companyId: companyId || adminUser.profile.company_id || null },
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error('[Audit Logs API] Error creating log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      log,
    })
  } catch (error) {
    console.error('[Audit Logs API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
