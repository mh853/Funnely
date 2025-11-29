import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Meta OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/dashboard/ad-accounts?error=${encodeURIComponent(
          errorDescription || '인증에 실패했습니다.'
        )}`,
        request.url
      )
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/ad-accounts?error=인증 코드를 받지 못했습니다.', request.url)
    )
  }

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.redirect(
        new URL('/dashboard/ad-accounts?error=사용자 정보를 찾을 수 없습니다.', request.url)
      )
    }

    // Check permission
    if (!['hospital_owner', 'hospital_admin', 'marketing_manager'].includes(userProfile.role)) {
      return NextResponse.redirect(
        new URL('/dashboard/ad-accounts?error=권한이 없습니다.', request.url)
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // NOTE: This would use actual environment variables in production
      // For now, this is a placeholder that will need Meta app credentials
    })

    if (!tokenResponse.ok) {
      throw new Error('토큰 교환에 실패했습니다.')
    }

    const tokenData = await tokenResponse.json()
    const { access_token, expires_in } = tokenData

    // Get ad accounts from Meta
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}&fields=id,name,account_status`
    )

    if (!adAccountsResponse.ok) {
      throw new Error('광고 계정 정보를 가져오지 못했습니다.')
    }

    const adAccountsData = await adAccountsResponse.json()
    const adAccounts = adAccountsData.data || []

    // Store ad accounts in database
    for (const account of adAccounts) {
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

      await supabase.from('ad_accounts').upsert({
        company_id: userProfile.company_id,
        platform: 'meta',
        account_id: account.id,
        account_name: account.name,
        status: account.account_status === 1 ? 'active' : 'inactive',
        access_token: access_token,
        token_expires_at: expiresAt,
      })
    }

    return NextResponse.redirect(
      new URL('/dashboard/ad-accounts?success=계정 연동이 완료되었습니다.', request.url)
    )
  } catch (error: any) {
    console.error('Meta OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/dashboard/ad-accounts?error=${encodeURIComponent(
          error.message || '계정 연동에 실패했습니다.'
        )}`,
        request.url
      )
    )
  }
}
