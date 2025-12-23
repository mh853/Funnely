import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptPhone } from '@/lib/encryption/phone'

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
    if (singleDateParam) {
      startDate = new Date(singleDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(singleDateParam)
      endDate.setHours(23, 59, 59, 999)
    }
    // 직접 입력된 날짜 범위 우선 처리
    else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
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
        query = query.lte('created_at', endDate.toISOString())
      }

      if (landingPageId) {
        query = query.eq('landing_page_id', landingPageId)
      }

      if (deviceType) {
        query = query.eq('device_type', deviceType)
      }

      if (status) {
        if (status === 'new') {
          query = query.in('status', ['new', 'pending'])
        } else if (status === 'contacted') {
          query = query.in('status', ['contacted', 'qualified'])
        } else {
          query = query.eq('status', status)
        }
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
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
