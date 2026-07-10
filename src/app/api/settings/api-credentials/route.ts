// 광고 플랫폼 API 자격증명 조회/저장 — credentials는 항상 암호화된 상태로 DB에 저장/조회된다.
// 이전에는 페이지가 브라우저에서 직접 Supabase를 호출해 평문으로 읽고 썼는데, 암호화 키는
// 서버 환경변수로만 존재하므로 암복호화는 반드시 서버 라우트를 거쳐야 한다.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptCredentials, decryptCredentials } from '@/lib/encryption/credentials'

const VALID_PLATFORMS = ['meta', 'kakao', 'google']

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 저장된 시크릿은 회사 관리자만 열람할 수 있다 (viewer 등 일반 구성원 제외).
    if (!['company_owner', 'company_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('platform, credentials, is_active, last_validated_at')
      .eq('company_id', userProfile.company_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const decrypted = (credentials || []).map((cred: any) => ({
      platform: cred.platform,
      credentials: decryptCredentials(cred.credentials),
      exists: true,
      validated: !!cred.last_validated_at,
    }))

    return NextResponse.json({ credentials: decrypted })
  } catch (error: any) {
    console.error('[API Credentials] GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!['company_owner', 'company_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { platform, credentials } = body

    if (!platform || !VALID_PLATFORMS.includes(platform) || !credentials) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('api_credentials')
      .upsert(
        {
          company_id: userProfile.company_id,
          platform,
          credentials: encryptCredentials(credentials),
          is_active: true,
        } as any,
        { onConflict: 'company_id,platform' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API Credentials] PUT error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
