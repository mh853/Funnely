import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const companyId = searchParams.get('company_id') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const supabase = await createClient()
    const offset = (page - 1) * limit

    // Base query
    let query = supabase
      .from('leads')
      .select(
        `
        id,
        name,
        phone,
        email,
        status,
        priority,
        created_at,
        updated_at,
        company_id,
        landing_page_id,
        utm_source,
        utm_medium,
        utm_campaign,
        companies!inner(id, name),
        landing_pages(id, title)
      `,
        { count: 'exact' }
      )

    // Search (name or email)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Filter by company
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Sorting
    const validSortColumns = ['created_at', 'updated_at', 'name', 'status']
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : 'created_at'
    query = query.order(sortColumn, {
      ascending: sortOrder === 'asc',
    })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('leads')
      .select('status', { count: 'exact', head: false })

    const summary = {
      total: count || 0,
      new: stats?.filter((s: any) => s.status === 'new').length || 0,
      contacted: stats?.filter((s: any) => s.status === 'contacted').length || 0,
      qualified: stats?.filter((s: any) => s.status === 'qualified').length || 0,
      converted: stats?.filter((s: any) => s.status === 'converted').length || 0,
    }

    // Format response
    const formattedLeads = leads?.map((lead: any) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      priority: lead.priority,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      company: {
        id: (lead.companies as any).id,
        name: (lead.companies as any).name,
      },
      landing_page: lead.landing_pages
        ? {
            id: lead.landing_pages.id,
            title: lead.landing_pages.title,
          }
        : null,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
    }))

    return NextResponse.json({
      leads: formattedLeads || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1,
      },
      summary,
    })
  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
