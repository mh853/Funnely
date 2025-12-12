import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Require super admin authentication
    await requireSuperAdmin()

    const supabase = await createClient()

    // Fetch summary stats from materialized view
    const { data: statsData, error: statsError } = await supabase
      .from('admin_company_stats')
      .select('*')

    if (statsError) throw statsError

    // Calculate summary statistics
    const summary = {
      totalCompanies: statsData?.length || 0,
      activeCompanies:
        statsData?.filter((s) => s.is_active === true).length || 0,
      totalUsers: statsData?.reduce((sum, s) => sum + (s.total_users || 0), 0) || 0,
      activeUsers30d:
        statsData?.reduce((sum, s) => sum + (s.active_users_30d || 0), 0) || 0,
      totalLeads: statsData?.reduce((sum, s) => sum + (s.total_leads || 0), 0) || 0,
      leads30d: statsData?.reduce((sum, s) => sum + (s.leads_30d || 0), 0) || 0,
      openTickets:
        statsData?.reduce((sum, s) => sum + (s.open_tickets || 0), 0) || 0,
      urgentTickets:
        statsData?.reduce((sum, s) => sum + (s.urgent_tickets || 0), 0) || 0,
      totalPageViews:
        statsData?.reduce((sum, s) => sum + (s.total_page_views || 0), 0) || 0,
      totalSubmissions:
        statsData?.reduce((sum, s) => sum + (s.total_submissions || 0), 0) || 0,
    }

    // Fetch recent companies
    const { data: recentCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (companiesError) throw companiesError

    // Fetch recent activities
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        activity_type,
        activity_description,
        created_at,
        companies!inner(name)
      `
      )
      .order('created_at', { ascending: false })
      .limit(10)

    if (activitiesError) throw activitiesError

    // Fetch system alerts
    const { data: urgentTickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, priority, status')
      .eq('priority', 'urgent')
      .neq('status', 'closed')

    if (ticketsError) throw ticketsError

    const systemAlerts = []

    if (urgentTickets && urgentTickets.length > 0) {
      systemAlerts.push({
        type: 'urgent_ticket',
        count: urgentTickets.length,
        severity: 'high',
        message: `긴급 문의 ${urgentTickets.length}건`,
        action: {
          label: '확인하기',
          href: '/admin/support?priority=urgent',
        },
      })
    }

    // Format response
    return NextResponse.json({
      summary,
      recentCompanies: recentCompanies?.map((c) => ({
        id: c.id,
        name: c.name,
        joinedAt: c.created_at,
        totalUsers:
          statsData?.find((s) => s.company_id === c.id)?.total_users || 0,
        status:
          statsData?.find((s) => s.company_id === c.id)?.is_active === true
            ? 'active'
            : 'inactive',
      })),
      systemAlerts,
      recentActivities: recentActivities?.map((a) => ({
        id: a.id,
        companyName: (a.companies as any)?.name || 'Unknown',
        activityType: a.activity_type,
        description: a.activity_description || a.activity_type,
        createdAt: a.created_at,
      })),
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
