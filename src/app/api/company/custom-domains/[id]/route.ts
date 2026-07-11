import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateCustomDomainRequest } from '@/types/custom-domain.types'

type Params = { params: Promise<{ id: string }> }

// GET /api/company/custom-domains/[id] - 특정 도메인 상태 조회
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

    const { data: domain, error } = await supabase
      .from('company_custom_domains' as any)
      .select('*')
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .single()

    if (error || !domain) {
      return NextResponse.json({ error: '도메인을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ domain })
  } catch (error) {
    console.error('[Custom Domain] GET [id] 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/company/custom-domains/[id] - 도메인 설정 변경
export async function PATCH(request: NextRequest, { params }: Params) {
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

    // 도메인 소유 확인
    const { data: existingRaw } = await supabase
      .from('company_custom_domains' as any)
      .select('id, verification_status')
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .single()
    const existing = existingRaw as any

    if (!existing) {
      return NextResponse.json({ error: '도메인을 찾을 수 없습니다.' }, { status: 404 })
    }

    const body: UpdateCustomDomainRequest = await request.json()

    // is_company_default를 true로 설정할 경우, 인증된 도메인만 가능
    if (body.is_company_default === true) {
      if (existing.verification_status !== 'verified') {
        return NextResponse.json(
          { error: '인증된 도메인만 기본 도메인으로 설정할 수 있습니다.' },
          { status: 400 }
        )
      }

      // 기존 기본 도메인 해제
      await (supabase as any)
        .from('company_custom_domains')
        .update({ is_company_default: false })
        .eq('company_id', (userProfile as any)?.company_id)
        .eq('is_company_default', true)
        .neq('id', id)
    }

    const { data: updated, error } = await (supabase as any)
      .from('company_custom_domains')
      .update({ is_company_default: body.is_company_default })
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Custom Domain] PATCH 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: '도메인을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ domain: updated })
  } catch (error) {
    console.error('[Custom Domain] PATCH 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/company/custom-domains/[id] - 도메인 제거
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

    // landing_pages.custom_domain_id는 ON DELETE SET NULL이라 도메인을 삭제해도
    // 에러 없이 조용히 성공하지만, 그 도메인으로 접속하던 방문자는 이후 랜딩페이지에
    // 도달할 방법이 없어진다(광고/명함 등에 이미 배포된 URL이 아무 경고 없이
    // 끊긴다). 사용 중인 랜딩페이지가 있으면 삭제를 막고 개수를 안내한다.
    const { count: pagesUsingDomain } = await supabase
      .from('landing_pages')
      .select('id', { count: 'exact', head: true })
      .eq('custom_domain_id', id)

    if ((pagesUsingDomain || 0) > 0) {
      return NextResponse.json(
        {
          error: `이 도메인을 사용 중인 랜딩페이지가 ${pagesUsingDomain}개 있어 삭제할 수 없습니다. 먼저 다른 도메인으로 변경해주세요.`,
        },
        { status: 409 }
      )
    }

    // 도메인 소유 확인 후 삭제
    const { error } = await supabase
      .from('company_custom_domains' as any)
      .delete()
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)

    if (error) {
      console.error('[Custom Domain] DELETE 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Custom Domain] DELETE 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
