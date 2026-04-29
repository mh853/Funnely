import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { DomainDnsConfig } from '@/types/custom-domain.types'

type Params = { params: Promise<{ id: string }> }

const VERCEL_API_BASE = 'https://api.vercel.com'
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

/**
 * Vercel API로 도메인 등록
 */
async function registerDomainOnVercel(domain: string): Promise<{
  success: boolean
  dnsConfig?: DomainDnsConfig
  error?: string
}> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return {
      success: false,
      error: 'Vercel API 설정이 완료되지 않았습니다. 관리자에게 문의하세요.',
    }
  }

  try {
    // 1. 도메인 등록
    const registerRes = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      }
    )

    if (!registerRes.ok) {
      const errorData = await registerRes.json()
      // 이미 등록된 도메인인 경우는 계속 진행 (DNS 설정값 조회)
      if (errorData.error?.code !== 'domain_already_in_use') {
        console.error('[Vercel API] 도메인 등록 실패:', errorData)
        return {
          success: false,
          error: `Vercel 도메인 등록 실패: ${errorData.error?.message || '알 수 없는 오류'}`,
        }
      }
    }

    // 2. DNS 설정값 조회
    const configRes = await fetch(
      `${VERCEL_API_BASE}/v6/domains/${domain}/config`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    if (!configRes.ok) {
      return {
        success: true,
        // DNS 조회 실패 시 기본값 제공
        dnsConfig: {
          cname: 'cname.vercel-dns.com',
          configType: 'cname',
        },
      }
    }

    const configData = await configRes.json()

    const dnsConfig: DomainDnsConfig = {
      configType: configData.misconfigured ? 'a_record' : 'cname',
      cname: configData.cnames?.[0] || 'cname.vercel-dns.com',
      aValues: configData.aValues,
    }

    return { success: true, dnsConfig }
  } catch (error) {
    console.error('[Vercel API] 오류:', error)
    return { success: false, error: 'Vercel API 연결에 실패했습니다.' }
  }
}

// POST /api/company/custom-domains/[id]/vercel - Vercel에 도메인 등록
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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

    const { data: domainRaw, error: fetchError } = await supabase
      .from('company_custom_domains' as any)
      .select('*')
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .single()
    const domain = domainRaw as any

    if (fetchError || !domain) {
      return NextResponse.json({ error: '도메인을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Vercel에 도메인 등록
    const result = await registerDomainOnVercel(domain.domain)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // DB 업데이트
    const { error: updateError } = await (supabase as any)
      .from('company_custom_domains')
      .update({
        vercel_registered: true,
        vercel_registered_at: new Date().toISOString(),
        vercel_config_type: result.dnsConfig?.configType || 'cname',
      })
      .eq('id', id)

    if (updateError) {
      console.error('[Vercel] DB 업데이트 실패:', updateError)
    }

    return NextResponse.json({
      registered: true,
      dnsConfig: result.dnsConfig,
      message: 'Vercel에 도메인이 등록되었습니다.',
    })
  } catch (error) {
    console.error('[Vercel Domain] POST 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/company/custom-domains/[id]/vercel - Vercel DNS 설정값 조회
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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

    const { data: domainGetRaw } = await supabase
      .from('company_custom_domains' as any)
      .select('domain, vercel_config_type')
      .eq('id', id)
      .eq('company_id', (userProfile as any)?.company_id)
      .single()
    const domain = domainGetRaw as any

    if (!domain) {
      return NextResponse.json({ error: '도메인을 찾을 수 없습니다.' }, { status: 404 })
    }

    // DNS 설정 안내 정보 반환 (Vercel API 미설정 시 기본값)
    const dnsConfig: DomainDnsConfig = {
      configType: (domain.vercel_config_type as 'cname' | 'a_record') || 'cname',
      cname: 'cname.vercel-dns.com',
      aValues: ['76.76.21.21'],
    }

    return NextResponse.json({ dnsConfig })
  } catch (error) {
    console.error('[Vercel Domain] GET 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
