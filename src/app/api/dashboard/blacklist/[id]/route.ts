import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE: 블랙리스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // 블랙리스트 삭제
    const { error } = await supabase.from('phone_blacklist').delete().eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting blacklist entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
