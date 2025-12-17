import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import {
  FeatureAnalysis,
  CompanyFeatureAnalysis,
  TRACKED_FEATURES,
  FeatureUsage,
} from '@/types/features'
import { generateFeatureRecommendations } from '@/lib/analytics/feature-recommendations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params

    // 1. 관리자 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. 회사 정보 조회
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // 5. 회사의 사용자 수 조회
    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const companyUserCount = userCount || 1

    // 6. 기능 사용 데이터 조회
    const { data: featureUsageData, error: usageError } = await supabase
      .from('feature_usage')
      .select('*')
      .eq('company_id', companyId)

    if (usageError) {
      console.error('Error fetching feature usage:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch feature usage' },
        { status: 500 }
      )
    }

    // 7. 모든 추적 기능에 대한 분석 데이터 생성
    const usageMap = new Map<string, FeatureUsage>()
    featureUsageData?.forEach((usage: FeatureUsage) => {
      usageMap.set(usage.feature_name, usage)
    })

    const features: FeatureAnalysis[] = Object.values(TRACKED_FEATURES).map(
      (featureInfo) => {
        const usage = usageMap.get(featureInfo.key)
        return {
          feature_name: featureInfo.key,
          display_name: featureInfo.display_name,
          category: featureInfo.category,
          usage_count: usage?.usage_count || 0,
          last_used_at: usage?.last_used_at || null,
          unique_users: usage?.unique_users || 0,
          adoption_rate: usage?.adoption_rate || 0,
          is_used: !!usage && usage.usage_count > 0,
        }
      }
    )

    // 8. 사용 중인 기능 수 계산
    const usedFeatures = features.filter((f) => f.is_used).length
    const totalFeatures = Object.keys(TRACKED_FEATURES).length
    const adoptionRate =
      totalFeatures > 0 ? (usedFeatures / totalFeatures) * 100 : 0

    // 9. 추천 기능 생성
    const recommendations = generateFeatureRecommendations(
      features,
      companyUserCount
    )

    // 10. 응답 생성
    const response: CompanyFeatureAnalysis = {
      company: {
        id: company.id,
        name: company.name,
      },
      analysis: {
        total_features: totalFeatures,
        used_features: usedFeatures,
        adoption_rate: Math.round(adoptionRate * 10) / 10, // 소수점 1자리
        features,
        recommendations,
      },
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Forbidden')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }

    console.error('Error in GET /api/admin/companies/[id]/features:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
