import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('company_id, is_super_admin')
      .eq('id', authUser.id)
      .single()

    if (!user?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { phone_number, reason } = body

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // 리드 제출 시 블랙리스트 대조(landing-pages/submit/route.ts)는 숫자만 남긴
    // 값으로 비교하므로, 저장 쪽도 반드시 같은 방식으로 정규화해야 매칭이 된다.
    // 클라이언트(AddBlacklistModal)가 이미 숫자만 보내고 있지만, 향후 다른
    // 호출부(예: 일괄 등록)가 하이픈 포함 값을 그대로 보내면 대조가 조용히
    // 실패할 수 있어 API 쪽에서도 한 번 더 정규화한다.
    const normalizedPhone = phone_number.replace(/\D/g, '')
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    // 클라이언트(AddBlacklistModal)는 모바일 형식(10~11자리)을 강제하지만 API는 이 검증이
    // 없어, 직접 호출로 과도하게 긴 값을 보내면 phone_number VARCHAR(20) 제약 위반으로
    // 처리되지 않은 500이 났다(84차 QA) - 명확한 400으로 미리 거른다.
    if (normalizedPhone.length > 20) {
      return NextResponse.json({ error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('phone_blacklist')
      .insert({
        company_id: user.company_id,
        phone_number: normalizedPhone,
        reason: reason?.trim() || null,
        blocked_by_user_id: authUser.id,
      })
      .select(`*, blocked_by:users!phone_blacklist_blocked_by_user_id_fkey(full_name)`)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 블랙리스트에 등록된 번호입니다.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error adding blacklist entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
