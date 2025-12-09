import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permission
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      ad_account_id,
      campaign_name,
      objective,
      status,
      budget,
      budget_type,
      start_date,
      end_date,
    } = body

    // Validate required fields
    if (!ad_account_id || !campaign_name || !objective || !status) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    // Verify ad account belongs to same company
    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('company_id')
      .eq('id', ad_account_id)
      .single()

    if (!adAccount || adAccount.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: '유효하지 않은 광고 계정입니다.' }, { status: 400 })
    }

    // Generate campaign_id (temporary, will be replaced by actual platform ID when synced)
    const campaign_id = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        company_id: userProfile.company_id,
        ad_account_id,
        campaign_id,
        campaign_name,
        objective,
        status,
        budget,
        budget_type,
        start_date,
        end_date,
      })
      .select()
      .single()

    if (campaignError) {
      console.error('Campaign creation error:', campaignError)
      return NextResponse.json(
        { error: '캠페인 생성에 실패했습니다: ' + campaignError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '캠페인이 생성되었습니다.',
      campaign,
    })
  } catch (error: any) {
    console.error('Create campaign error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
