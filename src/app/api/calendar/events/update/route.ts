import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/calendar/events/update - Update calendar event
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
    const {
      id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      assigned_to,
      lead_id,
      location,
      is_all_day,
    } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: { message: 'Missing event ID' } }, { status: 400 })
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

    // Verify event belongs to user's hospital (calendar_events의 실제 회사 참조
    // 컬럼명은 company_id가 아니라 hospital_id이다)
    const { data: event } = await supabase
      .from('calendar_events')
      .select('id, hospital_id')
      .eq('id', id)
      .eq('hospital_id', userProfile.company_id)
      .single()

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Validate end_time is after start_time
    if (end_time && start_time && new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: { message: 'End time must be after start time' } },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (event_type !== undefined) updateData.event_type = event_type
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (lead_id !== undefined) updateData.lead_id = lead_id || null
    if (location !== undefined) updateData.location = location || null
    if (is_all_day !== undefined) updateData.all_day = is_all_day

    // Update event (hospital_id 필터로 TOCTOU 방지)
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('hospital_id', userProfile.company_id)
      .select()
      .maybeSingle()

    if (updateError) throw updateError

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, error: { message: '일정을 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    })
  } catch (error: any) {
    console.error('Update calendar event error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update event' } },
      { status: 500 }
    )
  }
}
