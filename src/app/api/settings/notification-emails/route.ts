import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET - 이메일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get company notification emails
    const { data: company } = await supabase
      .from('companies')
      .select('notification_emails')
      .eq('id', userProfile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json({
      emails: company.notification_emails || [],
    })
  } catch (error) {
    console.error('GET notification emails error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 이메일 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission
    if (!['company_owner', 'company_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: '권한이 없습니다. 회사 관리자만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // Parse request body
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '이메일 주소가 필요합니다.' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 })
    }

    // Get current emails
    const { data: company } = await supabase
      .from('companies')
      .select('notification_emails')
      .eq('id', userProfile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const currentEmails = company.notification_emails || []

    // Check if email already exists
    if (currentEmails.includes(email)) {
      return NextResponse.json({ error: '이미 등록된 이메일 주소입니다.' }, { status: 400 })
    }

    // Check max limit
    if (currentEmails.length >= 5) {
      return NextResponse.json({ error: '최대 5개까지만 등록 가능합니다.' }, { status: 400 })
    }

    // Add new email
    const updatedEmails = [...currentEmails, email]

    // Use service client to bypass RLS for admin operation
    const serviceSupabase = createServiceClient()
    const { error: updateError } = await serviceSupabase
      .from('companies')
      .update({ notification_emails: updatedEmails })
      .eq('id', userProfile.company_id)

    if (updateError) {
      console.error('Failed to update notification emails:', updateError)
      return NextResponse.json(
        { error: '이메일 추가에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emails: updatedEmails,
    })
  } catch (error) {
    console.error('POST notification emails error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - 이메일 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permission
    if (!['company_owner', 'company_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: '권한이 없습니다. 회사 관리자만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // Parse request body
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '이메일 주소가 필요합니다.' }, { status: 400 })
    }

    // Get current emails
    const { data: company } = await supabase
      .from('companies')
      .select('notification_emails')
      .eq('id', userProfile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const currentEmails = company.notification_emails || []

    // Check if email exists
    if (!currentEmails.includes(email)) {
      return NextResponse.json({ error: '해당 이메일이 등록되어 있지 않습니다.' }, { status: 400 })
    }

    // Remove email
    const updatedEmails = currentEmails.filter((e: string) => e !== email)

    // Use service client to bypass RLS for admin operation
    const serviceSupabase = createServiceClient()
    const { error: updateError } = await serviceSupabase
      .from('companies')
      .update({ notification_emails: updatedEmails })
      .eq('id', userProfile.company_id)

    if (updateError) {
      console.error('Failed to update notification emails:', updateError)
      return NextResponse.json(
        { error: '이메일 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emails: updatedEmails,
    })
  } catch (error) {
    console.error('DELETE notification emails error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
