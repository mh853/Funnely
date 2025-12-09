import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export const revalidate = 30

interface ReportsPageProps {
  searchParams: Promise<{
    year?: string
    month?: string
    department?: string
    assignedTo?: string
  }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const now = new Date()
  const selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

  // 선택된 월의 시작일과 종료일
  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0)
  const daysInMonth = selectedMonthEnd.getDate()

  const queryStart = selectedMonthStart.toISOString()
  const queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()

  // 팀원 목록 조회 (부서 정보 포함)
  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name, department')
    .eq('company_id', userProfile.company_id)
    .eq('is_active', true)
    .order('full_name')

  // 부서 목록 추출
  const departments = Array.from(
    new Set(
      (teamMembers || [])
        .map((m) => m.department)
        .filter((d): d is string => Boolean(d))
    )
  ).sort()

  // 리드 데이터 조회 (담당자 정보 포함)
  let leadsQuery = supabase
    .from('leads')
    .select(`
      id,
      created_at,
      status,
      device_type,
      call_assigned_to
    `)
    .eq('company_id', userProfile.company_id)
    .gte('created_at', queryStart)
    .lt('created_at', queryEnd)
    .order('created_at', { ascending: true })

  // 담당자 필터
  if (params.assignedTo) {
    leadsQuery = leadsQuery.eq('call_assigned_to', params.assignedTo)
  }

  const { data: allLeads } = await leadsQuery

  // 부서 필터가 있는 경우 해당 부서 사용자 ID 목록으로 필터링
  let filteredLeads = allLeads || []
  if (params.department && teamMembers) {
    const departmentUserIds = teamMembers
      .filter((m) => m.department === params.department)
      .map((m) => m.id)
    filteredLeads = filteredLeads.filter(
      (lead) => lead.call_assigned_to && departmentUserIds.includes(lead.call_assigned_to)
    )
  }

  // 결제 데이터 조회
  const { data: paymentData } = await supabase
    .from('lead_payments')
    .select('lead_id, amount, leads!inner(created_at)')
    .eq('company_id', userProfile.company_id)
    .gte('leads.created_at', queryStart)
    .lt('leads.created_at', queryEnd)

  // 날짜별 결과 집계
  const resultsByDate: Record<string, any> = {}

  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const dateStr = leadDate.toISOString().split('T')[0]

    if (!resultsByDate[dateStr]) {
      resultsByDate[dateStr] = {
        date: dateStr,
        total: 0,
        pending: 0,
        rejected: 0,
        inProgress: 0,
        completed: 0,
        contractCompleted: 0,
        needsFollowUp: 0,
        other: 0,
        pcCount: 0,
        mobileCount: 0,
        paymentAmount: 0,
        paymentCount: 0,
      }
    }

    resultsByDate[dateStr].total++

    // Device type
    const deviceType = lead.device_type || 'unknown'
    if (deviceType === 'pc') resultsByDate[dateStr].pcCount++
    else if (deviceType === 'mobile') resultsByDate[dateStr].mobileCount++

    // Status
    const status = lead.status || 'pending'
    if (status === 'new' || status === 'pending') resultsByDate[dateStr].pending++
    else if (status === 'rejected') resultsByDate[dateStr].rejected++
    else if (status === 'contacted' || status === 'qualified') resultsByDate[dateStr].inProgress++
    else if (status === 'converted') resultsByDate[dateStr].completed++
    else if (status === 'contract_completed') resultsByDate[dateStr].contractCompleted++
    else if (status === 'needs_followup') resultsByDate[dateStr].needsFollowUp++
    else resultsByDate[dateStr].other++
  })

  // 결제 데이터 집계
  paymentData?.forEach((payment: any) => {
    const leadCreatedAt = payment.leads?.created_at
    if (leadCreatedAt) {
      const paymentDate = new Date(leadCreatedAt)
      const dateStr = paymentDate.toISOString().split('T')[0]
      if (resultsByDate[dateStr]) {
        resultsByDate[dateStr].paymentAmount += payment.amount || 0
        resultsByDate[dateStr].paymentCount += 1
      }
    }
  })

  // 정렬된 결과 (최신순)
  const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
    b.date.localeCompare(a.date)
  )

  // 요약 통계
  const summary = {
    totalDB: filteredLeads.length,
    completed: filteredLeads.filter(
      (l) => l.status === 'converted' || l.status === 'contract_completed'
    ).length,
    contractCompleted: filteredLeads.filter((l) => l.status === 'contract_completed').length,
    conversionRate:
      filteredLeads.length > 0
        ? (
            (filteredLeads.filter(
              (l) => l.status === 'converted' || l.status === 'contract_completed'
            ).length /
              filteredLeads.length) *
            100
          ).toFixed(1)
        : '0',
  }

  return (
    <ReportsClient
      resultRows={resultRows}
      summary={summary}
      departments={departments}
      teamMembers={teamMembers || []}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      selectedDepartment={params.department || ''}
      selectedAssignedTo={params.assignedTo || ''}
      daysInMonth={daysInMonth}
    />
  )
}
