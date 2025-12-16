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

    // 쿼리 빌드
    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        user:user_id(id, email, profiles(full_name)),
        company:company_id(id, name)
      `,
        { count: 'exact' }
      )

    // 필터 적용
    if (userId) query = query.eq('user_id', userId)
    if (companyId) query = query.eq('company_id', companyId)
    if (action) query = query.eq('action', action)
    if (entityType) query = query.eq('entity_type', entityType)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    if (search) {
      // IP 주소 또는 User Agent로 검색
      query = query.or(`ip_address.ilike.%${search}%,user_agent.ilike.%${search}%`)
    }

    // 정렬 및 페이지네이션
    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('[Audit Logs API] Error fetching logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 응답 데이터 포맷팅
    const formattedLogs = (logs || []).map((log) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user?.profiles?.full_name || log.user?.email || 'Unknown',
      userEmail: log.user?.email || null,
      companyId: log.company_id,
      companyName: log.company?.name || null,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      metadata: log.metadata,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at,
    }))

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

    // 로그 생성
    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: adminUser.user.id,
        company_id: companyId || adminUser.profile.company_id || null,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        metadata: metadata || {},
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
