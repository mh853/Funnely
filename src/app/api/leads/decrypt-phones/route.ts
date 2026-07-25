import { createClient } from '@/lib/supabase/server'
import { decryptPhone } from '@/lib/encryption/phone'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leads/decrypt-phones - 리드 전화번호 일괄 복호화
// 복호화 키가 서버 전용이라(클라이언트에 노출되면 보안 후퇴) 브라우저에서
// 직접 leads.phone을 조회하는 화면(캘린더/예약 스케줄 등)은 이 엔드포인트로
// 복호화된 값을 따로 받아와야 한다.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const leadIds: string[] = Array.isArray(body.leadIds) ? body.leadIds.slice(0, 500) : []

    if (leadIds.length === 0) {
      return NextResponse.json({ phones: {} })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, phone')
      .eq('company_id', (userProfile as any).company_id)
      .in('id', leadIds)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const phones: Record<string, string> = {}
    for (const lead of leads || []) {
      const l = lead as any
      if (l.phone) {
        phones[l.id] = decryptPhone(l.phone)
      }
    }

    return NextResponse.json({ phones })
  } catch (error) {
    console.error('[decrypt-phones] 오류:', error)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
