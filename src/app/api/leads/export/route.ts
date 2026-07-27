import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptPhone } from '@/lib/encryption/phone'
import { getKSTDayRange } from '@/lib/utils/date'
import { getLeadStatusCategoryMap, getCodesForCategory, isValidLeadStatusCategory } from '@/lib/leadStatusCategory'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userProfile = await getCachedUserProfile(user.id)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Parse search params
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const singleDateParam = searchParams.get('date')
    const landingPageId = searchParams.get('landingPageId')
    const deviceType = searchParams.get('deviceType')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const selectedLeadId = searchParams.get('id')

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    // 단일 날짜 필터 (대시보드 그래프에서 클릭 시) - 가장 높은 우선순위
    // "YYYY-MM-DD"를 new Date()로 직접 파싱하면 UTC 자정으로 해석되어(브라우저는
    // KST 기준으로 보낸 날짜인데) setHours(0,0,0,0)을 서버(UTC)에서 적용해도 여전히
    // KST 하루가 아니라 KST 09:00~다음날 09:00 범위가 되어버린다.
    if (singleDateParam) {
      ;({ start: startDate, end: endDate } = getKSTDayRange(singleDateParam))
    }
    // 직접 입력된 날짜 범위 우선 처리
    else if (startDateParam && endDateParam) {
      startDate = getKSTDayRange(startDateParam).start
      endDate = getKSTDayRange(endDateParam).end
    } else if (dateRange) {
      // 프리셋 날짜 범위 처리
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          endDate = new Date()
          break
        case '14days':
          startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          endDate = new Date()
          break
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          endDate = new Date()
          break
        case 'all':
          startDate = null
          endDate = null
          break
      }
    } else {
      // 기본값: 최근 7일
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = new Date()
    }

    // Build query - 페이지네이션 없이 전체 데이터 가져오기
    let query = supabase
      .from('leads')
      .select(
        `
        *,
        landing_pages (
          id,
          title,
          slug,
          collect_fields
        ),
        call_assigned_user:users!leads_call_assigned_to_fkey(id, full_name),
        counselor_assigned_user:users!leads_counselor_assigned_to_fkey(id, full_name),
        lead_payments (
          id,
          amount,
          payment_date
        )
      `
      )
      .eq('company_id', userProfile.company_id)

    // 특정 리드 ID로 필터링 (캘린더에서 클릭 시)
    if (selectedLeadId) {
      query = query.eq('id', selectedLeadId)
    } else {
      // Apply filters only when not filtering by specific lead ID
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }
      if (endDate) {
        query = query.lt('created_at', endDate.toISOString())
      }

      if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId)
      }

      if (deviceType) {
        query = query.eq('device_type', deviceType)
      }

      if (status) {
        // dashboard/leads/page.tsx와 동일한 규칙: 대시보드 드릴다운 링크는 범주
        // 토큰을, 목록 드롭다운은 실제 코드를 보낸다 - 커스텀 상태 코드도 같은
        // 범주면 함께 걸리도록 코드 목록으로 확장한다.
        if (isValidLeadStatusCategory(status)) {
          const categoryMap = await getLeadStatusCategoryMap(supabase, userProfile.company_id)
          const codes = getCodesForCategory(categoryMap, status)
          if (status === 'new') codes.push('pending')
          query = query.in('status', codes.length > 0 ? codes : [status])
        } else {
          query = query.eq('status', status)
        }
      }

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      if (assignedTo) {
        query = query.eq('call_assigned_to', assignedTo)
      }
    }

    // Get all data without pagination
    const { data: leads, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Leads export error:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // 서버에서 전화번호 복호화
    const decryptedLeads = (leads || []).map(lead => ({
      ...lead,
      phone: lead.phone ? decryptPhone(lead.phone) : lead.phone
    }))

    return NextResponse.json({ leads: decryptedLeads })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
