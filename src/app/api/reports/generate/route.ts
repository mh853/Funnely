import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check permission
    const allowedRoles = ['hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff']
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { reportType, format, campaignIds, startDate, endDate, includedMetrics, hospitalId } =
      body

    // Validate hospital ID
    if (hospitalId !== userProfile.hospital_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // Validate required fields
    if (!reportType || !format || !campaignIds || campaignIds.length === 0) {
      return NextResponse.json({ error: '필수 필드를 입력해주세요.' }, { status: 400 })
    }

    // Get campaigns data
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select(`
        *,
        ad_accounts (
          platform,
          account_name
        )
      `)
      .in('id', campaignIds)
      .eq('hospital_id', hospitalId)

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ error: '캠페인을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Get performance data
    let performanceQuery = supabase
      .from('campaign_performance')
      .select('*')
      .in('campaign_id', campaignIds)

    if (startDate) {
      performanceQuery = performanceQuery.gte('date', startDate)
    }
    if (endDate) {
      performanceQuery = performanceQuery.lte('date', endDate)
    }

    const { data: performanceData } = await performanceQuery.order('date', { ascending: false })

    // Generate Excel file
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('리포트')

      // Add title
      worksheet.addRow([getReportTitle(reportType)])
      worksheet.addRow([
        `기간: ${startDate || '전체'} ~ ${endDate || '전체'}`,
      ])
      worksheet.addRow([]) // Empty row

      // Add headers based on report type and included metrics
      const headers = ['캠페인명', '플랫폼', '상태']
      if (includedMetrics.includes('impressions')) headers.push('노출수')
      if (includedMetrics.includes('clicks')) headers.push('클릭수')
      if (includedMetrics.includes('spend')) headers.push('지출')
      if (includedMetrics.includes('conversions')) headers.push('전환')
      if (includedMetrics.includes('ctr')) headers.push('CTR (%)')
      if (includedMetrics.includes('cpc')) headers.push('CPC (₩)')
      if (includedMetrics.includes('cpa')) headers.push('CPA (₩)')

      worksheet.addRow(headers)

      // Add data rows
      campaigns.forEach((campaign) => {
        const metrics = performanceData?.filter((p) => p.campaign_id === campaign.id) || []
        const totals = metrics.reduce(
          (acc, m) => ({
            impressions: acc.impressions + (m.impressions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            spend: acc.spend + (m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
        )

        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
        const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
        const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0

        const row = [
          campaign.campaign_name,
          campaign.ad_accounts?.platform || '-',
          getStatusLabel(campaign.status),
        ]

        if (includedMetrics.includes('impressions')) row.push(totals.impressions)
        if (includedMetrics.includes('clicks')) row.push(totals.clicks)
        if (includedMetrics.includes('spend')) row.push(totals.spend)
        if (includedMetrics.includes('conversions')) row.push(totals.conversions)
        if (includedMetrics.includes('ctr')) row.push(ctr.toFixed(2))
        if (includedMetrics.includes('cpc')) row.push(cpc.toFixed(0))
        if (includedMetrics.includes('cpa')) row.push(cpa.toFixed(0))

        worksheet.addRow(row)
      })

      // Style the header row
      const headerRow = worksheet.getRow(4)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0
        column?.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10
          if (columnLength > maxLength) {
            maxLength = columnLength
          }
        })
        if (column) {
          column.width = maxLength < 10 ? 10 : maxLength + 2
        }
      })

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer()

      // Save report record
      const { data: report } = await supabase
        .from('reports')
        .insert({
          hospital_id: hospitalId,
          report_type: reportType,
          format,
          start_date: startDate || null,
          end_date: endDate || null,
          campaign_count: campaignIds.length,
          file_url: null, // For now, we're not storing files
        })
        .select()
        .single()

      // Return Excel file
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=report_${new Date().toISOString().split('T')[0]}.xlsx`,
        },
      })
    }

    // PDF format
    if (format === 'pdf') {
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(16)
      doc.text(getReportTitle(reportType), 14, 15)

      doc.setFontSize(10)
      doc.text(`기간: ${startDate || '전체'} ~ ${endDate || '전체'}`, 14, 22)
      doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 14, 27)

      // Prepare table data
      const headers = [['캠페인명', '플랫폼', '상태']]
      if (includedMetrics.includes('impressions')) headers[0].push('노출수')
      if (includedMetrics.includes('clicks')) headers[0].push('클릭수')
      if (includedMetrics.includes('spend')) headers[0].push('지출')
      if (includedMetrics.includes('conversions')) headers[0].push('전환')
      if (includedMetrics.includes('ctr')) headers[0].push('CTR(%)')
      if (includedMetrics.includes('cpc')) headers[0].push('CPC')
      if (includedMetrics.includes('cpa')) headers[0].push('CPA')

      const rows = campaigns.map((campaign) => {
        const metrics = performanceData?.filter((p) => p.campaign_id === campaign.id) || []
        const totals = metrics.reduce(
          (acc, m) => ({
            impressions: acc.impressions + (m.impressions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            spend: acc.spend + (m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
        )

        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
        const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
        const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0

        const row = [
          campaign.campaign_name,
          campaign.ad_accounts?.platform || '-',
          getStatusLabel(campaign.status),
        ]

        if (includedMetrics.includes('impressions'))
          row.push(totals.impressions.toLocaleString('ko-KR'))
        if (includedMetrics.includes('clicks')) row.push(totals.clicks.toLocaleString('ko-KR'))
        if (includedMetrics.includes('spend')) row.push(totals.spend.toLocaleString('ko-KR'))
        if (includedMetrics.includes('conversions'))
          row.push(totals.conversions.toLocaleString('ko-KR'))
        if (includedMetrics.includes('ctr')) row.push(ctr.toFixed(2))
        if (includedMetrics.includes('cpc')) row.push(cpc.toFixed(0))
        if (includedMetrics.includes('cpa')) row.push(cpa.toFixed(0))

        return row
      })

      // Add table
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 32,
        styles: { font: 'helvetica', fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      })

      // Save report record
      await supabase.from('reports').insert({
        hospital_id: hospitalId,
        report_type: reportType,
        format,
        start_date: startDate || null,
        end_date: endDate || null,
        campaign_count: campaignIds.length,
        file_url: null,
      })

      // Return PDF file
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=report_${new Date().toISOString().split('T')[0]}.pdf`,
        },
      })
    }

    // Unsupported format
    return NextResponse.json({ error: '지원하지 않는 형식입니다.' }, { status: 400 })
  } catch (error: any) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: error.message || '리포트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    campaign_summary: '캠페인 요약 리포트',
    performance_detail: '성과 상세 리포트',
    budget_analysis: '예산 분석 리포트',
    conversion_report: '전환 리포트',
  }
  return titles[reportType] || '광고 성과 리포트'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '활성',
    paused: '일시중지',
    completed: '완료',
    draft: '초안',
  }
  return labels[status] || status
}
