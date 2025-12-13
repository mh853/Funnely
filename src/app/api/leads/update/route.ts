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
    const { id, status, priority, call_assigned_to, counselor_assigned_to, contract_completed_at, notes, payment_amount, preferred_date, preferred_time } = body

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
      .select('id, company_id, status, contract_completed_at, call_assigned_to, counselor_assigned_to, notes, preferred_date, preferred_time')
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: { message: 'Lead not found' } }, { status: 404 })
    }

    // 변경 이력 기록용 변수
    const previousStatus = lead.status
    const previousCallAssignedTo = lead.call_assigned_to
    const previousCounselorAssignedTo = lead.counselor_assigned_to
    const previousNotes = lead.notes
    const previousPreferredDate = lead.preferred_date
    const previousPreferredTime = lead.preferred_time

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

    // assigned_to 필드는 더 이상 사용하지 않음 (call_assigned_to, counselor_assigned_to로 대체)

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (call_assigned_to !== undefined) {
      updateData.call_assigned_to = call_assigned_to || null
    }

    if (counselor_assigned_to !== undefined) {
      updateData.counselor_assigned_to = counselor_assigned_to || null
    }

    if (payment_amount !== undefined) {
      updateData.payment_amount = payment_amount
    }

    if (preferred_date !== undefined) {
      updateData.preferred_date = preferred_date
    }

    if (preferred_time !== undefined) {
      updateData.preferred_time = preferred_time
    }

    // Update lead (must include company_id for RLS policies)
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select()
      .single()

    if (updateError) throw updateError

    // 상태가 변경된 경우 로그 기록
    if (status !== undefined && status !== previousStatus) {
      try {
        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          previous_status: previousStatus,
          new_status: status,
          changed_by: user.id,
          field_type: 'status',
        })
      } catch (logError) {
        // 로그 기록 실패해도 메인 업데이트는 성공으로 처리
        console.error('Failed to log status change:', logError)
      }
    }

    // 콜 담당자 변경 로그 기록
    const newCallAssignedTo = call_assigned_to !== undefined ? (call_assigned_to || null) : undefined
    if (newCallAssignedTo !== undefined && newCallAssignedTo !== previousCallAssignedTo) {
      try {
        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          changed_by: user.id,
          field_type: 'call_assigned_to',
          previous_value: previousCallAssignedTo || null,
          new_value: newCallAssignedTo,
          new_status: 'call_assigned_to', // NOT NULL 제약 충족
        })
      } catch (logError) {
        console.error('Failed to log call_assigned_to change:', logError)
      }
    }

    // 상담 담당자 변경 로그 기록
    const newCounselorAssignedTo = counselor_assigned_to !== undefined ? (counselor_assigned_to || null) : undefined
    if (newCounselorAssignedTo !== undefined && newCounselorAssignedTo !== previousCounselorAssignedTo) {
      try {
        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          changed_by: user.id,
          field_type: 'counselor_assigned_to',
          previous_value: previousCounselorAssignedTo || null,
          new_value: newCounselorAssignedTo,
          new_status: 'counselor_assigned_to', // NOT NULL 제약 충족
        })
      } catch (logError) {
        console.error('Failed to log counselor_assigned_to change:', logError)
      }
    }

    // 비고 변경 로그 기록
    if (notes !== undefined && notes !== previousNotes) {
      try {
        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          changed_by: user.id,
          field_type: 'notes',
          previous_value: previousNotes || null,
          new_value: notes || null,
          new_status: 'notes', // NOT NULL 제약 충족
        })
      } catch (logError) {
        console.error('Failed to log notes change:', logError)
      }
    }

    // 예약일(계약완료일)이 변경된 경우 로그 기록
    const previousContractDate = lead.contract_completed_at
    const newContractDate = updateData.contract_completed_at

    // 예약일이 실제로 변경된 경우에만 로그 기록 (새로 설정되거나 기존 날짜가 변경된 경우)
    if (newContractDate !== undefined && newContractDate !== previousContractDate) {
      // reservation_date_logs 테이블에 기록 (기존 유지)
      try {
        await supabase.from('reservation_date_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          previous_date: previousContractDate || null,
          new_date: newContractDate,
          changed_by: user.id,
        })
      } catch (logError) {
        console.error('Failed to log reservation date change:', logError)
      }

      // lead_status_logs에도 기록 (변경이력 모달에서 표시용)
      try {
        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          changed_by: user.id,
          field_type: 'contract_completed_at',
          previous_value: previousContractDate || null,
          new_value: newContractDate || null,
          new_status: 'contract_completed_at', // NOT NULL 제약 충족
        })
      } catch (logError) {
        console.error('Failed to log contract_completed_at change:', logError)
      }
    }

    // preferred_date 또는 preferred_time 변경 로그 기록 (일정 변경)
    const newPreferredDate = updateData.preferred_date
    const newPreferredTime = updateData.preferred_time
    const dateChanged = newPreferredDate !== undefined && newPreferredDate !== previousPreferredDate
    const timeChanged = newPreferredTime !== undefined && newPreferredTime !== previousPreferredTime

    if (dateChanged || timeChanged) {
      try {
        const previousSchedule = previousPreferredDate
          ? `${previousPreferredDate} ${previousPreferredTime || '00:00'}`
          : null
        const newSchedule = newPreferredDate
          ? `${newPreferredDate} ${newPreferredTime || '00:00'}`
          : `${previousPreferredDate || ''} ${newPreferredTime || '00:00'}`

        await supabase.from('lead_status_logs').insert({
          lead_id: id,
          company_id: userProfile.company_id,
          changed_by: user.id,
          field_type: 'schedule_change',
          previous_value: previousSchedule,
          new_value: newSchedule.trim(),
          new_status: 'schedule_change', // NOT NULL 제약 충족
        })
      } catch (logError) {
        console.error('Failed to log schedule change:', logError)
      }
    }

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
