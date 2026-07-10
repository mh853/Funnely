import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

/**
 * GET /api/admin/leads
 * admin/leads/page.tsx가 호출하는 엔드포인트. 이 라우트가 존재하지 않아
 * 항상 실패하고 있었다 (레거시 admin/api/leads/route.ts만 존재, 호출하는 곳 없음).
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const companyId = searchParams.get('company_id') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const offset = (page - 1) * limit

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
        companies!leads_company_id_fkey(id, name),
        landing_pages(id, title)
      `,
        { count: 'exact' }
      )

    if (search) {
      const safeSearch = search.replace(/[,()]/g, '')
      query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
    }

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const validSortColumns = ['created_at', 'updated_at', 'name', 'status']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    query = query.range(offset, offset + limit - 1)

    const { data: leads, error, count } = await query

    if (error) {
      console.error('[Admin Leads API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 리드 상태는 회사별 커스텀 lead_statuses 기반이며, 시스템 기본값은
    // new/rejected/contacted/converted/contract_completed/needs_followup/other이다
    // ('qualified'/'lost'는 실제로 존재하지 않는 코드).
    const { data: stats } = await supabase.from('leads').select('status')

    const summary = {
      total: count || 0,
      new: stats?.filter((s: any) => s.status === 'new').length || 0,
      contacted: stats?.filter((s: any) => s.status === 'contacted').length || 0,
      contract_completed: stats?.filter((s: any) => s.status === 'contract_completed').length || 0,
      converted: stats?.filter((s: any) => s.status === 'converted').length || 0,
    }

    const formattedLeads = (leads || []).map((lead: any) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      status: lead.status,
      priority: lead.priority,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      company: lead.companies ? { id: lead.companies.id, name: lead.companies.name } : null,
      landing_page: lead.landing_pages
        ? { id: lead.landing_pages.id, title: lead.landing_pages.title }
        : null,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
    }))

    return NextResponse.json({
      leads: formattedLeads,
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
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Admin Leads API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
