import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: deleted, error } = await supabase
      .from('phone_blacklist')
      .delete()
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .select('id')

    if (error) throw error

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: '항목을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting blacklist entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
