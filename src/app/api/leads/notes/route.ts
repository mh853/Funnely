import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leads/notes - Add note to lead
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
    const { lead_id, content, status_changed_from, status_changed_to } = body

    // Validate required fields
    if (!lead_id || !content) {
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

    // Verify lead belongs to user's hospital
    const { data: lead } = await supabase
      .from('leads')
      .select('id, company_id')
      .eq('id', lead_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: { message: 'Lead not found' } }, { status: 404 })
    }

    // Create note
    const { data: note, error: noteError } = await supabase
      .from('lead_notes')
      .insert({
        lead_id,
        user_id: user.id,
        content: content.trim(),
        status_changed_from: status_changed_from || null,
        status_changed_to: status_changed_to || null,
      })
      .select(
        `
        *,
        users (
          id,
          name,
          email
        )
      `
      )
      .single()

    if (noteError) throw noteError

    // Update lead's last_contact_at timestamp
    await supabase
      .from('leads')
      .update({
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)

    return NextResponse.json({
      success: true,
      data: note,
    })
  } catch (error: any) {
    console.error('Add note error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to add note' } },
      { status: 500 }
    )
  }
}
