import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // Check permission (only admins and managers can trigger sync)
    const allowedRoles = ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager']
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { adAccountId, campaignId } = body

    // Verify ad account ownership
    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', adAccountId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!adAccount) {
      return NextResponse.json({ error: '광고 계정을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (adAccount.status !== 'active') {
      return NextResponse.json(
        { error: '광고 계정이 활성화되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    // Check if access token exists
    if (!adAccount.access_token) {
      return NextResponse.json(
        { error: 'OAuth 인증이 필요합니다. 광고 계정 설정에서 인증을 완료해주세요.' },
        { status: 400 }
      )
    }

    // Perform sync based on platform
    let syncResult
    switch (adAccount.platform) {
      case 'meta':
        syncResult = await syncMetaCampaigns(adAccount, campaignId)
        break
      case 'kakao':
        syncResult = await syncKakaoCampaigns(adAccount, campaignId)
        break
      case 'google':
        syncResult = await syncGoogleCampaigns(adAccount, campaignId)
        break
      default:
        return NextResponse.json(
          { error: '지원하지 않는 플랫폼입니다.' },
          { status: 400 }
        )
    }

    // Update last sync time
    await supabase
      .from('ad_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', adAccountId)

    return NextResponse.json({
      success: true,
      ...syncResult,
      message: '동기화가 완료되었습니다.',
    })
  } catch (error: any) {
    console.error('Campaign sync error:', error)
    return NextResponse.json(
      { error: error.message || '동기화에 실패했습니다.' },
      { status: 500 }
    )
  }
}

async function syncMetaCampaigns(adAccount: any, campaignId?: string) {
  // TODO: Implement Meta Ads API integration
  // This is a placeholder that will be implemented when API integration is ready

  return {
    platform: 'meta',
    synced_campaigns: 0,
    synced_metrics: 0,
    message: 'Meta API 연동 준비 중입니다.',
  }
}

async function syncKakaoCampaigns(adAccount: any, campaignId?: string) {
  // TODO: Implement Kakao Moment API integration
  // This is a placeholder that will be implemented when API integration is ready

  return {
    platform: 'kakao',
    synced_campaigns: 0,
    synced_metrics: 0,
    message: 'Kakao API 연동 준비 중입니다.',
  }
}

async function syncGoogleCampaigns(adAccount: any, campaignId?: string) {
  // TODO: Implement Google Ads API integration
  // This is a placeholder that will be implemented when API integration is ready

  return {
    platform: 'google',
    synced_campaigns: 0,
    synced_metrics: 0,
    message: 'Google API 연동 준비 중입니다.',
  }
}
