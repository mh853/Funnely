import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permission
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Get ad account
    const { data: adAccount, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (accountError || !adAccount) {
      return NextResponse.json({ error: '광고 계정을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify same company
    if (adAccount.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Get API credentials from database
    const { data: credentialData, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials')
      .eq('company_id', userProfile.company_id)
      .eq('platform', adAccount.platform)
      .single()

    if (credError || !credentialData) {
      return NextResponse.json(
        { error: 'API 인증 정보가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }

    // Refresh token based on platform
    let newAccessToken: string
    let expiresIn: number
    let accountStatus: boolean | null = null

    switch (adAccount.platform) {
      case 'meta':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshMetaToken(
          adAccount.access_token,
          credentialData.credentials as { app_id: string; app_secret: string }
        ))
        // Meta: 토큰 갱신 후 계정 상태도 조회
        accountStatus = await getMetaAccountStatus(newAccessToken, adAccount.account_id)
        break
      case 'kakao':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshKakaoToken(
          adAccount.refresh_token,
          credentialData.credentials as { rest_api_key: string }
        ))
        break
      case 'google':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshGoogleToken(
          adAccount.refresh_token,
          credentialData.credentials as { client_id: string; client_secret: string }
        ))
        break
      default:
        return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 })
    }

    // Update token in database
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const updateData: Record<string, any> = {
      access_token: newAccessToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }

    // Meta 계정인 경우 상태도 업데이트
    if (accountStatus !== null) {
      updateData.is_active = accountStatus
    }

    const { error: updateError } = await supabase
      .from('ad_accounts')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      throw new Error('토큰 업데이트에 실패했습니다.')
    }

    return NextResponse.json({
      message: '토큰이 갱신되었습니다.',
      expiresAt,
      isActive: accountStatus,
    })
  } catch (error: any) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { error: error.message || '토큰 갱신에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// Meta 광고 계정 상태 조회
async function getMetaAccountStatus(accessToken: string, accountId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}?access_token=${accessToken}&fields=account_status`
    )

    if (!response.ok) {
      console.error('Failed to fetch Meta account status')
      return false
    }

    const data = await response.json()
    // account_status: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, etc.
    console.log(`Meta account ${accountId} status:`, data.account_status)
    return data.account_status === 1
  } catch (error) {
    console.error('Error fetching Meta account status:', error)
    return false
  }
}

async function refreshMetaToken(
  accessToken: string | null,
  credentials: { app_id: string; app_secret: string }
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!accessToken) {
    throw new Error('액세스 토큰이 없습니다.')
  }

  // NOTE: Meta long-lived tokens can be extended
  const response = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${credentials.app_id}&client_secret=${credentials.app_secret}&fb_exchange_token=${accessToken}`
  )

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Meta token refresh error:', errorData)
    throw new Error(errorData.error?.message || 'Meta 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // 60 days default
  }
}

async function refreshKakaoToken(
  refreshToken: string | null,
  credentials: { rest_api_key: string }
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.')
  }

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.rest_api_key,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Kakao token refresh error:', errorData)
    throw new Error(errorData.error_description || 'Kakao 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 21600, // 6 hours default
  }
}

async function refreshGoogleToken(
  refreshToken: string | null,
  credentials: { client_id: string; client_secret: string }
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Google token refresh error:', errorData)
    throw new Error(errorData.error_description || 'Google 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600, // 1 hour default
  }
}
