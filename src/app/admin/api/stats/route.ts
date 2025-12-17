import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Require super admin authentication
    await requireSuperAdmin()

    const supabase = await createClient()

    // Fetch companies data directly
    const { data: companies, error: companiesQueryError } = await supabase
      .from('companies')
      .select('id, is_active')

    if (companiesQueryError) throw companiesQueryError

    // Fetch users count
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) console.error('Users count error:', usersError)

    // Fetch active users in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: activeUsersCount, error: activeUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString())

    if (activeUsersError) console.error('Active users count error:', activeUsersError)

    // Fetch leads count
    const { count: leadsCount, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    if (leadsError) console.error('Leads count error:', leadsError)

    // Fetch recent leads (last 30 days)
    const { count: recentLeadsCount, error: recentLeadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (recentLeadsError) console.error('Recent leads count error:', recentLeadsError)

    // Calculate summary statistics
    const summary = {
      totalCompanies: companies?.length || 0,
      activeCompanies: companies?.filter((c) => c.is_active === true).length || 0,
      totalUsers: usersCount || 0,
      activeUsers30d: activeUsersCount || 0,
      totalLeads: leadsCount || 0,
      leads30d: recentLeadsCount || 0,
      openTickets: 0, // TODO: Implement when support_tickets table exists
      urgentTickets: 0, // TODO: Implement when support_tickets table exists
      totalPageViews: 0, // TODO: Implement analytics
      totalSubmissions: 0, // TODO: Implement analytics
    }

    // Fetch recent companies
    const { data: recentCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(5)

    if (companiesError) throw companiesError

    // Fetch user counts for recent companies
    const recentCompaniesWithUsers = await Promise.all(
      (recentCompanies || []).map(async (company) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)

        return {
          id: company.id,
          name: company.name,
          joinedAt: company.created_at,
          totalUsers: count || 0,
          status: company.is_active ? 'active' : 'inactive',
        }
      })
    )

    // System alerts (no support tickets table yet)
    const systemAlerts: any[] = []

    // Format response
    return NextResponse.json({
      summary,
      recentCompanies: recentCompaniesWithUsers,
      systemAlerts,
      recentActivities: [], // TODO: Implement when company_activity_logs exists
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
