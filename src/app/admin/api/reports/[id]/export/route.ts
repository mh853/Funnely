import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import * as XLSX from 'xlsx'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const reportId = params.id
    const supabase = await createClient()

    // 리포트 정보 조회
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .select(
        `
        *,
        template:report_templates!generated_reports_template_id_fkey(id, name, type),
        company:companies!generated_reports_company_id_fkey(id, name),
        generated_by_user:users!generated_reports_generated_by_fkey(id, full_name)
      `
      )
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // 리포트 기간 동안의 리드 데이터 조회
    let query = supabase
      .from('leads')
      .select(
        `
        id,
        name,
        email,
        phone,
        status,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        created_at,
        company:companies!leads_company_id_fkey(id, name),
        assigned_user:users!leads_assigned_to_fkey(id, full_name)
      `
      )
      .gte('created_at', report.period_start)
      .lte('created_at', report.period_end)
      .order('created_at', { ascending: false })

    if (report.company_id) {
      query = query.eq('company_id', report.company_id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 })
    }

    // Excel 데이터 준비
    const excelData = leads?.map((lead: any) => ({
      ID: lead.id,
      이름: lead.name || '',
      이메일: lead.email || '',
      전화번호: lead.phone || '',
      상태: getStatusLabel(lead.status),
      소스: lead.source || '',
      'UTM Source': lead.utm_source || '',
      'UTM Medium': lead.utm_medium || '',
      'UTM Campaign': lead.utm_campaign || '',
      회사: lead.company?.name || '',
      담당자: lead.assigned_user?.full_name || '',
      생성일: new Date(lead.created_at).toLocaleString('ko-KR'),
    }))

    // 통계 시트 데이터
    const statusCounts = leads?.reduce((acc: any, lead: any) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {})

    const statsData = [
      { 항목: '전체 리드', 값: leads?.length || 0 },
      { 항목: '신규', 값: statusCounts?.new || 0 },
      { 항목: '연락 시도', 값: statusCounts?.contacted || 0 },
      { 항목: '적격', 값: statusCounts?.qualified || 0 },
      { 항목: '전환', 값: statusCounts?.converted || 0 },
      { 항목: '실패', 값: statusCounts?.lost || 0 },
      {
        항목: '전환율',
        값: `${statusCounts?.new > 0 ? ((statusCounts?.converted || 0) / statusCounts.new * 100).toFixed(2) : 0}%`,
      },
    ]

    // 워크북 생성
    const workbook = XLSX.utils.book_new()

    // 통계 시트
    const statsSheet = XLSX.utils.json_to_sheet(statsData)
    XLSX.utils.book_append_sheet(workbook, statsSheet, '통계')

    // 리드 데이터 시트
    const leadsSheet = XLSX.utils.json_to_sheet(excelData || [])
    XLSX.utils.book_append_sheet(workbook, leadsSheet, '리드 목록')

    // Excel 파일 생성
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 파일명 생성
    const fileName = `${report.name}_${new Date().toISOString().split('T')[0]}.xlsx`

    // 응답 생성
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('Report export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: '신규',
    contacted: '연락 시도',
    qualified: '적격',
    converted: '전환',
    lost: '실패',
  }
  return labels[status] || status
}
