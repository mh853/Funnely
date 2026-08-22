// 체크박스로 선택한 DB(리드)를 일괄 삭제하는 API - DB 현황의 선택 삭제 기능
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    const body = await request.json()
    const ids: unknown = body.ids

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { error: { message: '삭제할 항목을 선택해주세요.' } },
        { status: 400 }
      )
    }

    // company_id로 다시 한 번 좁혀서, 다른 회사 소속 id가 섞여 들어와도 그 부분은
    // 조용히 무시되고(삭제 안 됨) 다른 회사 데이터가 삭제되는 일이 없게 한다.
    const { data: deleted, error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('company_id', userProfile.company_id)
      .select('id')

    if (error) {
      console.error('Bulk lead delete error:', error)
      return NextResponse.json(
        { error: { message: '삭제 중 오류가 발생했습니다.' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: deleted?.length || 0 })
  } catch (error: any) {
    console.error('Bulk lead delete error:', error)
    return NextResponse.json(
      { error: { message: error.message || '삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
