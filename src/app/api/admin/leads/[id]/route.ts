import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

/**
 * GET /api/admin/leads/[id]
 * admin/leads/[id]/page.tsx가 호출하는 엔드포인트. 이 라우트가 존재하지 않아
 * 항상 실패하고 있었다. 레거시 admin/api/leads/[id]/route.ts를 그대로 옮기지 않은
 * 이유: companies.slug(존재하지 않는 컬럼), lead_status_logs.from_status/to_status/note
 * (실제 컬럼명은 previous_status/new_status/notes), leads.assigned_to의 users 임베드
 * (leads는 assigned_to/call_assigned_to/counselor_assigned_to 3개의 FK가 users를
 * 가리켜 컬럼 지정 없이 쓰면 모호성 에러가 남) 등 레거시 코드 자체에 여러 컬럼명
 * 오류가 있어 실제 스키마 기준으로 새로 작성했다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(
        `
        *,
        companies!leads_company_id_fkey(id, name),
        landing_pages(id, title),
        users!leads_assigned_to_fkey(id, full_name, email)
      `
      )
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: statusLogs } = await supabase
      .from('lead_status_logs')
      .select(
        `
        id,
        previous_status,
        new_status,
        notes,
        created_at,
        users(id, full_name)
      `
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

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
        company: lead.companies
          ? { id: (lead.companies as any).id, name: (lead.companies as any).name }
          : null,
        landing_page: lead.landing_pages
          ? { id: (lead.landing_pages as any).id, title: (lead.landing_pages as any).title }
          : null,
        assigned_to: lead.users
          ? {
              id: (lead.users as any).id,
              full_name: (lead.users as any).full_name,
              email: (lead.users as any).email,
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
      statusLogs: (statusLogs || []).map((log: any) => ({
        id: log.id,
        from_status: log.previous_status,
        to_status: log.new_status,
        note: log.notes,
        created_at: log.created_at,
        changed_by: log.users
          ? { id: log.users.id, full_name: log.users.full_name }
          : { id: null, full_name: '시스템' },
      })),
      notes: (notes || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        created_at: note.created_at,
        author: note.users
          ? { id: note.users.id, full_name: note.users.full_name }
          : { id: null, full_name: '알 수 없음' },
      })),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Admin Lead Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
