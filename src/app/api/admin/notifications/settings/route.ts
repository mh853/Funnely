import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

/**
 * GET/PUT /api/admin/notifications/settings
 * admin/notifications/settings/page.tsx가 호출하는 엔드포인트. 이 라우트가
 * 존재하지 않아 조회/저장 모두 항상 실패하고 있었다 (레거시 admin/api/notifications/
 * settings/route.ts만 존재, 호출하는 곳 없음).
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', adminUser.user.id)

    if (error) {
      console.error('[Admin Notification Settings API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: settings || [] })
  } catch (error) {
    console.error('[Admin Notification Settings API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: deleteError } = await supabase
      .from('notification_settings')
      .delete()
      .eq('user_id', adminUser.user.id)

    if (deleteError) {
      console.error('[Admin Notification Settings API] Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const settingsToInsert = settings.map((setting: any) => ({
      user_id: adminUser.user.id,
      type: setting.type,
      channel: setting.channel,
      enabled: setting.enabled,
    }))

    const { error } = await supabase
      .from('notification_settings')
      .insert(settingsToInsert)

    if (error) {
      console.error('[Admin Notification Settings API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Notification Settings API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
