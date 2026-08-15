import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { toKSTDateStr } from '@/lib/utils/date'

// Service role client for bypassing RLS
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Device type detection from User-Agent
type DeviceType = 'desktop' | 'mobile' | 'tablet'

function getDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'desktop'

  const ua = userAgent.toLowerCase()

  // Tablet detection (must come before mobile check)
  if (
    /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)
  ) {
    return 'tablet'
  }

  // Mobile detection
  if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|mini|webos|opera mini|opera mobi/i.test(ua)
  ) {
    return 'mobile'
  }

  return 'desktop'
}

// POST /api/landing-pages/view - Increment page view count
export async function POST(request: NextRequest) {
  try {
    // 인증도 요청 제한도 없어 pageId만 알면 무제한 호출로 views_count/전환율 지표를
    // 조작할 수 있었다 - 형제 엔드포인트(submit)와 동일한 IP 기반 제한을 적용한다.
    const ip = getClientIp(request)
    if (!checkRateLimit(`landing-page-view:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    // pageId만으로 랜딩페이지 자체의 is_active나 소속 회사의 활성/탈퇴 상태를
    // 전혀 확인하지 않아, 비공개 전환되거나 정지된 회사의 페이지도 조회수/전환율
    // 지표가 계속 조작될 수 있었다(submit 라우트와 동일한 검증 패턴).
    const { data: landingPage } = await supabase
      .from('landing_pages')
      .select('id, is_active, companies!inner(is_active, withdrawn_at)')
      .eq('id', pageId)
      .maybeSingle()

    const company = landingPage
      ? Array.isArray(landingPage.companies) ? landingPage.companies[0] : landingPage.companies
      : null

    if (!landingPage || !landingPage.is_active || !company || company.is_active === false || company.withdrawn_at) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const userAgent = request.headers.get('user-agent')
    const deviceType = getDeviceType(userAgent)
    const today = toKSTDateStr(new Date())

    // 1. Increment total views_count in landing_pages table
    const { error: rpcError } = await supabase.rpc('increment_landing_page_views', {
      page_id: pageId,
    })

    if (rpcError) {
      console.error('Failed to increment page views:', rpcError)
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 })
    }

    // 2. Upsert daily analytics data - SELECT 후 별도 INSERT/UPDATE로 나누면 동시요청 시
    // INSERT 충돌로 조회가 누락되거나 UPDATE끼리 서로 덮어써 조용히 유실된다(46차 QA로
    // 라이브 재현 확인) - ON CONFLICT DO UPDATE 원자적 RPC로 처리한다.
    const { error: analyticsError } = await supabase.rpc('increment_landing_page_analytics', {
      p_landing_page_id: pageId,
      p_date: today,
      p_device_type: deviceType,
    })

    if (analyticsError) {
      console.error('Failed to upsert analytics:', analyticsError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
