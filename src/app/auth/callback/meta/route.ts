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

    // Check permission (company_owner, company_admin, hospital_owner, hospital_admin for backward compat)
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager'].includes(userProfile.role)) {
      return NextResponse.redirect(
        new URL('/dashboard/ad-accounts?error=권한이 없습니다.', request.url)
      )
    }

    // Get Meta credentials from database
    const { data: credentialData, error: credError } = await supabase
      .from('api_credentials')
      .select('credentials')
      .eq('company_id', userProfile.company_id)
      .eq('platform', 'meta')
      .single()

    if (credError || !credentialData) {
      console.error('Meta credentials not found:', credError)
      return NextResponse.redirect(
        new URL('/dashboard/ad-accounts?error=Meta API 인증 정보가 설정되지 않았습니다.', request.url)
      )
    }

    const credentials = credentialData.credentials as { app_id: string; app_secret: string }

    // Build redirect URI (must match the one used in connect)
    const baseUrl = new URL(request.url).origin
    const redirectUri = `${baseUrl}/auth/callback/meta`

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: credentials.app_id,
      client_secret: credentials.app_secret,
      redirect_uri: redirectUri,
      code: code,
    })

    console.log('Exchanging code for token...')
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`,
      { method: 'GET' }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange failed:', errorData)
      throw new Error(errorData.error?.message || '토큰 교환에 실패했습니다.')
    }

    const tokenData = await tokenResponse.json()
    const { access_token, expires_in } = tokenData

    console.log('Token received, fetching ad accounts...')

    // Get ad accounts from Meta
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}&fields=id,name,account_status,currency,timezone_name`
    )

    if (!adAccountsResponse.ok) {
      const errorData = await adAccountsResponse.json()
      console.error('Ad accounts fetch failed:', errorData)
      throw new Error(errorData.error?.message || '광고 계정 정보를 가져오지 못했습니다.')
    }

    const adAccountsData = await adAccountsResponse.json()
    const adAccounts = adAccountsData.data || []

    console.log(`Found ${adAccounts.length} ad accounts`)

    if (adAccounts.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/ad-accounts?error=연결된 광고 계정이 없습니다. Meta Business에서 광고 계정을 먼저 생성해주세요.', request.url)
      )
    }

    // Store ad accounts in database
    for (const account of adAccounts) {
      const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString()

      // account.id는 "act_123456789" 형식
      // Check if account already exists
      const { data: existingAccount } = await supabase
        .from('ad_accounts')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .eq('platform', 'meta')
        .eq('account_id', account.id)
        .single()

      const accountData = {
        company_id: userProfile.company_id,
        platform: 'meta' as const,
        account_id: account.id,
        account_name: account.name || account.id,
        is_active: account.account_status === 1,
        access_token: access_token,
        token_expires_at: expiresAt,
        metadata: {
          currency: account.currency,
          timezone: account.timezone_name,
        },
      }

      let upsertError
      if (existingAccount) {
        // Update existing
        const { error } = await supabase
          .from('ad_accounts')
          .update(accountData)
          .eq('id', existingAccount.id)
        upsertError = error
      } else {
        // Insert new
        const { error } = await supabase
          .from('ad_accounts')
          .insert(accountData)
        upsertError = error
      }

      if (upsertError) {
        console.error('Failed to save ad account:', upsertError)
      }
    }

    console.log('Ad accounts saved successfully')

    return NextResponse.redirect(
      new URL(`/dashboard/ad-accounts?success=${encodeURIComponent(`${adAccounts.length}개의 광고 계정이 연동되었습니다.`)}`, request.url)
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
