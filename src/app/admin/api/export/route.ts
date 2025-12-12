import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'companies'
    const format = searchParams.get('format') || 'csv'

    const supabase = await createClient()
    let csvData = ''

    switch (type) {
      case 'companies':
        csvData = await exportCompanies(supabase)
        break
      case 'users':
        csvData = await exportUsers(supabase)
        break
      case 'leads':
        csvData = await exportLeads(supabase)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function exportCompanies(supabase: any) {
  const { data: companies } = await supabase
    .from('companies')
    .select(
      `
      id,
      name,
      slug,
      is_active,
      created_at,
      updated_at
    `
    )
    .order('created_at', { ascending: false })

  if (!companies || companies.length === 0) {
    return 'ID,이름,슬러그,활성 상태,생성일,수정일\n'
  }

  const header = 'ID,이름,슬러그,활성 상태,생성일,수정일\n'
  const rows = companies
    .map(
      (c: any) =>
        `"${c.id}","${c.name}","${c.slug}","${c.is_active ? '활성' : '비활성'}","${new Date(c.created_at).toLocaleString('ko-KR')}","${new Date(c.updated_at).toLocaleString('ko-KR')}"`
    )
    .join('\n')

  return header + rows
}

async function exportUsers(supabase: any) {
  const { data: users } = await supabase
    .from('users')
    .select(
      `
      id,
      full_name,
      email,
      role,
      is_active,
      created_at,
      last_login,
      companies!inner(name)
    `
    )
    .order('created_at', { ascending: false })

  if (!users || users.length === 0) {
    return 'ID,이름,이메일,역할,활성 상태,회사,생성일,마지막 로그인\n'
  }

  const header =
    'ID,이름,이메일,역할,활성 상태,회사,생성일,마지막 로그인\n'
  const rows = users
    .map(
      (u: any) =>
        `"${u.id}","${u.full_name}","${u.email}","${u.role}","${u.is_active ? '활성' : '비활성'}","${(u.companies as any).name}","${new Date(u.created_at).toLocaleString('ko-KR')}","${u.last_login ? new Date(u.last_login).toLocaleString('ko-KR') : '-'}"`
    )
    .join('\n')

  return header + rows
}

async function exportLeads(supabase: any) {
  const { data: leads } = await supabase
    .from('leads')
    .select(
      `
      id,
      name,
      phone,
      email,
      status,
      created_at,
      companies!inner(name),
      landing_pages(title)
    `
    )
    .order('created_at', { ascending: false })
    .limit(1000) // 최대 1000개로 제한

  if (!leads || leads.length === 0) {
    return 'ID,이름,전화번호,이메일,상태,회사,랜딩페이지,생성일\n'
  }

  const header = 'ID,이름,전화번호,이메일,상태,회사,랜딩페이지,생성일\n'
  const rows = leads
    .map(
      (l: any) =>
        `"${l.id}","${l.name || '-'}","${l.phone || '-'}","${l.email || '-'}","${l.status}","${(l.companies as any).name}","${l.landing_pages?.title || '-'}","${new Date(l.created_at).toLocaleString('ko-KR')}"`
    )
    .join('\n')

  return header + rows
}
