import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 초대 링크 생성 API
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get current user's profile to check permissions and company_id
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check if user has permission to invite (admin only)
    const isAdmin =
      currentUserProfile.simple_role === 'admin' ||
      ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)

    if (!isAdmin) {
      return NextResponse.json({ error: '팀원을 초대할 권한이 없습니다.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { role, email, department } = body

    // Validate role
    const validRoles = ['admin', 'manager', 'user']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 권한입니다.' }, { status: 400 })
    }

    // Generate invitation code using the DB function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_invitation_code')

    if (codeError || !codeData) {
      console.error('Failed to generate invitation code:', codeError)
      return NextResponse.json({ error: '초대 코드 생성에 실패했습니다.' }, { status: 500 })
    }

    const invitationCode = codeData as string

    // Calculate expiration (48 hours)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('company_invitations')
      .insert({
        company_id: currentUserProfile.company_id,
        invited_by: user.id,
        invitation_code: invitationCode,
        role: role,
        email: email || null,
        department: department || null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Invitation creation error:', inviteError)
      return NextResponse.json(
        { error: '초대 링크 생성에 실패했습니다: ' + inviteError.message },
        { status: 500 }
      )
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://funnely.co.kr'
    const invitationUrl = `${baseUrl}/invite/${invitationCode}`

    return NextResponse.json({
      message: '초대 링크가 생성되었습니다.',
      invitation: {
        id: invitation.id,
        code: invitationCode,
        url: invitationUrl,
        role: role,
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Create invitation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 초대 목록 조회 API
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get current user's profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permissions
    const canView =
      currentUserProfile.simple_role === 'admin' ||
      currentUserProfile.simple_role === 'manager' ||
      ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager'].includes(currentUserProfile.role)

    if (!canView) {
      return NextResponse.json({ error: '조회 권한이 없습니다.' }, { status: 403 })
    }

    // Fetch invitations for the company
    const { data: invitations, error: inviteError } = await supabase
      .from('company_invitations')
      .select(
        `
        *,
        invited_by_user:users!company_invitations_invited_by_fkey(id, full_name, email),
        accepted_by_user:users!company_invitations_accepted_by_fkey(id, full_name, email)
      `
      )
      .eq('company_id', currentUserProfile.company_id)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Fetch invitations error:', inviteError)
      return NextResponse.json({ error: '초대 목록 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error: any) {
    console.error('Get invitations error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 초대 취소 API
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: '초대 ID가 필요합니다.' }, { status: 400 })
    }

    // Get current user's profile
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check admin permission
    const isAdmin =
      currentUserProfile.simple_role === 'admin' ||
      ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)

    if (!isAdmin) {
      return NextResponse.json({ error: '초대를 취소할 권한이 없습니다.' }, { status: 403 })
    }

    // Update invitation status to cancelled
    const { error: updateError } = await supabase
      .from('company_invitations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('company_id', currentUserProfile.company_id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Cancel invitation error:', updateError)
      return NextResponse.json({ error: '초대 취소에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ message: '초대가 취소되었습니다.' })
  } catch (error: any) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
