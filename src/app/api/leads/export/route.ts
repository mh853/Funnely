import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptPhone } from '@/lib/encryption/phone'
import { getKSTDayRange } from '@/lib/utils/date'
import { getLeadStatusCategoryMap, getCodesForCategory, isValidLeadStatusCategory } from '@/lib/leadStatusCategory'
import { escapeIlike } from '@/lib/utils/search'

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
    // 화면(LeadsClient.tsx)은 콜/상담 담당자를 callAssignedTo/counselorAssignedTo로
    // URL에 싣는데, 이 export 라우트는 다른 이름(assignedTo)만 읽고 있어 담당자
    // 필터를 건 상태로 내보내기를 눌러도 그 필터가 조용히 무시되고 있었다(83차 QA).
    const callAssignedTo = searchParams.get('callAssignedTo') || searchParams.get('assignedTo')
    const counselorAssignedTo = searchParams.get('counselorAssignedTo')
    const search = searchParams.get('search')
    const selectedLeadId = searchParams.get('id')
    // 목록 화면(page.tsx)엔 있는 결제완료 필터가 여기엔 없어, 목록에서
    // "결제완료"로 걸러놓고 엑셀 내보내기를 누르면 필터가 조용히 무시되고
    // 전체 데이터가 나가고 있었다(노션 QA 접수 #23).
    const paymentComplete = searchParams.get('paymentComplete') === '1'

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
        lead_payments${paymentComplete ? '!inner' : ''} (
          id,
          amount,
          payment_date,
          notes
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
        query = query.ilike('name', `%${escapeIlike(search)}%`)
      }

      if (callAssignedTo) {
        query = query.eq('call_assigned_to', callAssignedTo)
      }

      if (counselorAssignedTo) {
        query = query.eq('counselor_assigned_to', counselorAssignedTo)
      }
    }

    // 페이지네이션 없이 전체 데이터 가져오기 - PostgREST는 range()/limit() 없이
    // 요청해도 supabase/config.toml의 max_rows(1000)를 암묵적으로 적용해 결과를
    // 잘라버리므로, range()로 직접 배치 반복 조회해 진짜 전체 데이터를 가져온다.
    const orderedQuery = query.order('created_at', { ascending: false })

    const BATCH_SIZE = 1000 // PostgREST max_rows와 동일하게 맞춤
    const MAX_TOTAL_ROWS = 20000 // 메모리/응답시간 보호용 상한

    const allLeads: any[] = []
    let truncated = false
    let offset = 0

    while (true) {
      const { data: batch, error } = await orderedQuery.range(offset, offset + BATCH_SIZE - 1)

      if (error) {
        console.error('Leads export error:', error)
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
      }

      if (!batch || batch.length === 0) {
        break
      }

      allLeads.push(...batch)

      if (batch.length < BATCH_SIZE) {
        // 더 가져올 데이터 없음 (마지막 배치)
        break
      }

      if (allLeads.length >= MAX_TOTAL_ROWS) {
        // 안전장치 - 과도한 메모리/응답시간 사용 방지
        truncated = true
        break
      }

      offset += BATCH_SIZE
    }

    // 서버에서 전화번호 복호화
    const decryptedLeads = allLeads.map(lead => ({
      ...lead,
      phone: lead.phone ? decryptPhone(lead.phone) : lead.phone
    }))

    return NextResponse.json({
      leads: decryptedLeads,
      truncated,
      totalFetched: decryptedLeads.length,
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
