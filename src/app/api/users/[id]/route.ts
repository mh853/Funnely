import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check if user has permission to edit (hospital_owner or hospital_admin)
    if (!['hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)) {
      return NextResponse.json({ error: '팀원을 수정할 권한이 없습니다.' }, { status: 403 })
    }

    // Get target user to verify they're in the same hospital
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '수정할 팀원을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify same hospital
    if (targetUser.company_id !== currentUserProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { fullName, role } = body

    // Validate required fields
    if (!fullName || !role) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['marketing_staff', 'marketing_manager', 'hospital_admin', 'hospital_owner', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 권한입니다.' }, { status: 400 })
    }

    // Prevent hospital_admin from changing hospital_owner role
    if (targetUser.role === 'hospital_owner' && currentUserProfile.role !== 'hospital_owner') {
      return NextResponse.json({ error: '회사 관리자의 권한을 변경할 수 없습니다.' }, { status: 403 })
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: '수정에 실패했습니다: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: '팀원 정보가 수정되었습니다.',
    })
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Prevent self-deletion
    if (user.id === id) {
      return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    // Get current user's profile to check permissions
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check if user has permission to delete (hospital_owner or hospital_admin)
    if (!['hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)) {
      return NextResponse.json({ error: '팀원을 삭제할 권한이 없습니다.' }, { status: 403 })
    }

    // Get target user to verify they're in the same hospital
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '삭제할 팀원을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify same hospital
    if (targetUser.company_id !== currentUserProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Prevent hospital_admin from deleting hospital_owner
    if (targetUser.role === 'hospital_owner' && currentUserProfile.role !== 'hospital_owner') {
      return NextResponse.json({ error: '회사 관리자를 삭제할 수 없습니다.' }, { status: 403 })
    }

    // Delete user profile from public.users
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteUserError) {
      console.error('User profile deletion error:', deleteUserError)
      return NextResponse.json({ error: '사용자 삭제에 실패했습니다: ' + deleteUserError.message }, { status: 500 })
    }

    // Delete auth user using admin API
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      console.error('Auth user deletion error:', deleteAuthError)
      // Note: User profile is already deleted, but log the auth deletion error
      // This is acceptable as the user won't be able to login anyway
    }

    return NextResponse.json({
      message: '팀원이 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
