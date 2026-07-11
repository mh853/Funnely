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

    // Check if user has permission to edit (company_owner or company_admin)
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)) {
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

    // Verify same company
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
    const validRoles = ['marketing_staff', 'marketing_manager', 'company_admin', 'company_owner', 'hospital_admin', 'hospital_owner', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 권한입니다.' }, { status: 400 })
    }

    // 회사 관리자(owner) 권한은 기존에 이미 owner인 사람만 부여/변경할 수 있다.
    // 대상의 "현재" 역할만 검사하면, company_admin이 role 파라미터에 company_owner를
    // 넣어 자기 자신(또는 동료)을 owner로 승격시키는 권한 상승이 가능해진다.
    // "바뀌는 새 역할"과 "대상의 현재 역할" 둘 다 검사해야 한다.
    const isOwnerRole = (r: string) => ['company_owner', 'hospital_owner'].includes(r)
    if (
      (isOwnerRole(targetUser.role) || isOwnerRole(role)) &&
      !isOwnerRole(currentUserProfile.role)
    ) {
      return NextResponse.json({ error: '회사 관리자의 권한을 변경할 수 없습니다.' }, { status: 403 })
    }

    // 마지막 관리자 보호: owner급 역할에서 벗어나는 변경이면, 같은 회사에
    // 다른 owner급 사용자가 남아있는지 확인한다. 대상이 유일한 owner라면 강등을 막는다.
    if (isOwnerRole(targetUser.role) && !isOwnerRole(role)) {
      const { count: otherOwnerCount, error: ownerCountError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', currentUserProfile.company_id)
        .eq('is_active', true)
        .in('role', ['company_owner', 'hospital_owner'])
        .neq('id', id)

      if (ownerCountError) {
        console.error('Owner count check error:', ownerCountError)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
      }

      if (!otherOwnerCount) {
        return NextResponse.json({ error: '마지막 관리자는 강등할 수 없습니다.' }, { status: 400 })
      }
    }

    // Update user profile (company_id 필터로 TOCTOU 방지)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', currentUserProfile.company_id)

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

    // Check if user has permission to delete (company_owner or company_admin)
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)) {
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

    // Prevent company_admin from deleting company_owner
    if (['company_owner', 'hospital_owner'].includes(targetUser.role) && !['company_owner', 'hospital_owner'].includes(currentUserProfile.role)) {
      return NextResponse.json({ error: '회사 관리자를 삭제할 수 없습니다.' }, { status: 403 })
    }

    // Delete user profile from public.users (company_id 필터로 TOCTOU 방지)
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUserProfile.company_id)

    if (deleteUserError) {
      console.error('User profile deletion error:', deleteUserError)
      // leads.assigned_to 등은 ON DELETE 제약이 없어(NO ACTION), 담당 리드가 남아있는
      // 상태로 삭제를 시도하면 DB가 FK 위반(23503)으로 막는다. 이 경우 원본 Postgres
      // 에러 문구 대신 사용자가 이해할 수 있는 안내를 준다.
      if (deleteUserError.code === '23503') {
        return NextResponse.json(
          { error: '이 팀원에게 배정된 리드가 남아있어 삭제할 수 없습니다. 먼저 담당 리드를 다른 팀원에게 재배정해주세요.' },
          { status: 409 }
        )
      }
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
