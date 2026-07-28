import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { decryptPhone } from '@/lib/encryption/phone'
import { sanitizeForSpreadsheet } from '@/lib/utils/spreadsheet-sanitize'

// 값에 큰따옴표가 포함되면 CSV 구조 자체가 깨지므로("" 로 이스케이프해야 함),
// 무조건 큰따옴표로 감싸기 전에 내부 큰따옴표를 두 배로 이스케이프해야 한다(RFC 4180).
// 회사명/이름 등은 사용자가 자유롭게 입력하는 값이라 따옴표가 들어올 수 있다.
// =/+/-/@로 시작하는 값은 엑셀이 수식으로 해석할 수 있어 먼저 무해화한다.
function escapeCSV(value: unknown): string {
  const str = String(sanitizeForSpreadsheet(String(value ?? '')))
  return `"${str.replace(/"/g, '""')}"`
}

// 서버(Vercel)는 UTC라서 toLocaleString('ko-KR')만 쓰면 KST와 최대 9시간
// 어긋난다 - timeZone을 명시해야 서버 로케일과 무관하게 항상 KST로 나온다.
function formatKST(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'companies'
    const format = searchParams.get('format') || 'csv'

    const supabase = createAdminClient()
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
    .map((c: any) =>
      [
        c.id,
        c.name,
        c.slug,
        c.is_active ? '활성' : '비활성',
        formatKST(c.created_at),
        formatKST(c.updated_at),
      ]
        .map(escapeCSV)
        .join(',')
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
    .map((u: any) =>
      [
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_active ? '활성' : '비활성',
        (u.companies as any).name,
        formatKST(u.created_at),
        formatKST(u.last_login),
      ]
        .map(escapeCSV)
        .join(',')
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
    .map((l: any) =>
      [
        l.id,
        l.name || '-',
        l.phone ? decryptPhone(l.phone) : '-',
        l.email || '-',
        l.status,
        (l.companies as any).name,
        l.landing_pages?.title || '-',
        formatKST(l.created_at),
      ]
        .map(escapeCSV)
        .join(',')
    )
    .join('\n')

  return header + rows
}
