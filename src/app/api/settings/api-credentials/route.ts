// 광고 플랫폼 API 자격증명 조회/저장 — credentials는 항상 암호화된 상태로 DB에 저장/조회된다.
// 이전에는 페이지가 브라우저에서 직접 Supabase를 호출해 평문으로 읽고 썼는데, 암호화 키는
// 서버 환경변수로만 존재하므로 암복호화는 반드시 서버 라우트를 거쳐야 한다.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptCredentials, decryptCredentials } from '@/lib/encryption/credentials'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'

// 플랫폼별로 저장할 수 있는 키 - 이 목록 밖의 값은 버리고, 모두 비어 있지 않은 문자열이어야 한다.
const PLATFORM_FIELDS: Record<string, string[]> = {
  meta: ['app_id', 'app_secret'],
  kakao: ['rest_api_key', 'javascript_key'],
  google: ['client_id', 'client_secret', 'developer_token'],
}

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
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 저장된 시크릿은 회사 관리자만 열람할 수 있다 (manager 등 일반 구성원 제외).
    if (!isAdminOrLegacyOwner(userProfile)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { data: credentials, error } = await supabase
      .from('api_credentials')
      .select('platform, credentials, is_active, last_validated_at')
      .eq('company_id', userProfile.company_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const decrypted = (credentials || []).map((cred: any) => {
      const plain = decryptCredentials(cred.credentials)
      return {
        platform: cred.platform,
        credentials: plain,
        exists: true,
        validated: !!cred.last_validated_at,
        // 암호화 키가 바뀌기 전(예전 공유 키 폴백 시절)에 저장된 값은 현재 키로 복호화되지
        // 않아 빈 객체가 된다 - "설정됨"으로 보이지만 실제로는 쓸 수 없으므로 재입력을 안내한다.
        needsReentry: Object.keys(plain).length === 0,
      }
    })

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
      .select('company_id, role, simple_role')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!isAdminOrLegacyOwner(userProfile)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { platform, credentials } = body

    const fields = PLATFORM_FIELDS[platform]
    if (!fields || !credentials || typeof credentials !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const sanitized: Record<string, string> = {}
    for (const field of fields) {
      const value = typeof credentials[field] === 'string' ? credentials[field].trim() : ''
      if (!value) {
        return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
      }
      sanitized[field] = value
    }

    const { error } = await supabase
      .from('api_credentials')
      .upsert(
        {
          company_id: userProfile.company_id,
          platform,
          credentials: encryptCredentials(sanitized),
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
