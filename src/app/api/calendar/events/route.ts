import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/calendar/events - Create calendar event
export async function POST(request: NextRequest) {
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
    if (!title || !event_type || !start_time || !end_time) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
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

    // Validate end_time is after start_time
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: { message: 'End time must be after start time' } },
        { status: 400 }
      )
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        company_id: userProfile.company_id,
        title,
        description: description || null,
        event_type,
        start_time,
        end_time,
        assigned_to: assigned_to || user.id,
        lead_id: lead_id || null,
        location: location || null,
        is_all_day: is_all_day || false,
        created_by: user.id,
      })
      .select()
      .single()

    if (eventError) throw eventError

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (error: any) {
    console.error('Create calendar event error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create event' } },
      { status: 500 }
    )
  }
}
