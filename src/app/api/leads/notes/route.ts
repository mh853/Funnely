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
          full_name
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

// GET /api/leads/notes - Get notes for a lead
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lead_id = searchParams.get('lead_id')

    if (!lead_id) {
      return NextResponse.json(
        { error: { message: 'Missing lead_id' } },
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

    // Get notes
    const { data: notes, error: notesError } = await supabase
      .from('lead_notes')
      .select(
        `
        *,
        users (
          id,
          full_name
        )
      `
      )
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError

    return NextResponse.json({
      success: true,
      data: notes || [],
    })
  } catch (error: any) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to get notes' } },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/notes - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const note_id = searchParams.get('id')

    if (!note_id) {
      return NextResponse.json(
        { error: { message: 'Missing note_id' } },
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

    // Verify note belongs to user's hospital lead
    const { data: note } = await supabase
      .from('lead_notes')
      .select(
        `
        id,
        leads!inner (
          company_id
        )
      `
      )
      .eq('id', note_id)
      .single()

    if (!note || note.leads.company_id !== userProfile.company_id) {
      return NextResponse.json({ error: { message: 'Note not found' } }, { status: 404 })
    }

    // Delete note
    const { error: deleteError } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', note_id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete note' } },
      { status: 500 }
    )
  }
}
