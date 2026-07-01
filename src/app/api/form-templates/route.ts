import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/form-templates - 폼 템플릿 목록 조회
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

    const { data: templates, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: templates })
  } catch (error: any) {
    console.error('Get form templates error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}

// POST /api/form-templates - 폼 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // 세션에서 company_id 가져오기 (바디의 company_id를 신뢰하지 않음)
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      fields,
      success_message,
      enable_timer,
      timer_deadline,
      enable_counter,
      counter_limit,
      is_active,
    } = body

    // Validate required fields
    if (!name || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    // Validate fields structure
    if (fields.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one field is required' } },
        { status: 400 }
      )
    }

    // Create form template
    const { data: template, error } = await supabase
      .from('form_templates')
      .insert({
        company_id: userProfile.company_id,
        name,
        description,
        fields,
        success_message,
        enable_timer,
        timer_deadline,
        enable_counter,
        counter_limit,
        counter_current: 0,
        is_active,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    console.error('Create form template error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}

// PUT /api/form-templates - 폼 템플릿 수정
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
    const {
      id,
      name,
      description,
      fields,
      success_message,
      enable_timer,
      timer_deadline,
      enable_counter,
      counter_limit,
      is_active,
    } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Missing template ID' } }, { status: 400 })
    }

    // company_id 검증: 세션 사용자의 company_id와 일치하는 템플릿만 수정
    const { data: putUserProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!putUserProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    // Update form template
    const { data: template, error } = await supabase
      .from('form_templates')
      .update({
        name,
        description,
        fields,
        success_message,
        enable_timer,
        timer_deadline,
        enable_counter,
        counter_limit,
        is_active,
      })
      .eq('id', id)
      .eq('company_id', putUserProfile.company_id)
      .select()
      .maybeSingle()

    if (error) throw error

    if (!template) {
      return NextResponse.json(
        { success: false, error: { message: '폼 템플릿을 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    console.error('Update form template error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    )
  }
}
