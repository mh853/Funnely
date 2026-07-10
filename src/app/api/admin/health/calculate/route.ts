import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'
import { calculateHealthScore, toCustomerHealthScoreRow } from '@/lib/health/calculateHealthScore'

/**
 * POST /api/admin/health/calculate
 * 건강도 점수 계산 및 저장
 * Body: { companyId?: string } - 없으면 모든 회사 계산
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(
      adminUser.user.id,
      PERMISSIONS.CALCULATE_HEALTH_SCORES
    )

    // 3. 요청 바디 파싱
    const body = await request.json()
    const { companyId } = body

    // 4. Supabase 클라이언트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results = []
    let errors = []

    if (companyId) {
      // 특정 회사만 계산
      try {
        const result = await calculateAndSaveHealthScore(
          companyId,
          supabase,
          adminUser.user.id,
          request
        )
        results.push(result)
      } catch (error) {
        console.error(
          `[Health Calculate] Error for company ${companyId}:`,
          error
        )
        errors.push({
          companyId,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    } else {
      // 모든 활성 회사 계산
      // companies 테이블에는 'status' 컬럼이 없다 (is_active boolean으로 관리됨).
      // 그대로 두면 존재하지 않는 컬럼 에러로 매번 실패했다.
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)

      if (companiesError) {
        console.error('[Health Calculate] Companies query error:', companiesError)
        return NextResponse.json(
          { error: 'Failed to fetch companies' },
          { status: 500 }
        )
      }

      // 각 회사별 계산 (병렬 처리)
      const calculations = (companies || []).map(async (company) => {
        try {
          const result = await calculateAndSaveHealthScore(
            company.id,
            supabase,
            adminUser.user.id,
            request
          )
          return { success: true, result }
        } catch (error) {
          console.error(
            `[Health Calculate] Error for company ${company.id}:`,
            error
          )
          return {
            success: false,
            error: {
              companyId: company.id,
              companyName: company.name,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
          }
        }
      })

      const calculationResults = await Promise.all(calculations)

      results.push(
        ...calculationResults
          .filter((r) => r.success)
          .map((r) => r.result as any)
      )
      errors = calculationResults
        .filter((r) => !r.success)
        .map((r) => r.error as any)
    }

    // 5. 응답
    return NextResponse.json({
      success: true,
      calculated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Health Calculate] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function: 회사 건강도 점수 계산 및 저장
 */
async function calculateAndSaveHealthScore(
  companyId: string,
  supabase: any,
  adminUserId: string,
  request: NextRequest
) {
  // 회사 존재 확인
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    throw new Error('Company not found')
  }

  // 건강도 점수 계산
  const healthScore = await calculateHealthScore(companyId, supabase)
  const row = toCustomerHealthScoreRow(companyId, healthScore)

  // 오늘 날짜의 기존 점수 확인
  // 실제 테이블명은 'health_scores'가 아니라 'customer_health_scores'이다.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existingScore } = await supabase
    .from('customer_health_scores')
    .select('id')
    .eq('company_id', companyId)
    .gte('calculated_at', today.toISOString())
    .lt('calculated_at', tomorrow.toISOString())
    .single()

  if (existingScore) {
    // 기존 점수 업데이트
    const { data: updatedScore, error: updateError } = await supabase
      .from('customer_health_scores')
      .update(row)
      .eq('id', existingScore.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update health score: ${updateError.message}`)
    }

    // 감사 로그
    await createAuditLog(request, {
      userId: adminUserId,
      action: AUDIT_ACTIONS.HEALTH_SCORE_UPDATE,
      entityType: 'health_score',
      entityId: updatedScore.id,
      companyId,
      metadata: {
        companyName: company.name,
        overallScore: healthScore.overall_score,
        healthStatus: healthScore.health_status,
        riskFactorCount: healthScore.risk_factors.length,
      },
    })

    return {
      companyId,
      companyName: company.name,
      healthScoreId: updatedScore.id,
      overallScore: healthScore.overall_score,
      healthStatus: healthScore.health_status,
      action: 'updated',
    }
  } else {
    // 새 점수 생성
    const { data: newScore, error: insertError } = await supabase
      .from('customer_health_scores')
      .insert(row)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to insert health score: ${insertError.message}`)
    }

    // 감사 로그
    await createAuditLog(request, {
      userId: adminUserId,
      action: AUDIT_ACTIONS.HEALTH_SCORE_CREATE,
      entityType: 'health_score',
      entityId: newScore.id,
      companyId,
      metadata: {
        companyName: company.name,
        overallScore: healthScore.overall_score,
        healthStatus: healthScore.health_status,
        riskFactorCount: healthScore.risk_factors.length,
      },
    })

    return {
      companyId,
      companyName: company.name,
      healthScoreId: newScore.id,
      overallScore: healthScore.overall_score,
      healthStatus: healthScore.health_status,
      action: 'created',
    }
  }
}
