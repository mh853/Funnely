import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/calendar/events/delete - Delete calendar event
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: { message: 'Missing event ID' } }, { status: 400 })
    }

    // Get user's hospital
    const { data: userProfile } = await supabase
      .from('users')
      .select('hospital_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    // Verify event belongs to user's hospital
    const { data: event } = await supabase
      .from('calendar_events')
      .select('id, hospital_id')
      .eq('id', id)
      .eq('hospital_id', userProfile.hospital_id)
      .single()

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Delete event
    const { error: deleteError } = await supabase.from('calendar_events').delete().eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete calendar event error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete event' } },
      { status: 500 }
    )
  }
}
