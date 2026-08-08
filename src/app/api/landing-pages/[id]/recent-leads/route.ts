// 랜딩페이지 '실시간 현황' 위젯용 최근 리드 조회 (공개, 인증 불필요).
// 이전에는 클라이언트가 anon 키로 leads 테이블을 직접 조회했는데, leads의 RLS
// 정책이 전부 TO authenticated라 익명 방문자에게는 항상 빈 배열만 반환돼 위젯이
// 영구히 표시되지 않았다(49차 QA 라이브 재현). leads에 anon SELECT 정책을 추가하면
// RLS는 행 단위 필터일 뿐 컬럼을 제한하지 않아 phone/email 등 PII까지 anon에게
// 조회 가능해지므로, 서버가 서비스 롤로 딱 필요한 3개 컬럼만 골라 내려주는 방식으로
// 처리한다.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증도 요청 제한도 없어 landing page id만 알면 무제한 호출로 서비스 롤 쿼리를
    // 유발할 수 있었다(56차 QA 라이브 재현) - 형제 엔드포인트(view)와 동일한 IP 기반
    // 제한을 적용한다.
    const ip = getClientIp(request)
    if (!checkRateLimit(`recent-leads:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = createServiceClient()

    const { data: landingPage } = await supabase
      .from('landing_pages')
      .select('id, status, is_active, realtime_enabled, collect_data, realtime_count, companies!inner(is_active, withdrawn_at)')
      .eq('id', params.id)
      .maybeSingle()

    if (
      !landingPage ||
      landingPage.status !== 'published' ||
      !landingPage.is_active ||
      !landingPage.realtime_enabled ||
      !landingPage.collect_data
    ) {
      return NextResponse.json({ leads: [] })
    }

    // 회사가 비활성화/탈퇴 처리된 경우 - 랜딩페이지 자체는 is_active여도
    // 소속 회사가 정지되면 위젯에 리드 정보를 계속 노출해서는 안 된다(submit
    // 라우트와 동일한 검증 패턴).
    const company = Array.isArray(landingPage.companies) ? landingPage.companies[0] : landingPage.companies
    if (!company || company.is_active === false || company.withdrawn_at) {
      return NextResponse.json({ leads: [] })
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('name, device_type, created_at')
      .eq('landing_page_id', landingPage.id)
      .order('created_at', { ascending: false })
      .limit(landingPage.realtime_count || 10)

    return NextResponse.json({ leads: leads || [] })
  } catch (error) {
    console.error('[Recent Leads API] 오류:', error)
    return NextResponse.json({ leads: [] })
  }
}
