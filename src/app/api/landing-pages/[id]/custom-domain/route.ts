import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/landing-pages/[id]/custom-domain - 랜딩페이지의 커스텀 도메인 조회
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: landingPageRaw, error } = await supabase
      .from('landing_pages')
      .select(`
        id,
        custom_domain_id,
        company_custom_domains (
          id,
          domain,
          verification_status,
          is_company_default
        )
      `)
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .single()
    const landingPage = landingPageRaw as any

    if (error || !landingPage) {
      return NextResponse.json({ error: '랜딩페이지를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({
      customDomainId: landingPage.custom_domain_id,
      customDomain: landingPage.company_custom_domains,
    })
  } catch (error) {
    console.error('[Landing Page Custom Domain] GET 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/landing-pages/[id]/custom-domain - 랜딩페이지 커스텀 도메인 설정
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { customDomainId } = body

    // null이면 오버라이드 해제
    if (customDomainId !== null && customDomainId !== undefined) {
      // 선택한 도메인이 이 회사의 인증된 도메인인지 확인
      const { data: domainRecordRaw } = await supabase
        .from('company_custom_domains' as any)
        .select('id, verification_status')
        .eq('id', customDomainId)
        .eq('company_id', (userProfile as any)?.company_id)
        .single()
      const domainRecord = domainRecordRaw as any

      if (!domainRecord) {
        return NextResponse.json({ error: '유효하지 않은 도메인입니다.' }, { status: 400 })
      }

      if (domainRecord.verification_status !== 'verified') {
        return NextResponse.json(
          { error: '인증된 도메인만 사용할 수 있습니다.' },
          { status: 400 }
        )
      }
    }

    const { error: updateError } = await (supabase as any)
      .from('landing_pages')
      .update({ custom_domain_id: customDomainId || null })
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)

    if (updateError) {
      console.error('[Landing Page Custom Domain] 업데이트 실패:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Landing Page Custom Domain] PUT 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/landing-pages/[id]/custom-domain - 랜딩페이지 커스텀 도메인 오버라이드 해제
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { error } = await (supabase as any)
      .from('landing_pages')
      .update({ custom_domain_id: null })
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Landing Page Custom Domain] DELETE 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
