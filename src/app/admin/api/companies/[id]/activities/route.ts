import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { CompanyActivitiesResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const companyId = params.id
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || 'all'
    const userId = searchParams.get('userId') || ''
    const dateRange = searchParams.get('dateRange') || 'all'

    // 기본 쿼리
    let query = supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        company_id,
        user_id,
        action,
        description,
        metadata,
        ip_address,
        created_at,
        users(full_name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)

    // 활동 유형 필터
    if (type !== 'all') {
      query = query.eq('action', type)
    }

    // 사용자 필터
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // 날짜 범위 필터
    if (dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case '7d':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case '30d':
          startDate = new Date(now.setDate(now.getDate() - 30))
          break
        case '90d':
          startDate = new Date(now.setDate(now.getDate() - 90))
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // 정렬 (최근순)
    query = query.order('created_at', { ascending: false })

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: activities, error, count } = await query

    if (error) {
      console.error('Activities fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 활동 데이터 변환
    const formattedActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      company_id: activity.company_id,
      user_id: activity.user_id,
      user_name: activity.users?.full_name || 'Unknown',
      action: activity.action,
      description: activity.description,
      metadata: activity.metadata,
      ip_address: activity.ip_address,
      created_at: activity.created_at,
    }))

    // 페이지네이션 정보
    const totalPages = Math.ceil((count || 0) / limit)
    const pagination = {
      total: count || 0,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }

    const response: CompanyActivitiesResponse = {
      activities: formattedActivities,
      pagination,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
