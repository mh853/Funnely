import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('company_id, is_super_admin')
      .eq('id', authUser.id)
      .single()

    if (!user?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { phone_number, reason } = body

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('phone_blacklist')
      .insert({
        company_id: user.company_id,
        phone_number: phone_number.trim(),
        reason: reason?.trim() || null,
        blocked_by_user_id: authUser.id,
      })
      .select(`*, blocked_by:users!phone_blacklist_blocked_by_user_id_fkey(full_name)`)
      .single()

    if (error) {
      if (error.code === '23505') {
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
