// 연결된 광고 계정 해제 - 저장된 토큰과 그 계정의 캠페인·성과 데이터가 함께 삭제된다 (FK CASCADE)
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile?.company_id || !isAdminOrLegacyOwner(userProfile)) {
    return NextResponse.json({ error: '회사 관리자만 연결을 해제할 수 있습니다.' }, { status: 403 })
  }

  // company_id로 한 번 더 좁혀 다른 회사 계정은 지워지지 않게 한다
  const admin = createServiceClient() as any
  const { data: deleted, error } = await admin
    .from('ad_accounts')
    .delete()
    .eq('id', id)
    .eq('company_id', userProfile.company_id)
    .select('id')
  if (error) {
    return NextResponse.json({ error: '연결 해제 중 오류가 발생했습니다.' }, { status: 500 })
  }
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: '광고 계정을 찾을 수 없습니다.' }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
