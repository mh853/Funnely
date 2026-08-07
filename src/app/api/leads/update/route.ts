import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { decryptPhone } from '@/lib/encryption/phone'
import { getLeadStatusCategoryMap } from '@/lib/leadStatusCategory'

// 리드 배정 알림 - 콜/상담 담당자를 지정해도 담당자에게 알릴 수단이 전혀 없어
// 대시보드를 수동으로 확인해야만 새 배정을 알 수 있었다(66차 QA 확인). notifications
// 테이블이 특정 사용자가 아니라 회사 전체 단위로만 구성돼 있어(다른 알림들과 동일한
// 제약), 회사 전체에 노출하되 누구에게 배정됐는지 메시지에 명시한다. fire-and-forget이라
// 실패해도 메인 배정 처리에는 영향 없다.
async function notifyAssignment(
  supabase: any,
  companyId: string,
  leadName: string,
  assignedUserId: string,
  roleLabel: string
) {
  try {
    const { data: assignedUser } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', assignedUserId)
      .maybeSingle()

    await supabase.from('notifications').insert({
      company_id: companyId,
      title: `${roleLabel} 담당자 배정`,
      message: `${leadName || '리드'}님이 ${assignedUser?.full_name || '담당자'}님에게 ${roleLabel} 담당으로 배정되었습니다.`,
      type: 'lead_assigned',
      metadata: { assigned_user_id: assignedUserId, role: roleLabel },
    })
  } catch (error) {
    console.error('Failed to create assignment notification:', error)
  }
}

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
    const { id, status, priority, call_assigned_to, counselor_assigned_to, contract_completed_at, notes, payment_amount, preferred_date, preferred_time, cancel_reason, expected_updated_at } = body

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
      .select('id, company_id, status, contract_completed_at, call_assigned_to, counselor_assigned_to, notes, preferred_date, preferred_time, updated_at')
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

      // 회사가 커스텀 코드를 만들어도(예: 'signed') 통계 범주(category)가
      // 'contract_completed'인 상태로 바뀌면 타임스탬프가 정확히 반영되도록
      // 리터럴 코드가 아니라 category 기준으로 판단한다.
      const categoryMap = await getLeadStatusCategoryMap(supabase, userProfile.company_id)
      const newIsContractCompleted = categoryMap[status] === 'contract_completed'
      const previousWasContractCompleted = categoryMap[lead.status] === 'contract_completed'

      // contract_completed 범주로 변경 시 타임스탬프 설정
      // 클라이언트에서 날짜/시간을 지정한 경우 해당 값 사용, 아니면 현재 시간 사용
      if (newIsContractCompleted) {
        // 기존에 contract_completed_at이 있으면 previous_contract_completed_at에 저장
        if (lead.contract_completed_at) {
          updateData.previous_contract_completed_at = lead.contract_completed_at
        }
        updateData.contract_completed_at = contract_completed_at || new Date().toISOString()
      }

      // contract_completed 범주에서 다른 범주로 변경 시 날짜 이동
      // contract_completed_at → previous_contract_completed_at으로 이동, contract_completed_at은 null로
      if (previousWasContractCompleted && !newIsContractCompleted) {
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

    // call_assigned_to/counselor_assigned_to는 클라이언트가 보낸 user id를 검증 없이
    // 그대로 저장했다 - FK는 users(id) 전체를 참조할 뿐 company_id/is_active를 보지
    // 않아, 다른 회사 소속이거나 이미 비활성화된 사용자에게도 배정될 수 있었다(팀
    // 관리 화면의 담당자 드롭다운도 is_active 필터가 없어 비활성 팀원이 계속
    // 노출됐음, 68차 QA 확인). 배정 전에 대상이 같은 회사의 활성 사용자인지 확인한다.
    if (call_assigned_to || counselor_assigned_to) {
      const assigneeIds = [call_assigned_to, counselor_assigned_to].filter(Boolean)
      const { data: assignees } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .in('id', assigneeIds)

      const validIds = new Set((assignees || []).map((a: any) => a.id))
      if (call_assigned_to && !validIds.has(call_assigned_to)) {
        return NextResponse.json(
          { error: { message: '담당자로 지정할 수 없는 사용자입니다.' } },
          { status: 400 }
        )
      }
      if (counselor_assigned_to && !validIds.has(counselor_assigned_to)) {
        return NextResponse.json(
          { error: { message: '담당자로 지정할 수 없는 사용자입니다.' } },
          { status: 400 }
        )
      }
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
    // 낙관적 동시성 제어: 클라이언트가 화면을 불러온 시점의 updated_at을 함께 보내면
    // WHERE 절에 그대로 걸어, 그 사이 다른 사용자가 이미 수정했으면(값이 달라짐)
    // 이 UPDATE가 0행에 매치되게 한다. 두 사람이 거의 동시에 같은 리드를 수정하면
    // 나중에 저장한 쪽이 조용히 앞사람의 변경을 덮어쓰던 문제를 막는다(68차 QA 확인).
    // 하위호환: expected_updated_at을 안 보내는 예전 클라이언트는 기존처럼 무조건 덮어씀.
    let updateQuery = supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
    if (expected_updated_at) {
      updateQuery = updateQuery.eq('updated_at', expected_updated_at)
    }
    const { data: updatedLead, error: updateError } = await updateQuery.select().maybeSingle()

    if (updateError) throw updateError

    if (!updatedLead) {
      if (expected_updated_at) {
        const { data: stillExists } = await supabase
          .from('leads')
          .select('id')
          .eq('id', id)
          .eq('company_id', userProfile.company_id)
          .maybeSingle()
        if (stillExists) {
          return NextResponse.json(
            { success: false, error: { code: 'CONFLICT', message: '다른 사용자가 이미 이 리드를 수정했습니다. 새로고침 후 다시 시도해주세요.' } },
            { status: 409 }
          )
        }
      }
      return NextResponse.json(
        { success: false, error: { message: '리드를 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      )
    }

    // 상태가 변경된 경우 로그 기록
    if (status !== undefined && status !== previousStatus) {
      try {
        const logData: any = {
          lead_id: id,
          company_id: userProfile.company_id,
          previous_status: previousStatus,
          new_status: status,
          previous_value: previousStatus,
          new_value: status,
          changed_by: user.id,
          field_type: 'status',
        }

        // 예약 취소인 경우 cancel_reason을 notes에 추가
        if (cancel_reason) {
          logData.notes = cancel_reason
        }

        await supabase.from('lead_status_logs').insert(logData)
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
      // 배정 알림 - 지금까지 담당자에게 새 배정을 알리는 수단이 전혀 없어 대시보드를
      // 수동으로 확인해야만 알 수 있었다(66차 QA 확인). notifications 테이블이
      // 회사 단위로만 구성돼 있어(특정 사용자 지정 불가) 다른 알림들과 동일하게
      // 회사 전체에 표시하되, 누구에게 배정됐는지 메시지에 명시한다.
      if (newCallAssignedTo) {
        notifyAssignment(supabase, userProfile.company_id, updatedLead.name, newCallAssignedTo, '콜')
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
      if (newCounselorAssignedTo) {
        notifyAssignment(supabase, userProfile.company_id, updatedLead.name, newCounselorAssignedTo, '상담')
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

    const leadResult = updatedLead as any

    return NextResponse.json({
      success: true,
      data: { ...leadResult, phone: leadResult.phone ? decryptPhone(leadResult.phone) : leadResult.phone },
    })
  } catch (error: any) {
    console.error('Lead update error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Update failed' } },
      { status: 500 }
    )
  }
}
