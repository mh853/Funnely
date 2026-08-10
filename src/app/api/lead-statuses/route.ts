import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/auth/permissions'
import { isValidLeadStatusCategory } from '@/lib/leadStatusCategory'

// GET /api/lead-statuses - 리드 상태 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Get statuses
    const { data: statuses, error } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: statuses || [],
    })
  } catch (error: any) {
    console.error('Get lead statuses error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to get lead statuses' } },
      { status: 500 }
    )
  }
}

// POST /api/lead-statuses - 새 상태 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { code, label, color, category } = body

    if (!code || !label) {
      return NextResponse.json({ error: { message: 'Code and label are required' } }, { status: 400 })
    }

    if (category !== undefined && !isValidLeadStatusCategory(category)) {
      return NextResponse.json({ error: { message: 'Invalid category' } }, { status: 400 })
    }

    // 공백만 '_'로 치환할 뿐 다른 특수문자/이모지/한글은 그대로 통과했다 - 이 code값이
    // URL 쿼리파라미터·필터조건·categoryMap 키 등 앱 곳곳에서 그대로 재사용되므로
    // 형식이 깨지면 여러 화면에 영향을 준다(85차 QA). 추적픽셀 ID와 동일한 안전한
    // 화이트리스트로 제한한다.
    const normalizedCode = code.toLowerCase().replace(/\s+/g, '_')
    if (!/^[a-z0-9_-]{1,50}$/.test(normalizedCode)) {
      return NextResponse.json({ error: { message: '상태 코드는 영문 소문자, 숫자, -, _ 만 사용할 수 있습니다.' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role, role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (!isAdminUser(userProfile)) {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Get max sort_order
    const { data: maxOrderResult } = await supabase
      .from('lead_statuses')
      .select('sort_order')
      .eq('company_id', userProfile.company_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (maxOrderResult?.sort_order || 0) + 1

    // Create status
    const { data: status, error } = await supabase
      .from('lead_statuses')
      .insert({
        company_id: userProfile.company_id,
        code: normalizedCode,
        label,
        color: color || 'gray',
        sort_order: nextSortOrder,
        // 지정 안 하면 DB 기본값(other)으로 들어감 - 통계에서는 일단 "기타"로
        // 잡히고 관리자가 나중에 올바른 범주로 수정할 수 있다.
        category: category || 'other',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: { message: '이미 존재하는 상태 코드입니다.' } }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error: any) {
    console.error('Create lead status error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create lead status' } },
      { status: 500 }
    )
  }
}

// PATCH /api/lead-statuses - 상태 수정
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { id, label, color, sort_order, is_default, is_active, category } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Status ID is required' } }, { status: 400 })
    }

    if (category !== undefined && !isValidLeadStatusCategory(category)) {
      return NextResponse.json({ error: { message: 'Invalid category' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role, role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (!isAdminUser(userProfile)) {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, any> = {}
    if (label !== undefined) updateData.label = label
    if (color !== undefined) updateData.color = color
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_default !== undefined) updateData.is_default = is_default
    if (is_active !== undefined) updateData.is_active = is_active
    if (category !== undefined) updateData.category = category

    // If setting as default, unset other defaults first - 이 업데이트가 실패하면
    // company_id당 하나만 존재해야 하는 unique index(lead_statuses_one_default_per_company)에
    // 걸려 아래 본 업데이트가 대신 에러를 던진다(77차 QA - 이전엔 이 결과를 확인하지
    // 않아 두 관리자가 동시에 다른 상태를 기본값으로 지정하면 기본값이 2개 공존할 수 있었음).
    //
    // 대상 id의 존재/소속 검증보다 이 초기화가 먼저 실행되고 있었다 - id가 유효하지
    // 않거나(예: 다른 탭에서 방금 삭제됨) 다른 회사 소속이면, .neq('id', id) 조건상
    // 이 회사의 모든 실제 행이 is_default=false로 커밋된 뒤에야 본 업데이트가 0건
    // 매치로 404를 반환했다. 트랜잭션이 없어 그 부작용은 롤백되지 않고 그대로 남아
    // 회사에 기본상태가 하나도 없는 상태가 되며, 이는 DELETE의 마지막 기본상태
    // 보호 가드까지 무력화시켰다(85차 QA). 초기화 전에 대상이 이 회사 소속으로
    // 실재하는지 먼저 확인한다.
    if (is_default === true) {
      const { data: targetExists, error: targetCheckError } = await supabase
        .from('lead_statuses')
        .select('id')
        .eq('id', id)
        .eq('company_id', userProfile.company_id)
        .maybeSingle()

      if (targetCheckError) throw targetCheckError
      if (!targetExists) {
        return NextResponse.json(
          { success: false, error: { message: '상태를 찾을 수 없거나 권한이 없습니다.' } },
          { status: 404 }
        )
      }

      const { error: unsetError } = await supabase
        .from('lead_statuses')
        .update({ is_default: false })
        .eq('company_id', userProfile.company_id)
        .neq('id', id)

      if (unsetError) throw unsetError
    }

    // Update status
    const { data: status, error } = await supabase
      .from('lead_statuses')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select()
      .maybeSingle()

    if (error) throw error

    if (!status) {
      return NextResponse.json(
        { success: false, error: { message: '상태를 찾을 수 없거나 권한이 없습니다.' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error: any) {
    console.error('Update lead status error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update lead status' } },
      { status: 500 }
    )
  }
}

// DELETE /api/lead-statuses?id=xxx - 상태 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusId = searchParams.get('id')

    if (!statusId) {
      return NextResponse.json({ error: { message: 'Status ID is required' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role, role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (!isAdminUser(userProfile)) {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Check if status is being used by any leads
    const { data: statusToDelete } = await supabase
      .from('lead_statuses')
      .select('code, is_default')
      .eq('id', statusId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!statusToDelete) {
      return NextResponse.json({ error: { message: 'Status not found' } }, { status: 404 })
    }

    // 기본 상태(is_default)는 신규 리드 생성 시 폴백 코드로 쓰인다
    // (leads/create, landing-pages/submit, sheets/sync 전부 동일 패턴) - 삭제(소프트
    // 포함)를 허용하면 신규 리드가 존재하지 않는 상태값으로 생성될 수 있다(77차 QA).
    // 먼저 다른 상태를 기본값으로 지정한 뒤에만 삭제 가능하도록 막는다.
    if (statusToDelete.is_default) {
      return NextResponse.json(
        { error: { message: '기본 상태는 삭제할 수 없습니다. 먼저 다른 상태를 기본값으로 지정해주세요.' } },
        { status: 400 }
      )
    }

    const { count: leadsUsingStatus } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userProfile.company_id)
      .eq('status', statusToDelete.code)

    if (leadsUsingStatus && leadsUsingStatus > 0) {
      // Soft delete instead of hard delete
      const { error } = await supabase
        .from('lead_statuses')
        .update({ is_active: false })
        .eq('id', statusId)
        .eq('company_id', userProfile.company_id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `${leadsUsingStatus}개의 리드가 이 상태를 사용 중이므로 비활성화 처리되었습니다.`,
        soft_deleted: true,
      })
    }

    // Hard delete if not used
    const { error } = await supabase
      .from('lead_statuses')
      .delete()
      .eq('id', statusId)
      .eq('company_id', userProfile.company_id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: '상태가 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Delete lead status error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete lead status' } },
      { status: 500 }
    )
  }
}
