import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiPlatform, MetaCredentials, KakaoCredentials, GoogleCredentials } from '@/types/database.types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: platformParam } = await params
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
    if (!['hospital_owner', 'hospital_admin', 'marketing_manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const platform = platformParam as ApiPlatform

    // Validate platform
    if (!['meta', 'kakao', 'google'].includes(platform)) {
      return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 })
    }

    // Load credentials from database
    const { data: credentialData, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials, is_active')
      .eq('company_id', userProfile.company_id)
      .eq('platform', platform)
      .single()

    if (credError || !credentialData) {
      return NextResponse.json(
        {
          error: `${platform.toUpperCase()} API 인증 정보가 설정되지 않았습니다. 설정 페이지에서 먼저 API 인증 정보를 입력해주세요.`,
          needsSetup: true,
          setupUrl: '/dashboard/settings/api-credentials'
        },
        { status: 400 }
      )
    }

    if (!credentialData.is_active) {
      return NextResponse.json(
        { error: 'API 인증 정보가 비활성화되었습니다.' },
        { status: 400 }
      )
    }

    // Generate OAuth URL based on platform
    let authUrl: string

    switch (platform) {
      case 'meta':
        authUrl = generateMetaAuthUrl(request, credentialData.credentials as any)
        break
      case 'kakao':
        authUrl = generateKakaoAuthUrl(request, credentialData.credentials as any)
        break
      case 'google':
        authUrl = generateGoogleAuthUrl(request, credentialData.credentials as any)
        break
      default:
        return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 })
    }

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Connect ad account error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

function generateMetaAuthUrl(request: NextRequest, credentials: MetaCredentials): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/meta`

  const scope = 'ads_management,ads_read'

  const params = new URLSearchParams({
    client_id: credentials.app_id,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: 'code',
  })

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

function generateKakaoAuthUrl(request: NextRequest, credentials: KakaoCredentials): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/kakao`

  const params = new URLSearchParams({
    client_id: credentials.rest_api_key,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'moment',
  })

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

function generateGoogleAuthUrl(request: NextRequest, credentials: GoogleCredentials): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/google`

  const scope = 'https://www.googleapis.com/auth/adwords'

  const params = new URLSearchParams({
    client_id: credentials.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
