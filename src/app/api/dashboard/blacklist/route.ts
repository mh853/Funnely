import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: 블랙리스트 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: user } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single()

    if (!user?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { phone_number, reason, blocked_by_user_id } = body

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // 블랙리스트 추가
    const { data, error } = await supabase
      .from('phone_blacklist')
      .insert({
        phone_number: phone_number.trim(),
        reason: reason?.trim() || null,
        blocked_by_user_id,
      })
      .select(
        `
        *,
        blocked_by:users!phone_blacklist_blocked_by_user_id_fkey(full_name)
      `
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json({ error: '이미 블랙리스트에 등록된 번호입니다.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error adding blacklist entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
