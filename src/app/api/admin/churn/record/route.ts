import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. 요청 본문 파싱
    const body = await request.json()
    const { churn_record_id, reason_category, feedback, was_preventable } =
      body

    // 4. 이탈 기록 업데이트
    const { data, error } = await supabase
      .from('churn_records')
      .update({
        reason_category,
        feedback,
        was_preventable,
      })
      .eq('id', churn_record_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating churn record:', error)
    return NextResponse.json(
      { error: 'Failed to update churn record' },
      { status: 500 }
    )
  }
}
