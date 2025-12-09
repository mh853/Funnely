import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
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
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('company_id')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify same company
    if (campaign.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      campaign_name,
      objective,
      status,
      budget,
      budget_type,
      start_date,
      end_date,
    } = body

    // Update campaign
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        campaign_name,
        objective,
        status,
        budget,
        budget_type,
        start_date,
        end_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Campaign update error:', updateError)
      return NextResponse.json(
        { error: '캠페인 수정에 실패했습니다: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '캠페인이 수정되었습니다.',
    })
  } catch (error: any) {
    console.error('Update campaign error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
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
    if (!['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff'].includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('company_id')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Verify same company
    if (campaign.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Delete campaign
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Campaign deletion error:', deleteError)
      return NextResponse.json(
        { error: '캠페인 삭제에 실패했습니다: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '캠페인이 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Delete campaign error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
