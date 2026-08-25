// 체크박스로 선택한 DB(리드)를 일괄 삭제하는 API - DB 현황의 선택 삭제 기능
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/admin/audit-middleware'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const ids: unknown = body.ids

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { error: { message: '삭제할 항목을 선택해주세요.' } },
        { status: 400 }
      )
    }

    // company_id로 다시 한 번 좁혀서, 다른 회사 소속 id가 섞여 들어와도 그 부분은
    // 조용히 무시되고(삭제 안 됨) 다른 회사 데이터가 삭제되는 일이 없게 한다.
    const { data: deleted, error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('company_id', userProfile.company_id)
      .select('id, name, phone')

    if (error) {
      console.error('Bulk lead delete error:', error)
      return NextResponse.json(
        { error: { message: '삭제 중 오류가 발생했습니다.' } },
        { status: 500 }
      )
    }

    const deletedCount = deleted?.length || 0

    // 삭제 이력 기록 (설정 > DB 삭제 이력) - 실제 삭제된 건수(deletedCount)만 남기고
    // 요청받은 ids.length는 쓰지 않는다(다른 회사 id가 섞여도 조용히 걸러지므로 다를 수 있음).
    // 로그 실패가 삭제 자체를 막으면 안 되므로 에러는 삼킨다.
    if (deletedCount > 0) {
      const { error: logError } = await supabase.from('lead_deletion_logs').insert({
        company_id: userProfile.company_id,
        deleted_by: user.id,
        deleted_count: deletedCount,
      })
      if (logError) {
        console.error('Lead deletion log insert error:', logError)
      }

      // 퍼널리 내부 admin(super_admin)용 상세 감사 로그 - 이름/전화번호까지 남긴다(분쟁 대응용).
      // 전화번호는 leads 테이블에 저장된 형태 그대로(암호화된 상태) 기록하고, 조회 시점
      // (/api/admin/audit-logs)에서만 복호화한다 - 로그에도 평문 전화번호를 영구 저장하지 않기 위함.
      // 고객사 자신에게는 노출되지 않음(설정 페이지는 위 lead_deletion_logs만 사용, 건수만 표시).
      await createAuditLog(request, {
        userId: user.id,
        companyId: userProfile.company_id,
        action: AUDIT_ACTIONS.LEAD_BULK_DELETE,
        entityType: ENTITY_TYPES.LEAD,
        metadata: {
          deletedCount,
          deletedLeads: (deleted || []).map((lead) => ({ name: lead.name, phone: lead.phone })),
        },
      })
    }

    return NextResponse.json({ success: true, deleted: deletedCount })
  } catch (error: any) {
    console.error('Bulk lead delete error:', error)
    return NextResponse.json(
      { error: { message: error.message || '삭제 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
