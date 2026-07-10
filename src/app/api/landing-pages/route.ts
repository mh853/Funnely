import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canCreateLandingPage } from '@/lib/subscription-access'

// GET /api/landing-pages - 랜딩 페이지 목록 조회
export async function GET(request: NextRequest) {
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

    const { data: landingPages, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: landingPages })
  } catch (error: any) {
    console.error('Get landing pages error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}

// POST /api/landing-pages - 랜딩 페이지 생성
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
    const { title, slug, meta_title, meta_description, template_id, created_by } = body

    // Validate required fields
    if (!title || !slug) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: { message: 'Slug must contain only lowercase letters, numbers, and hyphens' } },
        { status: 400 }
      )
    }

    // 소유권 검증: 요청 company_id 대신 세션에서 가져온 company_id 사용
    const company_id = userProfile.company_id

    // Check plan limits - 플랜 제한사항 체크
    const limitCheck = await canCreateLandingPage(company_id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            message: limitCheck.message || '랜딩페이지 생성 한도를 초과했습니다.',
            currentCount: limitCheck.currentCount,
            maxAllowed: limitCheck.maxAllowed
          }
        },
        { status: 403 }
      )
    }

    // 회사별 slug 중복 체크 (전역이 아닌 회사 내에서만 고유)
    const { data: existing } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('company_id', company_id)
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: { message: 'This slug is already in use' } },
        { status: 400 }
      )
    }

    // Create landing page
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .insert({
        company_id,
        title,
        slug,
        meta_title,
        meta_description,
        template_id: template_id || 'basic',
        created_by,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: landingPage })
  } catch (error: any) {
    console.error('Create landing page error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}

// PUT /api/landing-pages - 랜딩 페이지 수정
export async function PUT(request: NextRequest) {
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
    const { id, title, meta_title, meta_description, sections, theme, status } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Missing landing page ID' } }, { status: 400 })
    }

    // Update landing page (company_id 필터로 소유권 검증)
    // 공개 렌더링/제출 라우트는 status='published'뿐 아니라 is_active=true도 함께
    // 요구한다. status만 바꾸고 is_active를 안 건드리면, 이 에디터에서 "발행"을
    // 눌러도 화면엔 발행된 것처럼 보이지만 실제 공개 페이지는 그대로 막혀있게 된다.
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .update({
        title,
        meta_title,
        meta_description,
        sections,
        theme,
        status,
        is_active: status !== undefined ? status === 'published' : undefined,
        published_at: status === 'published' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!landingPage) {
      return NextResponse.json(
        { success: false, error: { message: '랜딩 페이지를 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: landingPage })
  } catch (error: any) {
    console.error('Update landing page error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}
