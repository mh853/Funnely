import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    const body = await request.json()
    const { company_id, title, slug, meta_title, meta_description, template_id, created_by } =
      body

    // Validate required fields
    if (!company_id || !title || !slug) {
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

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('slug', slug)
      .single()

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

    const body = await request.json()
    const { id, title, meta_title, meta_description, sections, theme, status } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Missing landing page ID' } }, { status: 400 })
    }

    // Update landing page
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .update({
        title,
        meta_title,
        meta_description,
        sections,
        theme,
        status,
        published_at: status === 'published' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: landingPage })
  } catch (error: any) {
    console.error('Update landing page error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}
