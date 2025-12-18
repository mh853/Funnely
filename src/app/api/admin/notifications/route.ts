import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET /api/admin/notifications
 * 알림 목록 조회 (페이지네이션)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const offset = (page - 1) * limit

    // 3. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Count 쿼리
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    if (unreadOnly) {
      countQuery = countQuery.eq('is_read', false)
    }

    const { count } = await countQuery

    // 읽지 않은 알림 개수 (통계용)
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    // 데이터 쿼리
    let dataQuery = supabase
      .from('notifications')
      .select(
        `
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        company_id,
        campaign_id
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      dataQuery = dataQuery.eq('is_read', false)
    }

    const { data: notifications, error } = await dataQuery

    if (error) {
      console.error('[Notifications API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // 4. 응답 데이터 포맷팅
    const formattedNotifications = (notifications || []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: {
        company_id: n.company_id,
        campaign_id: n.campaign_id,
      },
      read: n.is_read,
      read_at: null, // DB에 read_at 컬럼이 없으므로 null
      sent_at: n.created_at,
    }))

    // 5. 페이지네이션 정보
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: (count || 0) > offset + limit,
        hasPrev: offset > 0,
      },
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
