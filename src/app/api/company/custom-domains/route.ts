import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canUseCustomDomain } from '@/lib/subscription-access'
import { isAdminUser } from '@/lib/auth/permissions'
import type { CreateCustomDomainRequest } from '@/types/custom-domain.types'

// 자사 도메인 패턴 (악용 방지)
const BLOCKED_DOMAIN_PATTERNS = [
  'funnely.co.kr',
  'funnely.com',
  'vercel.app',
  'vercel-dns.com',
]

function isValidDomain(domain: string): boolean {
  // 기본 도메인 형식 검사
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  if (!domainRegex.test(domain)) return false

  // 와일드카드 차단
  if (domain.includes('*')) return false

  // 자사 도메인 차단
  if (BLOCKED_DOMAIN_PATTERNS.some(blocked => domain === blocked || domain.endsWith(`.${blocked}`))) {
    return false
  }

  return true
}

// GET /api/company/custom-domains - 회사의 커스텀 도메인 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: domains, error } = await supabase
      .from('company_custom_domains' as any)
      .select('*')
      .eq('company_id', (userProfile as any)?.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Custom Domain] 목록 조회 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ domains: domains || [] })
  } catch (error) {
    console.error('[Custom Domain] GET 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/company/custom-domains - 새 도메인 등록 시작
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 커스텀 도메인은 회사 전체 랜딩페이지 라우팅에 영향을 주는 설정이라 companies
    // UPDATE와 동일하게 관리자 전용으로 제한한다 - 이전엔 회사 소속이기만 하면
    // viewer 등 최하위 권한도 도메인을 등록할 수 있었다(86차 QA, RLS도 함께 수정).
    if (!isAdminUser(userProfile)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 플랜 확인 (소규모 기업 이상만 허용)
    const { allowed, message } = await canUseCustomDomain((userProfile as any)?.company_id)
    if (!allowed) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const body: CreateCustomDomainRequest = await request.json()
    const domain = body.domain?.toLowerCase().trim()

    if (!domain) {
      return NextResponse.json({ error: '도메인을 입력해주세요.' }, { status: 400 })
    }

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: '올바른 도메인 형식이 아닙니다. (예: my-clinic.com)' },
        { status: 400 }
      )
    }

    // 도메인 중복 확인
    const serviceClient = createServiceClient()
    const { data: existingRaw } = await serviceClient
      .from('company_custom_domains' as any)
      .select('id, company_id')
      .eq('domain', domain)
      .single()
    const existing = existingRaw as any

    if (existing) {
      if (existing.company_id === (userProfile as any)?.company_id) {
        return NextResponse.json({ error: '이미 등록된 도메인입니다.' }, { status: 409 })
      }
      return NextResponse.json(
        { error: '이미 다른 계정에서 사용 중인 도메인입니다.' },
        { status: 409 }
      )
    }

    // 도메인 등록 (verification_token은 DB 기본값으로 자동 생성)
    const { data: newDomain, error: insertError } = await supabase
      .from('company_custom_domains' as any)
      .insert({
        company_id: (userProfile as any)?.company_id,
        domain,
        verification_status: 'pending',
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('[Custom Domain] 도메인 등록 실패:', insertError)
      // 사전 조회와 실제 등록 사이에 다른 요청이 먼저 같은 도메인을 등록하는
      // 레이스가 있을 수 있어, unique 제약(23505) 위반은 DB를 최종 판정 기준으로
      // 삼아 별도로 안내한다. 그 외 에러는 원본 메시지를 그대로 노출하지 않는다.
      if (insertError.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 도메인입니다.' }, { status: 409 })
      }
      return NextResponse.json({ error: '도메인 등록에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ domain: newDomain }, { status: 201 })
  } catch (error) {
    console.error('[Custom Domain] POST 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
