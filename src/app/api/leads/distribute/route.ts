import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/leads/distribute - 미배정 리드 수동 분배
 *
 * 설계 문서: claudedocs/analytics-conversion-rate-fix.md
 *
 * 기능:
 * - call_assigned_to가 NULL인 리드를 조회
 * - simple_role = 'user'인 활성 사용자에게 균등 분배
 * - Round Robin 방식으로 공정하게 배정
 *
 * 권한: 인증된 사용자 (관리자 권한 체크는 선택사항)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ========================================================================
    // 1. 인증 확인
    // ========================================================================
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // ========================================================================
    // 2. 사용자 프로필 및 권한 확인
    // ========================================================================
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      console.error('User profile error:', profileError)
      return NextResponse.json(
        { error: { message: 'User profile not found' } },
        { status: 404 }
      )
    }

    // company_id 유효성 검증
    if (!userProfile.company_id) {
      console.error('Missing company_id for user:', user.id)
      return NextResponse.json(
        {
          error: {
            message: 'Company ID not found. Please ensure your account is properly configured.'
          }
        },
        { status: 400 }
      )
    }

    const companyId = userProfile.company_id

    // 디버깅 로그 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log('Distribution request:', {
        userId: user.id,
        companyId,
        role: userProfile.simple_role
      })
    }

    // (선택) 관리자 권한 체크 - 필요시 주석 해제
    // if (userProfile.simple_role !== 'admin') {
    //   return NextResponse.json(
    //     { error: { message: '관리자만 리드 분배가 가능합니다.' } },
    //     { status: 403 }
    //   )
    // }

    // ========================================================================
    // 3. 미배정 리드 조회 (call_assigned_to가 NULL)
    // ========================================================================
    const { data: unassignedLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('company_id', companyId)
      .is('call_assigned_to', null)
      .order('created_at', { ascending: true }) // 오래된 순서대로 배정

    if (leadsError) {
      console.error('Unassigned leads query error:', leadsError)
      throw new Error('미배정 리드 조회 실패')
    }

    // 미배정 리드가 없는 경우
    if (!unassignedLeads || unassignedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: '미배정 리드가 없습니다.',
          distributed: 0,
          userCount: 0,
          stats: [],
        },
      })
    }

    // ========================================================================
    // 4. 일반 사용자 목록 조회 (simple_role = 'user')
    // ========================================================================
    const { data: regularUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('simple_role', 'user')
      .eq('is_active', true)
      .order('created_at', { ascending: true }) // 먼저 가입한 순서대로

    if (usersError) {
      console.error('Regular users query error:', usersError)
      throw new Error('일반 사용자 조회 실패')
    }

    if (!regularUsers || regularUsers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '배정 가능한 일반 사용자가 없습니다.' },
        },
        { status: 400 }
      )
    }

    // 디버깅: 일반 사용자 목록 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('Regular users found:', regularUsers.length)
      console.log('User IDs:', regularUsers.map(u => ({ id: u.id, name: u.full_name, idType: typeof u.id })))
    }

    // ========================================================================
    // 5. Round Robin 분배 알고리즘
    // ========================================================================
    const userCount = regularUsers.length
    const assignments: Array<{
      leadId: string
      userId: string
      userName: string
    }> = []

    for (let i = 0; i < unassignedLeads.length; i++) {
      const lead = unassignedLeads[i]
      const userIndex = i % userCount // Round Robin: 0, 1, 2, ..., 0, 1, 2, ...
      const user = regularUsers[userIndex]

      // userId 유효성 검증
      if (!user || !user.id) {
        console.error('Invalid user at index:', userIndex, user)
        throw new Error(`배정 대상 사용자 정보가 유효하지 않습니다 (index: ${userIndex})`)
      }

      assignments.push({
        leadId: lead.id,
        userId: user.id,
        userName: user.full_name,
      })
    }

    // ========================================================================
    // 6. 일괄 업데이트 실행 (Promise.all로 병렬 처리)
    // ========================================================================
    // 디버깅: assignments 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('First 3 assignments:', assignments.slice(0, 3).map(a => ({
        leadId: a.leadId,
        userId: a.userId,
        userIdType: typeof a.userId,
        userIdValue: a.userId,
        userName: a.userName
      })))
    }

    const updatePromises = assignments.map(async ({ leadId, userId }) => {
      return supabase
        .from('leads')
        .update({ call_assigned_to: userId })
        .eq('id', leadId)
        .is('call_assigned_to', null) // 동시성 제어: 이미 배정된 리드는 스킵 (is() 메서드 사용)
    })

    const results = await Promise.all(updatePromises)

    // 오류 확인
    const errors = results.filter((r) => r.error)
    if (errors.length > 0) {
      console.error('Distribution errors:', errors)
      throw new Error(`${errors.length}개 리드 분배 실패`)
    }

    // ========================================================================
    // 7. 분배 통계 계산
    // ========================================================================
    const distributionStats = regularUsers.map((user) => {
      const assignedCount = assignments.filter((a) => a.userId === user.id).length
      return {
        userId: user.id,
        userName: user.full_name,
        assignedCount,
      }
    })

    // ========================================================================
    // 8. 성공 응답
    // ========================================================================
    return NextResponse.json({
      success: true,
      data: {
        message: `${unassignedLeads.length}개의 DB가 ${userCount}명의 담당자에게 분배되었습니다.`,
        distributed: unassignedLeads.length,
        userCount,
        stats: distributionStats,
      },
    })
  } catch (error: any) {
    console.error('Lead distribution error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Lead distribution failed' },
      },
      { status: 500 }
    )
  }
}
