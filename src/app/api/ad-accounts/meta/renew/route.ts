// Meta 연결 자동 연장 - 브라우저 JS SDK가 받은 단기 토큰을 장기 토큰으로 바꿔, 처음 연결한 사람과 같고 그 사람이 지금도 볼 수 있는 계정만 새 토큰으로 바꾼다
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { decryptToken, encryptToken } from '@/lib/encryption/credentials'
import { exchangeShortLivedToken, getMetaUserId, isMetaEnabledForCompany, listAdAccounts } from '@/lib/ads/meta'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()
  if (!userProfile?.company_id || !isAdminOrLegacyOwner(userProfile)) {
    return NextResponse.json({ error: '회사 관리자만 연장할 수 있습니다.' }, { status: 403 })
  }
  if (!isMetaEnabledForCompany(userProfile.company_id)) {
    return NextResponse.json({ error: 'Meta 연동이 아직 준비되지 않았습니다.' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const shortToken = typeof body?.accessToken === 'string' ? body.accessToken : ''
  if (!shortToken) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const admin = createServiceClient() as any
  const { data: rows } = await admin
    .from('ad_accounts')
    .select('id, account_id, access_token, metadata')
    .eq('company_id', userProfile.company_id)
    .eq('platform', 'meta')
  const targets = (rows || []).filter((a: any) => a.metadata?.auto_renew === true)
  if (targets.length === 0) return NextResponse.json({ success: true, renewed: 0 })

  let token, fbUserId: string, visible: Set<string>
  try {
    // 퍼널리 앱 시크릿으로 교환되지 않는 토큰(다른 앱)은 여기서 걸러진다
    token = await exchangeShortLivedToken(shortToken)
    fbUserId = await getMetaUserId(token.accessToken)
    visible = new Set((await listAdAccounts(token.accessToken)).map((a) => a.id))
  } catch (error) {
    console.error('[Meta renew] token error:', error)
    return NextResponse.json({ error: 'Meta 연결을 연장하지 못했습니다.' }, { status: 502 })
  }

  // 같은 토큰으로 연결된 계정끼리는 주인이 같으니 저장된 토큰 하나당 한 번만 물어본다 (예전 연결은 fb_user_id가 없다)
  const ownerByStoredToken = new Map<string, string | null>()
  const ownerOf = async (a: any): Promise<string | null> => {
    if (a.metadata?.fb_user_id) return String(a.metadata.fb_user_id)
    if (!ownerByStoredToken.has(a.access_token)) {
      const stored = decryptToken(a.access_token)
      ownerByStoredToken.set(a.access_token, stored ? await getMetaUserId(stored).catch(() => null) : null)
    }
    return ownerByStoredToken.get(a.access_token) ?? null
  }

  const encrypted = encryptToken(token.accessToken)
  let renewed = 0
  for (const a of targets) {
    if (!visible.has(a.account_id)) continue
    const owner = await ownerOf(a)
    // 처음 연결한 사람을 알 수 있으면 같은 사람일 때만 바꾼다. 모르면(만료된 예전 연결) 지금 이 계정을 볼 수 있는지만 본다.
    if (owner && owner !== fbUserId) continue
    const { error } = await admin
      .from('ad_accounts')
      .update({
        access_token: encrypted,
        token_expires_at: token.expiresAt,
        metadata: {
          ...a.metadata,
          fb_user_id: fbUserId,
          needs_reconnect: false,
          // 만료로 멈췄던 계정이면 '다시 연결해주세요' 오류도 같이 지운다 (다음 동기화가 새로 채운다)
          ...(a.metadata?.needs_reconnect ? { last_sync_error: null } : {}),
          last_renewed_at: new Date().toISOString(),
        },
      })
      .eq('id', a.id)
    if (!error) renewed++
  }
  return NextResponse.json({ success: true, renewed, expiresAt: renewed > 0 ? token.expiresAt : null })
}
