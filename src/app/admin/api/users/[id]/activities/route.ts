import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { UserActivitiesResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const userId = params.id
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터 파싱
    const action_type = searchParams.get('action_type') || ''
    const dateRange = searchParams.get('dateRange') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 기본 쿼리
    let query = supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        action,
        description,
        metadata,
        ip_address,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)

    // 활동 타입 필터
    if (action_type) {
      query = query.eq('action', action_type)
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

    // 정렬
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

    const response: UserActivitiesResponse = {
      activities: (activities || []).map((activity) => ({
        id: activity.id,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata,
        ip_address: activity.ip_address,
        created_at: activity.created_at,
      })),
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
