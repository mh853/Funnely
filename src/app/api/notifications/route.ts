import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unread_only = searchParams.get('unread_only') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (unread_only) {
      query = query.eq('is_read', false)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data: notifications, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount: unread_only ? count || 0 : undefined,
      total: count || 0,
    })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to get notifications' } },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { notification_id } = body

    if (!notification_id) {
      return NextResponse.json(
        { error: { message: 'Missing notification_id' } },
        { status: 400 }
      )
    }

    // Update notification (RLS policy ensures user can only update their own)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Mark notification as read error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Failed to mark notification as read' },
      },
      { status: 500 }
    )
  }
}
