import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, secret } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    // 두 가지 인증 방식 허용:
    // 1. Secret 토큰 (외부/서버 사이드 호출)
    // 2. Supabase 세션 (대시보드 내부 호출 - secret 불필요)
    const isSecretValid = secret && secret === process.env.REVALIDATION_SECRET

    if (!isSecretValid) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    revalidatePath(`/landing/${slug}`)
    revalidatePath(`/landing/${slug}/completed`)

    return NextResponse.json({
      success: true,
      revalidated: true,
      path: `/landing/${slug}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    )
  }
}
