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

// 인증 없는 공개 엔드포인트가 리드 실명을 마스킹 없이 그대로 반환하고 있었다
// (83차 QA) - "홍○○" 형태로 첫 글자만 남기고 나머지는 마스킹한다.
function maskName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 1) return trimmed
  return trimmed[0] + '○'.repeat(trimmed.length - 1)
}

// realtime_count는 클라이언트에서 직접 landing_pages 행을 update하는 경로로도
// 저장되어(LandingPageNewForm.tsx) 서버측 저장시점 검증을 우회할 수 있다 - 조회
// 시점에 한 번 더 상한을 강제해, 비정상적으로 큰 값을 설정해도 이 회사 리드
// 실명 전체를 한 번에 끌어올 수는 없도록 막는다.
const MAX_REALTIME_COUNT = 50

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

    const requestedCount = landingPage.realtime_count || 10
    const { data: leads } = await supabase
      .from('leads')
      .select('name, device_type, created_at')
      .eq('landing_page_id', landingPage.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(requestedCount, 1), MAX_REALTIME_COUNT))

    const maskedLeads = (leads || []).map((lead) => ({
      ...lead,
      name: lead.name ? maskName(lead.name) : lead.name,
    }))

    return NextResponse.json({ leads: maskedLeads })
  } catch (error) {
    console.error('[Recent Leads API] 오류:', error)
    return NextResponse.json({ leads: [] })
  }
}
