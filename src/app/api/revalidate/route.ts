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
    // 1. Secret 토큰 (외부/서버 사이드 호출 - 서버 간 신뢰된 호출이라 회사 소유권
    //    확인 없이 통과)
    // 2. Supabase 세션 (대시보드 내부 호출 - secret 불필요, 단 로그인만으로는
    //    부족하고 요청한 slug가 실제로 호출자 회사 소유인지 확인해야 한다 -
    //    그렇지 않으면 다른 회사의 slug를 알아내 그 회사 캐시를 임의로
    //    무효화시킬 수 있다)
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

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const { data: landingPage } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('slug', slug)
        .eq('company_id', userProfile?.company_id ?? '')
        .maybeSingle()

      if (!landingPage) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
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
