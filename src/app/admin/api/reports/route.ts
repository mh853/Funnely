import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// GET: 리포트 목록 조회
export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const companyId = searchParams.get('company_id')

    const supabase = await createClient()
    const offset = (page - 1) * limit

    let query = supabase
      .from('generated_reports')
      .select(
        `
        *,
        template:report_templates(id, name, type),
        company:companies!generated_reports_company_id_fkey(id, name),
        generated_by_user:users!generated_reports_generated_by_fkey(id, full_name)
      `,
        { count: 'exact' }
      )
      .order('generated_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: reports, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      reports: reports || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Reports list API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 리포트 생성
export async function POST(request: Request) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const {
      name,
      templateId,
      companyId,
      periodStart,
      periodEnd,
    } = body

    const supabase = await createClient()

    // 현재 사용자 정보 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 리포트 데이터 생성 (실제로는 분석 API를 호출하여 데이터 수집)
    const reportData = {
      generated_at: new Date().toISOString(),
      period: {
        start: periodStart,
        end: periodEnd,
      },
      // 여기에 실제 분석 데이터가 들어감
      summary: {},
      details: {},
    }

    // 리포트 저장
    const { data: report, error } = await supabase
      .from('generated_reports')
      .insert({
        name,
        template_id: templateId,
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        data: reportData,
        generated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Report generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
