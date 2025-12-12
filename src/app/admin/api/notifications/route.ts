import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const supabase = await createClient()

    // 현재 사용자 정보
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const offset = (page - 1) * limit

    let query = supabase
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 읽지 않은 알림 수
    const { count: unreadCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1,
      },
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
