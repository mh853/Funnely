import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permission
    const allowedRoles = ['hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff']
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Get report to verify ownership
    const { data: report } = await supabase
      .from('reports')
      .select('company_id')
      .eq('id', id)
      .single()

    if (!report) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (report.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Delete report
    const { error } = await supabase.from('reports').delete().eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Report deletion error:', error)
    return NextResponse.json(
      { error: error.message || '삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
