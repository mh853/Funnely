import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * POST /api/admin/notifications/mark-read
 * 알림을 읽음 처리
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 요청 바디 파싱
    const body = await request.json()
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Invalid request: notificationIds must be an array' },
        { status: 400 }
      )
    }

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: notificationIds cannot be empty' },
        { status: 400 }
      )
    }

    // 3. Supabase 업데이트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds)

    if (error) {
      console.error('[Mark Read API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    // 4. 성공 응답
    return NextResponse.json({
      success: true,
      markedCount: notificationIds.length,
    })
  } catch (error) {
    console.error('[Mark Read API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
