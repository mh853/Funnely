import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
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
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permission
    if (!['hospital_owner', 'hospital_admin', 'marketing_manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const platform = params.platform

    // Generate OAuth URL based on platform
    let authUrl: string

    switch (platform) {
      case 'meta':
        authUrl = generateMetaAuthUrl(request)
        break
      case 'kakao':
        authUrl = generateKakaoAuthUrl(request)
        break
      case 'google':
        authUrl = generateGoogleAuthUrl(request)
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

function generateMetaAuthUrl(request: NextRequest): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/meta`

  // NOTE: These would come from environment variables in production
  const clientId = process.env.META_APP_ID || 'YOUR_META_APP_ID'
  const scope = 'ads_management,ads_read'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: 'code',
  })

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

function generateKakaoAuthUrl(request: NextRequest): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/kakao`

  // NOTE: These would come from environment variables in production
  const clientId = process.env.KAKAO_REST_API_KEY || 'YOUR_KAKAO_REST_API_KEY'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'moment',
  })

  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
}

function generateGoogleAuthUrl(request: NextRequest): string {
  const baseUrl = new URL(request.url).origin
  const redirectUri = `${baseUrl}/auth/callback/google`

  // NOTE: These would come from environment variables in production
  const clientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'
  const scope = 'https://www.googleapis.com/auth/adwords'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
