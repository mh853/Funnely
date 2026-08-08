import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: '인증되지 않은 사용자입니다' } }, { status: 401 })
    }

    // Check if landing page exists and belongs to user's hospital
    const { data: landingPage, error: fetchError } = await supabase
      .from('landing_pages')
      .select('company_id, images, completion_bg_image')
      .eq('id', id)
      .single()

    if (fetchError || !landingPage) {
      return NextResponse.json(
        { error: { message: '랜딩 페이지를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    // Verify user belongs to the same hospital
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userData?.company_id !== landingPage.company_id) {
      return NextResponse.json(
        { error: { message: '권한이 없습니다' } },
        { status: 403 }
      )
    }

    // Delete landing page (company_id 필터로 TOCTOU 방지)
    const { error: deleteError } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id)
      .eq('company_id', userData!.company_id)

    if (deleteError) {
      console.error('Landing page deletion error:', deleteError)
      return NextResponse.json(
        { error: { message: '랜딩 페이지 삭제 중 오류가 발생했습니다' } },
        { status: 500 }
      )
    }

    // DB row만 지우고 Storage 파일(images/completion_bg_image)은 그대로 남아
    // orphan이 쌓였다 - 에디터의 개별 이미지 삭제(removeImage/handleRemoveCompletionBgImage)와
    // 동일한 방식으로 정리한다. 실패해도 삭제 자체는 이미 끝난 뒤라 응답에 영향 주지 않는다.
    const removeStorageFile = async (bucket: string, publicUrl: string) => {
      try {
        const pathParts = new URL(publicUrl).pathname.split('/')
        const bucketIndex = pathParts.findIndex((p) => p === bucket)
        if (bucketIndex === -1) return
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        const { error } = await supabase.storage.from(bucket).remove([filePath])
        if (error) console.error('Storage cleanup error:', bucket, error)
      } catch (error) {
        console.error('Storage cleanup error:', bucket, error)
      }
    }

    const images = Array.isArray(landingPage.images) ? landingPage.images : []
    await Promise.all([
      ...images.map((url: string) => removeStorageFile('public-assets', url)),
      landingPage.completion_bg_image
        ? removeStorageFile('landing-page-images', landingPage.completion_bg_image)
        : Promise.resolve(),
    ])

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
