import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const { code, label, color } = body

    if (!code || !label) {
      return NextResponse.json({ error: { message: 'Code and label are required' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (userProfile.simple_role !== 'admin') {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Get max sort_order
    const { data: maxOrderResult } = await supabase
      .from('lead_statuses')
      .select('sort_order')
      .eq('company_id', userProfile.company_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = (maxOrderResult?.sort_order || 0) + 1

    // Create status
    const { data: status, error } = await supabase
      .from('lead_statuses')
      .insert({
        company_id: userProfile.company_id,
        code: code.toLowerCase().replace(/\s+/g, '_'),
        label,
        color: color || 'gray',
        sort_order: nextSortOrder,
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
    const { id, label, color, sort_order, is_default, is_active } = body

    if (!id) {
      return NextResponse.json({ error: { message: 'Status ID is required' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (userProfile.simple_role !== 'admin') {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, any> = {}
    if (label !== undefined) updateData.label = label
    if (color !== undefined) updateData.color = color
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (is_default !== undefined) updateData.is_default = is_default
    if (is_active !== undefined) updateData.is_active = is_active

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await supabase
        .from('lead_statuses')
        .update({ is_default: false })
        .eq('company_id', userProfile.company_id)
        .neq('id', id)
    }

    // Update status
    const { data: status, error } = await supabase
      .from('lead_statuses')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', userProfile.company_id)
      .select()
      .single()

    if (error) throw error

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
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (userProfile.simple_role !== 'admin') {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Check if status is being used by any leads
    const { data: statusToDelete } = await supabase
      .from('lead_statuses')
      .select('code')
      .eq('id', statusId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!statusToDelete) {
      return NextResponse.json({ error: { message: 'Status not found' } }, { status: 404 })
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
