import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const leadId = params.id
    const supabase = await createClient()

    // Get lead detail - specify which foreign key relationship to use
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(
        `
        *,
        companies!leads_company_id_fkey(id, name, slug),
        landing_pages(id, title, slug),
        users(id, full_name, email)
      `
      )
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get lead status logs
    const { data: statusLogs } = await supabase
      .from('lead_status_logs')
      .select(
        `
        id,
        from_status,
        to_status,
        note,
        created_at,
        users(id, full_name)
      `
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    // Get lead notes
    const { data: notes } = await supabase
      .from('lead_notes')
      .select(
        `
        id,
        content,
        created_at,
        users(id, full_name)
      `
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    // Format response
    return NextResponse.json({
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        priority: lead.priority,
        consultation_items: lead.consultation_items,
        preferred_date: lead.preferred_date,
        preferred_time: lead.preferred_time,
        message: lead.message,
        tags: lead.tags,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        first_contact_at: lead.first_contact_at,
        last_contact_at: lead.last_contact_at,
        completed_at: lead.completed_at,
        company: {
          id: (lead.companies as any).id,
          name: (lead.companies as any).name,
          slug: (lead.companies as any).slug,
        },
        landing_page: lead.landing_pages
          ? {
              id: lead.landing_pages.id,
              title: lead.landing_pages.title,
              slug: lead.landing_pages.slug,
            }
          : null,
        assigned_to: lead.users
          ? {
              id: lead.users.id,
              full_name: lead.users.full_name,
              email: lead.users.email,
            }
          : null,
        utm: {
          source: lead.utm_source,
          medium: lead.utm_medium,
          campaign: lead.utm_campaign,
          content: lead.utm_content,
          term: lead.utm_term,
        },
        referrer: lead.referrer,
        ip_address: lead.ip_address,
        user_agent: lead.user_agent,
      },
      statusLogs:
        statusLogs?.map((log: any) => ({
          id: log.id,
          from_status: log.from_status,
          to_status: log.to_status,
          note: log.note,
          created_at: log.created_at,
          changed_by: {
            id: log.users.id,
            full_name: log.users.full_name,
          },
        })) || [],
      notes:
        notes?.map((note: any) => ({
          id: note.id,
          content: note.content,
          created_at: note.created_at,
          author: {
            id: note.users.id,
            full_name: note.users.full_name,
          },
        })) || [],
    })
  } catch (error) {
    console.error('Lead detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const leadId = params.id
    const body = await request.json()
    const supabase = await createClient()

    // Get current lead status for logging
    const { data: currentLead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single()

    // Update lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: body.status,
        priority: body.priority,
        assigned_to: body.assigned_to,
        tags: body.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Log status change if status was updated
    if (currentLead && body.status && currentLead.status !== body.status) {
      await supabase.from('lead_status_logs').insert({
        lead_id: leadId,
        from_status: currentLead.status,
        to_status: body.status,
        note: body.status_note || null,
      })
    }

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error('Lead update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
