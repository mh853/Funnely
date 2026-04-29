import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { promises as dns } from 'dns'

type Params = { params: Promise<{ id: string }> }

/**
 * DNS TXT 레코드 조회로 도메인 소유권 인증
 *
 * 인증 방식: _funnely-verify.{domain} TXT 레코드 = verification_token
 */
async function verifyDnsTxtRecord(domain: string, token: string): Promise<boolean> {
  const verifyHost = `_funnely-verify.${domain}`

  try {
    const records = await dns.resolveTxt(verifyHost)
    // TXT 레코드는 배열의 배열로 반환됨 (각 레코드가 청크로 분리)
    const flatRecords = records.flat()
    return flatRecords.some(record => record === token)
  } catch {
    // ENODATA, ENOTFOUND 등은 레코드 없음으로 처리
    return false
  }
}

// POST /api/company/custom-domains/[id]/verify - 도메인 소유권 인증
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

    // 도메인 조회
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

    if (domain.verification_status === 'verified') {
      return NextResponse.json({
        verified: true,
        message: '이미 인증된 도메인입니다.',
      })
    }

    // DNS TXT 레코드 확인
    const isVerified = await verifyDnsTxtRecord(domain.domain, domain.verification_token)

    if (isVerified) {
      // 인증 성공
      const { error: updateError } = await (supabase as any)
        .from('company_custom_domains')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          last_verification_attempt_at: new Date().toISOString(),
          verification_error: null,
        })
        .eq('id', id)

      if (updateError) {
        console.error('[Domain Verify] 상태 업데이트 실패:', updateError)
        return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
      }

      return NextResponse.json({
        verified: true,
        message: '도메인 소유권이 확인되었습니다.',
      })
    } else {
      // 인증 실패
      await (supabase as any)
        .from('company_custom_domains')
        .update({
          verification_status: 'failed',
          last_verification_attempt_at: new Date().toISOString(),
          verification_error: 'DNS TXT 레코드를 찾을 수 없습니다.',
        })
        .eq('id', id)

      return NextResponse.json({
        verified: false,
        message:
          'DNS TXT 레코드를 찾을 수 없습니다. 레코드 설정 후 최대 48시간이 걸릴 수 있습니다.',
        retryAfter: 300, // 5분 후 재시도 권장
      })
    }
  } catch (error) {
    console.error('[Domain Verify] 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
