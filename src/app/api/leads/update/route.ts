import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/leads/update - Update lead status, priority, and assignment
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, priority, assigned_to, contract_completed_at, notes } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: { message: 'Missing lead ID' } }, { status: 400 })
    }

    // Get user's hospital
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    // Verify lead belongs to user's hospital
    const { data: lead } = await supabase
      .from('leads')
      .select('id, company_id, status, contract_completed_at')
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: { message: 'Lead not found' } }, { status: 404 })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      updateData.status = status

      // Update timestamps based on status changes
      if (status === 'contacting' && lead.status === 'new') {
        updateData.first_contact_at = new Date().toISOString()
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      // contract_completed 상태로 변경 시 타임스탬프 설정
      // 클라이언트에서 날짜/시간을 지정한 경우 해당 값 사용, 아니면 현재 시간 사용
      if (status === 'contract_completed') {
        // 기존에 contract_completed_at이 있으면 previous_contract_completed_at에 저장
        if (lead.contract_completed_at) {
          updateData.previous_contract_completed_at = lead.contract_completed_at
        }
        updateData.contract_completed_at = contract_completed_at || new Date().toISOString()
      }

      // contract_completed에서 다른 상태로 변경 시 날짜 이동
      // contract_completed_at → previous_contract_completed_at으로 이동, contract_completed_at은 null로
      if (lead.status === 'contract_completed' && status !== 'contract_completed') {
        if (lead.contract_completed_at) {
          updateData.previous_contract_completed_at = lead.contract_completed_at
        }
        updateData.contract_completed_at = null
      }

      // Always update last contact time when status changes
      if (status !== lead.status) {
        updateData.last_contact_at = new Date().toISOString()
      }
    }

    if (priority !== undefined) {
      updateData.priority = priority
    }

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to

      // If assigning for first time and status is 'new', change to 'assigned'
      if (assigned_to && lead.status === 'new') {
        updateData.status = 'assigned'
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      data: updatedLead,
    })
  } catch (error: any) {
    console.error('Lead update error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Update failed' } },
      { status: 500 }
    )
  }
}
