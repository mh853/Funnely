'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon, ChartBarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface TrafficRow {
  date: string
  total: number
  pc: number
  mobile: number
  tablet: number
}

interface ConversionRow {
  date: string
  total: number
  pc: number
  mobile: number
  tablet: number
}

interface UtmData {
  source: Record<string, number>
  medium: Record<string, number>
  campaign: Record<string, number>
  content: Record<string, number>
  term: Record<string, number>
}

interface LandingPageRow {
  id: string
  title: string
  slug: string
  createdAt: string
  traffic: {
    total: number
    pc: number
    mobile: number
    tablet: number
  }
  conversion: {
    total: number
    pc: number
    mobile: number
    tablet: number
  }
}

interface AnalyticsClientProps {
  trafficRows: TrafficRow[]
  conversionRows: ConversionRow[]
  selectedYear: number
  selectedMonth: number
  daysInMonth: number
  utmData: UtmData
  landingPageRows: LandingPageRow[]
}

export default function AnalyticsClient({
  trafficRows,
  conversionRows,
  selectedYear,
  selectedMonth,
  daysInMonth,
  utmData,
  landingPageRows,
}: AnalyticsClientProps) {
  const router = useRouter()

  // Sort data in ascending order (oldest to newest)
  const sortedTrafficRows = [...trafficRows].sort((a, b) => a.date.localeCompare(b.date))

  // Navigation handlers
  const handlePrevMonth = () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
    router.push(`/dashboard/analytics?year=${prevYear}&month=${prevMonth}`)
  }

  const handleNextMonth = () => {
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
    router.push(`/dashboard/analytics?year=${nextYear}&month=${nextMonth}`)
  }

  // Calculate totals for traffic
  const trafficTotals = trafficRows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      pc: acc.pc + row.pc,
      mobile: acc.mobile + row.mobile,
      tablet: acc.tablet + row.tablet,
    }),
    { total: 0, pc: 0, mobile: 0, tablet: 0 }
  )

  // Calculate totals for conversions
  const conversionTotals = conversionRows.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      pc: acc.pc + row.pc,
      mobile: acc.mobile + row.mobile,
      tablet: acc.tablet + row.tablet,
    }),
    { total: 0, pc: 0, mobile: 0, tablet: 0 }
  )

  // Helper function to calculate conversion rate
  const calculateConversionRate = (conversions: number, traffic: number): string => {
    if (traffic === 0) return '0.0%'
    return `${((conversions / traffic) * 100).toFixed(1)}%`
  }

  // 날짜 형식 변환 함수 (DB리포트와 동일)
  const formatDate = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    return dateStr
  }

  // CSV 이스케이프 함수 (DB리포트와 동일)
  const escapeCSV = (value: any): string => {
    const strValue = String(value)
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`
    }
    return strValue
  }

  // 트래픽 유입 다운로드
  const handleExportTraffic = () => {
    const headers = ['날짜', '합계', 'PC', 'PC(%)', 'MOBILE', 'MOBILE(%)', 'TABLET', 'TABLET(%)']

    const rows = sortedTrafficRows.map(row => [
      formatDate(row.date),
      row.total,
      row.pc,
      row.total > 0 ? ((row.pc / row.total) * 100).toFixed(1) : '0.0',
      row.mobile,
      row.total > 0 ? ((row.mobile / row.total) * 100).toFixed(1) : '0.0',
      row.tablet,
      row.total > 0 ? ((row.tablet / row.total) * 100).toFixed(1) : '0.0',
    ])

    rows.push([
      '합계',
      trafficTotals.total,
      trafficTotals.pc,
      trafficTotals.total > 0 ? ((trafficTotals.pc / trafficTotals.total) * 100).toFixed(1) : '0.0',
      trafficTotals.mobile,
      trafficTotals.total > 0 ? ((trafficTotals.mobile / trafficTotals.total) * 100).toFixed(1) : '0.0',
      trafficTotals.tablet,
      trafficTotals.total > 0 ? ((trafficTotals.tablet / trafficTotals.total) * 100).toFixed(1) : '0.0',
    ])

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCSV).join(','),
        ...rows.map(r => r.map(escapeCSV).join(','))
      ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `traffic_${selectedYear}년${selectedMonth}월.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // DB 전환수 다운로드
  const handleExportConversion = () => {
    const headers = ['날짜', '합계', '전환율(%)', 'PC', 'PC전환율(%)', 'MOBILE', 'MOBILE전환율(%)', 'TABLET', 'TABLET전환율(%)']

    const rows = sortedTrafficRows.map(trafficRow => {
      const conversion = conversionMap.get(trafficRow.date) || { total: 0, pc: 0, mobile: 0, tablet: 0 }
      return [
        formatDate(trafficRow.date),
        conversion.total,
        trafficRow.total > 0 ? ((conversion.total / trafficRow.total) * 100).toFixed(1) : '0.0',
        conversion.pc,
        trafficRow.pc > 0 ? ((conversion.pc / trafficRow.pc) * 100).toFixed(1) : '0.0',
        conversion.mobile,
        trafficRow.mobile > 0 ? ((conversion.mobile / trafficRow.mobile) * 100).toFixed(1) : '0.0',
        conversion.tablet,
        trafficRow.tablet > 0 ? ((conversion.tablet / trafficRow.tablet) * 100).toFixed(1) : '0.0',
      ]
    })

    rows.push([
      '합계',
      conversionTotals.total,
      trafficTotals.total > 0 ? ((conversionTotals.total / trafficTotals.total) * 100).toFixed(1) : '0.0',
      conversionTotals.pc,
      trafficTotals.pc > 0 ? ((conversionTotals.pc / trafficTotals.pc) * 100).toFixed(1) : '0.0',
      conversionTotals.mobile,
      trafficTotals.mobile > 0 ? ((conversionTotals.mobile / trafficTotals.mobile) * 100).toFixed(1) : '0.0',
      conversionTotals.tablet,
      trafficTotals.tablet > 0 ? ((conversionTotals.tablet / trafficTotals.tablet) * 100).toFixed(1) : '0.0',
    ])

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCSV).join(','),
        ...rows.map(r => r.map(escapeCSV).join(','))
      ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `conversion_${selectedYear}년${selectedMonth}월.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 랜딩페이지 분석 다운로드
  const handleExportLandingPages = () => {
    const headers = [
      '생성날짜',
      '랜딩페이지이름',
      '트래픽합계',
      'PC',
      'PC(%)',
      'MOBILE',
      'MOBILE(%)',
      'TABLET',
      'TABLET(%)',
      '전환수',
      '전환율(%)',
      'PC전환',
      'PC(%)',
      'MOBILE전환',
      'MOBILE(%)',
      'TABLET전환',
      'TABLET(%)'
    ]

    const rows = landingPageRows.map(lp => {
      const trafficTotal = lp.traffic.total
      const trafficPcPct = trafficTotal > 0 ? ((lp.traffic.pc / trafficTotal) * 100).toFixed(1) : '0.0'
      const trafficMobilePct = trafficTotal > 0 ? ((lp.traffic.mobile / trafficTotal) * 100).toFixed(1) : '0.0'
      const trafficTabletPct = trafficTotal > 0 ? ((lp.traffic.tablet / trafficTotal) * 100).toFixed(1) : '0.0'

      const conversionTotal = lp.conversion.total
      const conversionPcPct = conversionTotal > 0 ? ((lp.conversion.pc / conversionTotal) * 100).toFixed(1) : '0.0'
      const conversionMobilePct = conversionTotal > 0 ? ((lp.conversion.mobile / conversionTotal) * 100).toFixed(1) : '0.0'
      const conversionTabletPct = conversionTotal > 0 ? ((lp.conversion.tablet / conversionTotal) * 100).toFixed(1) : '0.0'

      const conversionRate = trafficTotal > 0 ? ((conversionTotal / trafficTotal) * 100).toFixed(1) : '0.0'

      return [
        new Date(lp.createdAt).toISOString().split('T')[0],
        lp.title,
        trafficTotal,
        lp.traffic.pc,
        trafficPcPct,
        lp.traffic.mobile,
        trafficMobilePct,
        lp.traffic.tablet,
        trafficTabletPct,
        conversionTotal,
        conversionRate,
        lp.conversion.pc,
        conversionPcPct,
        lp.conversion.mobile,
        conversionMobilePct,
        lp.conversion.tablet,
        conversionTabletPct,
      ]
    })

    // 합계 행 추가
    if (landingPageRows.length > 0) {
      const totalTraffic = landingPageRows.reduce((sum, lp) => sum + lp.traffic.total, 0)
      const totalTrafficPc = landingPageRows.reduce((sum, lp) => sum + lp.traffic.pc, 0)
      const totalTrafficMobile = landingPageRows.reduce((sum, lp) => sum + lp.traffic.mobile, 0)
      const totalTrafficTablet = landingPageRows.reduce((sum, lp) => sum + lp.traffic.tablet, 0)

      const totalConversion = landingPageRows.reduce((sum, lp) => sum + lp.conversion.total, 0)
      const totalConversionPc = landingPageRows.reduce((sum, lp) => sum + lp.conversion.pc, 0)
      const totalConversionMobile = landingPageRows.reduce((sum, lp) => sum + lp.conversion.mobile, 0)
      const totalConversionTablet = landingPageRows.reduce((sum, lp) => sum + lp.conversion.tablet, 0)

      const totalTrafficPcPct = totalTraffic > 0 ? ((totalTrafficPc / totalTraffic) * 100).toFixed(1) : '0.0'
      const totalTrafficMobilePct = totalTraffic > 0 ? ((totalTrafficMobile / totalTraffic) * 100).toFixed(1) : '0.0'
      const totalTrafficTabletPct = totalTraffic > 0 ? ((totalTrafficTablet / totalTraffic) * 100).toFixed(1) : '0.0'

      const totalConversionPcPct = totalConversion > 0 ? ((totalConversionPc / totalConversion) * 100).toFixed(1) : '0.0'
      const totalConversionMobilePct = totalConversion > 0 ? ((totalConversionMobile / totalConversion) * 100).toFixed(1) : '0.0'
      const totalConversionTabletPct = totalConversion > 0 ? ((totalConversionTablet / totalConversion) * 100).toFixed(1) : '0.0'

      const totalConversionRate = totalTraffic > 0 ? ((totalConversion / totalTraffic) * 100).toFixed(1) : '0.0'

      rows.push([
        '합계',
        '',
        totalTraffic,
        totalTrafficPc,
        totalTrafficPcPct,
        totalTrafficMobile,
        totalTrafficMobilePct,
        totalTrafficTablet,
        totalTrafficTabletPct,
        totalConversion,
        totalConversionRate,
        totalConversionPc,
        totalConversionPcPct,
        totalConversionMobile,
        totalConversionMobilePct,
        totalConversionTablet,
        totalConversionTabletPct,
      ])
    }

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCSV).join(','),
        ...rows.map(r => r.map(escapeCSV).join(','))
      ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `landing_pages_${selectedYear}년${selectedMonth}월.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // UTM 분석 다운로드
  const handleExportUtm = () => {
    const headers = ['UTM구분', '항목', '카운트', '비율(%)']
    const rows: any[][] = []

    // UTM Source
    const sourceTotal = Object.values(utmData.source).reduce((sum, count) => sum + count, 0)
    Object.entries(utmData.source)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        const percentage = sourceTotal > 0 ? ((count / sourceTotal) * 100).toFixed(1) : '0.0'
        rows.push(['Source', key, count, percentage])
      })

    // UTM Medium
    const mediumTotal = Object.values(utmData.medium).reduce((sum, count) => sum + count, 0)
    Object.entries(utmData.medium)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        const percentage = mediumTotal > 0 ? ((count / mediumTotal) * 100).toFixed(1) : '0.0'
        rows.push(['Medium', key, count, percentage])
      })

    // UTM Campaign
    const campaignTotal = Object.values(utmData.campaign).reduce((sum, count) => sum + count, 0)
    Object.entries(utmData.campaign)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        const percentage = campaignTotal > 0 ? ((count / campaignTotal) * 100).toFixed(1) : '0.0'
        rows.push(['Campaign', key, count, percentage])
      })

    // UTM Content
    const contentTotal = Object.values(utmData.content).reduce((sum, count) => sum + count, 0)
    Object.entries(utmData.content)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        const percentage = contentTotal > 0 ? ((count / contentTotal) * 100).toFixed(1) : '0.0'
        rows.push(['Content', key, count, percentage])
      })

    // UTM Term
    const termTotal = Object.values(utmData.term).reduce((sum, count) => sum + count, 0)
    Object.entries(utmData.term)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        const percentage = termTotal > 0 ? ((count / termTotal) * 100).toFixed(1) : '0.0'
        rows.push(['Term', key, count, percentage])
      })

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCSV).join(','),
        ...rows.map(r => r.map(escapeCSV).join(','))
      ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `utm_analysis_${selectedYear}년${selectedMonth}월.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Merge traffic and conversion data by date for easier lookup
  const conversionMap = new Map(conversionRows.map(row => [row.date, row]))

  // Helper function to render UTM category with progress bars
  const renderUtmCategory = (title: string, data: Record<string, number>) => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0)
    const sortedEntries = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Show top 10 items

    return (
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {sortedEntries.map(([key, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{key}</span>
                  <span className="text-sm text-gray-600">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">트래픽 분석</h1>
            <p className="text-xs text-gray-500 mt-0.5">트래픽 현황 및 유입경로를 분석합니다</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>

          <div className="bg-gray-100 rounded-lg px-3 py-1.5 min-w-[120px] text-center">
            <span className="font-semibold text-sm text-gray-900">
              {selectedYear}년 {selectedMonth}월
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Two-Column Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traffic Table (Left) */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-yellow-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              트래픽 유입 (페이지뷰)
            </h2>
            <button
              onClick={handleExportTraffic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              엑셀 다운로드
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    날짜
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    합계
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    PC
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    MOBILE
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    TABLET
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTrafficRows.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {row.date}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {row.total}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-blue-600">
                      {row.pc}
                      <span className="text-gray-400 text-xs ml-1">
                        {row.total > 0 ? `(${((row.pc / row.total) * 100).toFixed(1)}%)` : '(0.0%)'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {row.mobile}
                      <span className="text-gray-400 text-xs ml-1">
                        {row.total > 0 ? `(${((row.mobile / row.total) * 100).toFixed(1)}%)` : '(0.0%)'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-purple-600">
                      {row.tablet}
                      <span className="text-gray-400 text-xs ml-1">
                        {row.total > 0 ? `(${((row.tablet / row.total) * 100).toFixed(1)}%)` : '(0.0%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Row */}
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                  <td className="px-3 py-2 text-sm text-center text-gray-900">
                    {trafficTotals.total}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-blue-600">
                    {trafficTotals.pc}
                    {trafficTotals.total > 0 && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({Math.round((trafficTotals.pc / trafficTotals.total) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-green-600">
                    {trafficTotals.mobile}
                    {trafficTotals.total > 0 && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({Math.round((trafficTotals.mobile / trafficTotals.total) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-purple-600">
                    {trafficTotals.tablet}
                    {trafficTotals.total > 0 && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({Math.round((trafficTotals.tablet / trafficTotals.total) * 100)}%)
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Conversion Table (Right) */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-yellow-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              DB 전환수 (전환율)
              <span className="ml-2 text-xs font-normal text-gray-500">
                트래픽 유입 대비 DB 전환된 비율
              </span>
            </h2>
            <button
              onClick={handleExportConversion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              엑셀 다운로드
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    날짜
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    합계
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    PC
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    MOBILE
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                    TABLET
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTrafficRows.map((trafficRow) => {
                  const conversion = conversionMap.get(trafficRow.date) || {
                    total: 0,
                    pc: 0,
                    mobile: 0,
                    tablet: 0,
                  }

                  return (
                    <tr key={trafficRow.date} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {trafficRow.date}
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-gray-900">
                        {conversion.total}
                        <span className="text-gray-400 text-xs ml-1">
                          {trafficRow.total > 0
                            ? `(${((conversion.total / trafficRow.total) * 100).toFixed(1)}%)`
                            : '(0.0%)'
                          }
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-blue-600">
                        {conversion.pc}
                        <span className="text-gray-400 text-xs ml-1">
                          {trafficRow.pc > 0
                            ? `(${((conversion.pc / trafficRow.pc) * 100).toFixed(1)}%)`
                            : '(0.0%)'
                          }
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-green-600">
                        {conversion.mobile}
                        <span className="text-gray-400 text-xs ml-1">
                          {trafficRow.mobile > 0
                            ? `(${((conversion.mobile / trafficRow.mobile) * 100).toFixed(1)}%)`
                            : '(0.0%)'
                          }
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-center text-purple-600">
                        {conversion.tablet}
                        <span className="text-gray-400 text-xs ml-1">
                          {trafficRow.tablet > 0
                            ? `(${((conversion.tablet / trafficRow.tablet) * 100).toFixed(1)}%)`
                            : '(0.0%)'
                          }
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Total Row */}
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                  <td className="px-3 py-2 text-sm text-center text-gray-900">
                    {conversionTotals.total}
                    <span className="text-gray-400 text-xs ml-1">
                      {trafficTotals.total > 0
                        ? `(${((conversionTotals.total / trafficTotals.total) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-blue-600">
                    {conversionTotals.pc}
                    <span className="text-gray-400 text-xs ml-1">
                      {trafficTotals.pc > 0
                        ? `(${((conversionTotals.pc / trafficTotals.pc) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-green-600">
                    {conversionTotals.mobile}
                    <span className="text-gray-400 text-xs ml-1">
                      {trafficTotals.mobile > 0
                        ? `(${((conversionTotals.mobile / trafficTotals.mobile) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center text-purple-600">
                    {conversionTotals.tablet}
                    <span className="text-gray-400 text-xs ml-1">
                      {trafficTotals.tablet > 0
                        ? `(${((conversionTotals.tablet / trafficTotals.tablet) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Landing Page Analysis Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-yellow-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            랜딩페이지 분석
          </h2>
          <button
            onClick={handleExportLandingPages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            엑셀 다운로드
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  생성 날짜
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                  랜딩페이지 이름
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  트래픽 유입 합계<br/>(페이지뷰)
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-blue-50">
                  PC
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-green-50">
                  MOBILE
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-purple-50">
                  TABLET
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  DB 전환수<br/>(전환율%)
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-blue-50">
                  PC
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-green-50">
                  MOBILE
                </th>
                <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center bg-purple-50">
                  TABLET
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {landingPageRows.map((lp) => {
                // Calculate percentages for traffic
                const trafficTotal = lp.traffic.total
                const trafficPcPct = trafficTotal > 0 ? Math.round((lp.traffic.pc / trafficTotal) * 100) : 0
                const trafficMobilePct = trafficTotal > 0 ? Math.round((lp.traffic.mobile / trafficTotal) * 100) : 0
                const trafficTabletPct = trafficTotal > 0 ? Math.round((lp.traffic.tablet / trafficTotal) * 100) : 0

                // Calculate percentages for conversion (device breakdown)
                const conversionTotal = lp.conversion.total
                const conversionPcPct = conversionTotal > 0 ? Math.round((lp.conversion.pc / conversionTotal) * 100) : 0
                const conversionMobilePct = conversionTotal > 0 ? Math.round((lp.conversion.mobile / conversionTotal) * 100) : 0
                const conversionTabletPct = conversionTotal > 0 ? Math.round((lp.conversion.tablet / conversionTotal) * 100) : 0

                // Calculate conversion rate (conversions / traffic)
                const conversionRate = trafficTotal > 0 ? ((conversionTotal / trafficTotal) * 100).toFixed(1) : '0.0'

                return (
                  <tr key={lp.id}>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {new Date(lp.createdAt).toISOString().split('T')[0]}
                    </td>
                    <td className="px-3 py-2 text-sm text-left max-w-xs">
                      <a
                        href={`/dashboard/landing-pages/${lp.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                        title={lp.title}
                      >
                        {lp.title}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 font-semibold">
                      {lp.traffic.total}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-blue-600">
                      {lp.traffic.pc}
                      <span className="text-gray-400 text-xs ml-1">
                        ({trafficPcPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {lp.traffic.mobile}
                      <span className="text-gray-400 text-xs ml-1">
                        ({trafficMobilePct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-purple-600">
                      {lp.traffic.tablet}
                      <span className="text-gray-400 text-xs ml-1">
                        ({trafficTabletPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900 font-semibold">
                      {lp.conversion.total}
                      <span className="text-gray-400 text-xs ml-1">
                        ({conversionRate}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-blue-600">
                      {lp.conversion.pc}
                      <span className="text-gray-400 text-xs ml-1">
                        ({conversionPcPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {lp.conversion.mobile}
                      <span className="text-gray-400 text-xs ml-1">
                        ({conversionMobilePct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-purple-600">
                      {lp.conversion.tablet}
                      <span className="text-gray-400 text-xs ml-1">
                        ({conversionTabletPct}%)
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Total Row */}
            {landingPageRows.length > 0 && (() => {
              // Calculate totals
              const totalTraffic = landingPageRows.reduce((sum, lp) => sum + lp.traffic.total, 0)
              const totalTrafficPc = landingPageRows.reduce((sum, lp) => sum + lp.traffic.pc, 0)
              const totalTrafficMobile = landingPageRows.reduce((sum, lp) => sum + lp.traffic.mobile, 0)
              const totalTrafficTablet = landingPageRows.reduce((sum, lp) => sum + lp.traffic.tablet, 0)

              const totalConversion = landingPageRows.reduce((sum, lp) => sum + lp.conversion.total, 0)
              const totalConversionPc = landingPageRows.reduce((sum, lp) => sum + lp.conversion.pc, 0)
              const totalConversionMobile = landingPageRows.reduce((sum, lp) => sum + lp.conversion.mobile, 0)
              const totalConversionTablet = landingPageRows.reduce((sum, lp) => sum + lp.conversion.tablet, 0)

              // Calculate percentages for totals
              const totalTrafficPcPct = totalTraffic > 0 ? Math.round((totalTrafficPc / totalTraffic) * 100) : 0
              const totalTrafficMobilePct = totalTraffic > 0 ? Math.round((totalTrafficMobile / totalTraffic) * 100) : 0
              const totalTrafficTabletPct = totalTraffic > 0 ? Math.round((totalTrafficTablet / totalTraffic) * 100) : 0

              const totalConversionPcPct = totalConversion > 0 ? Math.round((totalConversionPc / totalConversion) * 100) : 0
              const totalConversionMobilePct = totalConversion > 0 ? Math.round((totalConversionMobile / totalConversion) * 100) : 0
              const totalConversionTabletPct = totalConversion > 0 ? Math.round((totalConversionTablet / totalConversion) * 100) : 0

              const totalConversionRate = totalTraffic > 0 ? ((totalConversion / totalTraffic) * 100).toFixed(1) : '0.0'

              return (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-sm text-gray-900" colSpan={2}>
                      합계
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {totalTraffic}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-blue-600">
                      {totalTrafficPc}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalTrafficPcPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {totalTrafficMobile}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalTrafficMobilePct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-purple-600">
                      {totalTrafficTablet}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalTrafficTabletPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      {totalConversion}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalConversionRate}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-blue-600">
                      {totalConversionPc}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalConversionPcPct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-green-600">
                      {totalConversionMobile}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalConversionMobilePct}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-purple-600">
                      {totalConversionTablet}
                      <span className="text-gray-400 text-xs ml-1">
                        ({totalConversionTabletPct}%)
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
      </div>

      {/* UTM Analysis Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-yellow-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            UTM 분석
          </h2>
          <button
            onClick={handleExportUtm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            엑셀 다운로드
          </button>
        </div>

        <div className="p-6">
          {/* Top Row: Source, Medium, Campaign */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {renderUtmCategory('UTM Source', utmData.source)}
            {renderUtmCategory('UTM Medium', utmData.medium)}
            {renderUtmCategory('UTM Campaign', utmData.campaign)}
          </div>

          {/* Bottom Row: Content, Term */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderUtmCategory('UTM Content', utmData.content)}
            {renderUtmCategory('UTM Term', utmData.term)}
          </div>
        </div>
      </div>
    </div>
  )
}
