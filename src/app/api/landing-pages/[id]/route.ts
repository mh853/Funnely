import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: '인증되지 않은 사용자입니다' } }, { status: 401 })
    }

    const { id } = params

    // Check if landing page exists and belongs to user's hospital
    const { data: landingPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select('hospital_id')
      .eq('id', id)
      .single()

    if (fetchError || !landingPage) {
      return NextResponse.json(
        { error: { message: '랜딩 페이지를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    // Verify user belongs to the same hospital
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('hospital_id')
      .eq('id', user.id)
      .single()

    if (userProfile?.hospital_id !== landingPage.hospital_id) {
      return NextResponse.json(
        { error: { message: '권한이 없습니다' } },
        { status: 403 }
      )
    }

    // Delete landing page
    const { error: deleteError } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Landing page deletion error:', deleteError)
      return NextResponse.json(
        { error: { message: '랜딩 페이지 삭제 중 오류가 발생했습니다' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '랜딩 페이지가 삭제되었습니다',
    })
  } catch (error: any) {
    console.error('Delete landing page error:', error)
    return NextResponse.json(
      { error: { message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
