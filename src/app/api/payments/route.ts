// 결제 내역 페이지의 "더보기" 페이지네이션용 API. 서버 컴포넌트가 첫 50건을
// 이미 내려주므로, 이 라우트는 offset 이후 다음 배치를 조회한다(51차 QA:
// 첫 50건 이후 내역이 어떤 안내도 없이 조용히 사라지던 문제 대응).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') || '0'))

    const { data: transactions, error, count } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('[Payments API] 조회 실패:', error)
      return NextResponse.json({ error: '결제 내역 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      transactions: transactions || [],
      totalCount: count ?? 0,
      hasMore: offset + PAGE_SIZE < (count ?? 0),
    })
  } catch (error) {
    console.error('[Payments API] 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
