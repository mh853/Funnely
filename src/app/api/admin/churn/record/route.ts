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
    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)
    }

    // 3. 요청 본문 파싱
    const body = await request.json()
    const { churn_record_id, was_preventable } = body

    if (!churn_record_id) {
      return NextResponse.json({ error: 'churn_record_id is required' }, { status: 400 })
    }

    // 4. 이탈 기록 업데이트
    // reason_category/feedback은 churn_records에 존재하지 않는 컬럼이었고(58차 QA
    // 확인), 이 값을 실제로 읽는 코드도 프로젝트 어디에도 없어 함께 제거한다.
    // was_preventable은 src/lib/churn/calculations.ts가 실제로 읽는 필드인데
    // metadata(JSONB) 안에 있어야 하며 최상위 컬럼이 아니다 - 기존 metadata를
    // 보존하면서 이 키만 병합한다.
    const { data: existing, error: fetchError } = await supabase
      .from('churn_records')
      .select('metadata')
      .eq('id', churn_record_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Churn record not found' }, { status: 404 })
      }
      throw fetchError
    }

    const { data, error } = await supabase
      .from('churn_records')
      .update({
        metadata: { ...(existing.metadata || {}), was_preventable },
      })
      .eq('id', churn_record_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Churn record not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating churn record:', error)
    return NextResponse.json(
      { error: 'Failed to update churn record' },
      { status: 500 }
    )
  }
}
