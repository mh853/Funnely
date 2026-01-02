import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'
import UpgradeNotice from '@/components/UpgradeNotice'
import { hasFeatureAccess } from '@/lib/subscription-access'

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

  // 기능 접근 권한 체크
  const hasAccess = await hasFeatureAccess(userProfile.company_id, 'reports')
  if (!hasAccess) {
    return <UpgradeNotice featureName="DB 리포트" requiredPlan="개인 사용자 + 스케줄 관리 기능" />
  }

  const now = new Date()

  // "전체" 필터는 명시적으로 year='all' 또는 month='all'로 표시
  const isAllMonths = params.year === 'all' || params.month === 'all'

  // 파라미터가 없으면 현재 월로 리다이렉트
  if (!params.year && !params.month) {
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const queryParams = new URLSearchParams()
    queryParams.set('year', currentYear.toString())
    queryParams.set('month', currentMonth.toString())
    if (params.department) queryParams.set('department', params.department)
    if (params.assignedTo) queryParams.set('assignedTo', params.assignedTo)
    redirect(`/dashboard/reports?${queryParams.toString()}`)
  }

  const selectedYear = isAllMonths ? now.getFullYear() : parseInt(params.year!)
  const selectedMonth = isAllMonths ? now.getMonth() + 1 : parseInt(params.month!)

  // 선택된 월의 시작일과 종료일
  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0)
  const daysInMonth = selectedMonthEnd.getDate()

  const queryStart = isAllMonths ? undefined : selectedMonthStart.toISOString()
  const queryEnd = isAllMonths ? undefined : new Date(selectedYear, selectedMonth, 1).toISOString()

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

  // "전체" 필터가 아닌 경우에만 날짜 범위 필터 적용
  if (!isAllMonths && queryStart && queryEnd) {
    leadsQuery = leadsQuery.gte('created_at', queryStart).lt('created_at', queryEnd)
  }

  leadsQuery = leadsQuery.order('created_at', { ascending: true })

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
  let paymentQuery = supabase
    .from('lead_payments')
    .select('lead_id, amount, leads!inner(created_at)')
    .eq('company_id', userProfile.company_id)

  // "전체" 필터가 아닌 경우에만 날짜 범위 필터 적용
  if (!isAllMonths && queryStart && queryEnd) {
    paymentQuery = paymentQuery.gte('leads.created_at', queryStart).lt('leads.created_at', queryEnd)
  }

  const { data: paymentData } = await paymentQuery

  // 날짜별 결과 집계
  const resultsByDate: Record<string, any> = {}

  // "전체" 필터인 경우, 리드 데이터에서 모든 고유 날짜를 추출하여 초기화
  if (isAllMonths) {
    // 모든 리드의 날짜를 추출
    const allDates = new Set<string>()
    filteredLeads.forEach((lead) => {
      const leadDate = new Date(lead.created_at)
      const dateStr = leadDate.toISOString().split('T')[0]
      allDates.add(dateStr)
    })

    // 각 날짜별로 초기화
    allDates.forEach((dateStr) => {
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
    })
  } else {
    // 1단계: 선택된 월의 모든 날짜 초기화 (1일 ~ 말일)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
  }

  // 2단계: 실제 리드 데이터로 업데이트
  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const dateStr = leadDate.toISOString().split('T')[0]

    // 이미 초기화되어 있으므로 존재 체크만
    if (resultsByDate[dateStr]) {
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
    }
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

  // 정렬된 결과 (오름차순 - 오래된 날짜 위로)
  let resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  )

  // "전체" 필터인 경우, 월별로 그룹화
  if (isAllMonths) {
    const monthlyResults: Record<string, any> = {}

    resultRows.forEach((row: any) => {
      const month = row.date.substring(0, 7) // YYYY-MM 형식으로 월 추출

      if (!monthlyResults[month]) {
        monthlyResults[month] = {
          date: month, // YYYY-MM 형식
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

      // 월별 합계 계산
      monthlyResults[month].total += row.total
      monthlyResults[month].pending += row.pending
      monthlyResults[month].rejected += row.rejected
      monthlyResults[month].inProgress += row.inProgress
      monthlyResults[month].completed += row.completed
      monthlyResults[month].contractCompleted += row.contractCompleted
      monthlyResults[month].needsFollowUp += row.needsFollowUp
      monthlyResults[month].other += row.other
      monthlyResults[month].pcCount += row.pcCount
      monthlyResults[month].mobileCount += row.mobileCount
      monthlyResults[month].paymentAmount += row.paymentAmount
      monthlyResults[month].paymentCount += row.paymentCount
    })

    resultRows = Object.values(monthlyResults).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    )
  }

  // 부서별 집계
  const resultsByDepartment: Record<string, any> = {}

  filteredLeads.forEach((lead) => {
    // 담당자의 부서 찾기
    const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
    const deptName = assignedUser?.department || '미배정'

    if (!resultsByDepartment[deptName]) {
      resultsByDepartment[deptName] = {
        department: deptName,
        total: 0,
        pending: 0,
        rejected: 0,
        inProgress: 0,
        completed: 0,
        contractCompleted: 0,
        needsFollowUp: 0,
        other: 0,
        paymentAmount: 0,
        paymentCount: 0,
      }
    }

    resultsByDepartment[deptName].total++

    // Status
    const status = lead.status || 'pending'
    if (status === 'new' || status === 'pending') resultsByDepartment[deptName].pending++
    else if (status === 'rejected') resultsByDepartment[deptName].rejected++
    else if (status === 'contacted' || status === 'qualified') resultsByDepartment[deptName].inProgress++
    else if (status === 'converted') resultsByDepartment[deptName].completed++
    else if (status === 'contract_completed') resultsByDepartment[deptName].contractCompleted++
    else if (status === 'needs_followup') resultsByDepartment[deptName].needsFollowUp++
    else resultsByDepartment[deptName].other++
  })

  // 부서별 결제 데이터 집계
  paymentData?.forEach((payment: any) => {
    const leadId = payment.lead_id
    const lead = filteredLeads.find(l => l.id === leadId)
    if (lead) {
      const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
      const deptName = assignedUser?.department || '미배정'
      if (resultsByDepartment[deptName]) {
        resultsByDepartment[deptName].paymentAmount += payment.amount || 0
        resultsByDepartment[deptName].paymentCount += 1
      }
    }
  })

  const departmentRows = Object.values(resultsByDepartment).sort((a: any, b: any) =>
    b.total - a.total
  )

  // 부서별 월별 데이터 생성
  const departmentMonthlyData: Record<string, any[]> = {}

  if (isAllMonths) {
    // "전체" 필터인 경우, 실제 리드 데이터에서 날짜를 추출하여 초기화
    const allDates = Object.keys(resultsByDate).sort()

    departments.forEach((dept) => {
      departmentMonthlyData[dept] = allDates.map((dateStr) => ({
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
      }))
    })

    // 미배정 부서도 초기화
    departmentMonthlyData['미배정'] = allDates.map((dateStr) => ({
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
    }))
  } else {
    // 선택된 월의 모든 날짜 초기화
    departments.forEach((dept) => {
      departmentMonthlyData[dept] = []

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        departmentMonthlyData[dept].push({
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
        })
      }
    })

    // 미배정 부서도 초기화
    departmentMonthlyData['미배정'] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      departmentMonthlyData['미배정'].push({
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
      })
    }
  }

  // 리드 데이터로 부서별 월별 데이터 업데이트
  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const dateStr = leadDate.toISOString().split('T')[0]
    const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
    const deptName = assignedUser?.department || '미배정'

    if (departmentMonthlyData[deptName]) {
      const dayData = departmentMonthlyData[deptName].find(d => d.date === dateStr)
      if (dayData) {
        dayData.total++

        // Device type
        const deviceType = lead.device_type || 'unknown'
        if (deviceType === 'pc') dayData.pcCount++
        else if (deviceType === 'mobile') dayData.mobileCount++

        // Status
        const status = lead.status || 'pending'
        if (status === 'new' || status === 'pending') dayData.pending++
        else if (status === 'rejected') dayData.rejected++
        else if (status === 'contacted' || status === 'qualified') dayData.inProgress++
        else if (status === 'converted') dayData.completed++
        else if (status === 'contract_completed') dayData.contractCompleted++
        else if (status === 'needs_followup') dayData.needsFollowUp++
        else dayData.other++
      }
    }
  })

  // 부서별 월별 결제 데이터 집계
  paymentData?.forEach((payment: any) => {
    const leadId = payment.lead_id
    const lead = filteredLeads.find(l => l.id === leadId)
    if (lead) {
      const leadCreatedAt = payment.leads?.created_at
      if (leadCreatedAt) {
        const paymentDate = new Date(leadCreatedAt)
        const dateStr = paymentDate.toISOString().split('T')[0]
        const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
        const deptName = assignedUser?.department || '미배정'

        if (departmentMonthlyData[deptName]) {
          const dayData = departmentMonthlyData[deptName].find(d => d.date === dateStr)
          if (dayData) {
            dayData.paymentAmount += payment.amount || 0
            dayData.paymentCount += 1
          }
        }
      }
    }
  })

  // 담당자별 집계
  const resultsByStaff: Record<string, any> = {}

  filteredLeads.forEach((lead) => {
    const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
    const staffId = lead.call_assigned_to || 'unassigned'
    const staffName = assignedUser?.full_name || '미배정'
    const staffDept = assignedUser?.department || ''

    if (!resultsByStaff[staffId]) {
      resultsByStaff[staffId] = {
        staffId,
        staffName,
        department: staffDept,
        total: 0,
        pending: 0,
        rejected: 0,
        inProgress: 0,
        completed: 0,
        contractCompleted: 0,
        needsFollowUp: 0,
        other: 0,
        paymentAmount: 0,
        paymentCount: 0,
      }
    }

    resultsByStaff[staffId].total++

    // Status
    const status = lead.status || 'pending'
    if (status === 'new' || status === 'pending') resultsByStaff[staffId].pending++
    else if (status === 'rejected') resultsByStaff[staffId].rejected++
    else if (status === 'contacted' || status === 'qualified') resultsByStaff[staffId].inProgress++
    else if (status === 'converted') resultsByStaff[staffId].completed++
    else if (status === 'contract_completed') resultsByStaff[staffId].contractCompleted++
    else if (status === 'needs_followup') resultsByStaff[staffId].needsFollowUp++
    else resultsByStaff[staffId].other++
  })

  // 담당자별 결제 데이터 집계
  paymentData?.forEach((payment: any) => {
    const leadId = payment.lead_id
    const lead = filteredLeads.find(l => l.id === leadId)
    if (lead) {
      const staffId = lead.call_assigned_to || 'unassigned'
      if (resultsByStaff[staffId]) {
        resultsByStaff[staffId].paymentAmount += payment.amount || 0
        resultsByStaff[staffId].paymentCount += 1
      }
    }
  })

  const staffRows = Object.values(resultsByStaff).sort((a: any, b: any) =>
    b.total - a.total
  )

  // 담당자별 월별 데이터 생성
  const staffMonthlyData: Record<string, any[]> = {}

  if (isAllMonths) {
    // "전체" 필터인 경우, 실제 리드 데이터에서 날짜를 추출하여 초기화
    const allDates = Object.keys(resultsByDate).sort()

    Object.keys(resultsByStaff).forEach((staffId) => {
      staffMonthlyData[staffId] = allDates.map((dateStr) => ({
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
      }))
    })
  } else {
    // 선택된 월의 모든 날짜 초기화
    Object.keys(resultsByStaff).forEach((staffId) => {
      staffMonthlyData[staffId] = []

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        staffMonthlyData[staffId].push({
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
        })
      }
    })
  }

  // 리드 데이터로 담당자별 월별 데이터 업데이트
  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const dateStr = leadDate.toISOString().split('T')[0]
    const staffId = lead.call_assigned_to || 'unassigned'

    if (staffMonthlyData[staffId]) {
      const dayData = staffMonthlyData[staffId].find(d => d.date === dateStr)
      if (dayData) {
        dayData.total++

        // Device type
        const deviceType = lead.device_type || 'unknown'
        if (deviceType === 'pc') dayData.pcCount++
        else if (deviceType === 'mobile') dayData.mobileCount++

        // Status
        const status = lead.status || 'pending'
        if (status === 'new' || status === 'pending') dayData.pending++
        else if (status === 'rejected') dayData.rejected++
        else if (status === 'contacted' || status === 'qualified') dayData.inProgress++
        else if (status === 'converted') dayData.completed++
        else if (status === 'contract_completed') dayData.contractCompleted++
        else if (status === 'needs_followup') dayData.needsFollowUp++
        else dayData.other++
      }
    }
  })

  // 담당자별 월별 결제 데이터 집계
  paymentData?.forEach((payment: any) => {
    const leadId = payment.lead_id
    const lead = filteredLeads.find(l => l.id === leadId)
    if (lead) {
      const leadCreatedAt = payment.leads?.created_at
      if (leadCreatedAt) {
        const paymentDate = new Date(leadCreatedAt)
        const dateStr = paymentDate.toISOString().split('T')[0]
        const staffId = lead.call_assigned_to || 'unassigned'

        if (staffMonthlyData[staffId]) {
          const dayData = staffMonthlyData[staffId].find(d => d.date === dateStr)
          if (dayData) {
            dayData.paymentAmount += payment.amount || 0
            dayData.paymentCount += 1
          }
        }
      }
    }
  })

  // "전체" 필터인 경우, 부서별/담당자별 월별 데이터도 월별로 그룹화
  if (isAllMonths) {
    // 부서별 월별 데이터 그룹화
    Object.keys(departmentMonthlyData).forEach((deptName) => {
      const dailyData = departmentMonthlyData[deptName]
      const monthlyResults: Record<string, any> = {}

      dailyData.forEach((row: any) => {
        const month = row.date.substring(0, 7) // YYYY-MM

        if (!monthlyResults[month]) {
          monthlyResults[month] = {
            date: month,
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

        monthlyResults[month].total += row.total
        monthlyResults[month].pending += row.pending
        monthlyResults[month].rejected += row.rejected
        monthlyResults[month].inProgress += row.inProgress
        monthlyResults[month].completed += row.completed
        monthlyResults[month].contractCompleted += row.contractCompleted
        monthlyResults[month].needsFollowUp += row.needsFollowUp
        monthlyResults[month].other += row.other
        monthlyResults[month].pcCount += row.pcCount
        monthlyResults[month].mobileCount += row.mobileCount
        monthlyResults[month].paymentAmount += row.paymentAmount
        monthlyResults[month].paymentCount += row.paymentCount
      })

      departmentMonthlyData[deptName] = Object.values(monthlyResults).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      )
    })

    // 담당자별 월별 데이터 그룹화
    Object.keys(staffMonthlyData).forEach((staffId) => {
      const dailyData = staffMonthlyData[staffId]
      const monthlyResults: Record<string, any> = {}

      dailyData.forEach((row: any) => {
        const month = row.date.substring(0, 7) // YYYY-MM

        if (!monthlyResults[month]) {
          monthlyResults[month] = {
            date: month,
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

        monthlyResults[month].total += row.total
        monthlyResults[month].pending += row.pending
        monthlyResults[month].rejected += row.rejected
        monthlyResults[month].inProgress += row.inProgress
        monthlyResults[month].completed += row.completed
        monthlyResults[month].contractCompleted += row.contractCompleted
        monthlyResults[month].needsFollowUp += row.needsFollowUp
        monthlyResults[month].other += row.other
        monthlyResults[month].pcCount += row.pcCount
        monthlyResults[month].mobileCount += row.mobileCount
        monthlyResults[month].paymentAmount += row.paymentAmount
        monthlyResults[month].paymentCount += row.paymentCount
      })

      staffMonthlyData[staffId] = Object.values(monthlyResults).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      )
    })
  }

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
      departmentRows={departmentRows}
      staffRows={staffRows}
      departmentMonthlyData={departmentMonthlyData}
      staffMonthlyData={staffMonthlyData}
      summary={summary}
      departments={departments}
      teamMembers={teamMembers || []}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      selectedDepartment={params.department || ''}
      selectedAssignedTo={params.assignedTo || ''}
      daysInMonth={daysInMonth}
      isAllMonths={isAllMonths}
    />
  )
}
