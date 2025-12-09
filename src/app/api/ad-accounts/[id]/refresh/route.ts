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

    // Refresh token based on platform
    let newAccessToken: string
    let expiresIn: number

    switch (adAccount.platform) {
      case 'meta':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshMetaToken(
          adAccount.access_token
        ))
        break
      case 'kakao':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshKakaoToken(
          adAccount.refresh_token
        ))
        break
      case 'google':
        ;({ accessToken: newAccessToken, expiresIn } = await refreshGoogleToken(
          adAccount.refresh_token
        ))
        break
      default:
        return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 })
    }

    // Update token in database
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('ad_accounts')
      .update({
        access_token: newAccessToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw new Error('토큰 업데이트에 실패했습니다.')
    }

    return NextResponse.json({
      message: '토큰이 갱신되었습니다.',
      expiresAt,
    })
  } catch (error: any) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { error: error.message || '토큰 갱신에 실패했습니다.' },
      { status: 500 }
    )
  }
}

async function refreshMetaToken(
  accessToken: string | null
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!accessToken) {
    throw new Error('액세스 토큰이 없습니다.')
  }

  // NOTE: Meta long-lived tokens can be extended
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  const response = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
  )

  if (!response.ok) {
    throw new Error('Meta 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // 60 days default
  }
}

async function refreshKakaoToken(
  refreshToken: string | null
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.')
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: restApiKey || '',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Kakao 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 21600, // 6 hours default
  }
}

async function refreshGoogleToken(
  refreshToken: string | null
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!refreshToken) {
    throw new Error('리프레시 토큰이 없습니다.')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId || '',
      client_secret: clientSecret || '',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Google 토큰 갱신에 실패했습니다.')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600, // 1 hour default
  }
}
