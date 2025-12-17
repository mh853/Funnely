import {
  FeatureAnalysis,
  FeatureRecommendation,
  TRACKED_FEATURES,
} from '@/types/features'

/**
 * 회사의 기능 사용 패턴을 분석하여 추천 기능 목록 생성
 */
export function generateFeatureRecommendations(
  features: FeatureAnalysis[],
  companyUserCount: number
): FeatureRecommendation[] {
  const recommendations: FeatureRecommendation[] = []

  // 미사용 기능 찾기
  const usedFeatureNames = new Set(
    features.filter((f) => f.is_used).map((f) => f.feature_name)
  )

  Object.values(TRACKED_FEATURES).forEach((featureInfo) => {
    if (!usedFeatureNames.has(featureInfo.key)) {
      const recommendation = createRecommendation(
        featureInfo.key,
        'unused',
        companyUserCount
      )
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
  })

  // 30일 이상 미사용 기능
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  features.forEach((feature) => {
    if (
      feature.is_used &&
      feature.last_used_at &&
      new Date(feature.last_used_at) < thirtyDaysAgo
    ) {
      const recommendation = createRecommendation(
        feature.feature_name,
        'inactive',
        companyUserCount
      )
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
  })

  // 우선순위 정렬: high -> medium -> low
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return recommendations
}

function createRecommendation(
  featureName: string,
  reason: 'unused' | 'inactive',
  companyUserCount: number
): FeatureRecommendation | null {
  const featureInfo = TRACKED_FEATURES[featureName]
  if (!featureInfo) return null

  let priority: 'low' | 'medium' | 'high' = 'medium'
  let reasonText = ''
  let benefit = ''

  if (reason === 'unused') {
    switch (featureName) {
      case 'landing_page_create':
      case 'landing_page_publish':
      case 'lead_collection':
        priority = 'high'
        reasonText = '핵심 기능을 아직 사용하지 않았습니다'
        benefit = '제품의 주요 가치를 활용하여 비즈니스 성과 달성'
        break

      case 'team_invite':
        if (companyUserCount >= 2) {
          priority = 'low'
          reasonText = '이미 팀원이 있습니다'
          benefit = ''
        } else {
          priority = 'high'
          reasonText = '팀 협업으로 업무 효율 향상 가능'
          benefit = '팀원을 초대하여 함께 작업하고 생산성 증대'
        }
        break

      case 'data_export':
        priority = 'medium'
        reasonText = '데이터 분석 및 백업이 필요할 수 있습니다'
        benefit = '리드 데이터를 CSV/Excel로 내보내 추가 분석'
        break

      case 'api_integration':
        priority = 'high'
        reasonText = '자동화로 업무 효율을 크게 향상시킬 수 있습니다'
        benefit = 'API 연동으로 CRM, 마케팅 도구와 자동 연결'
        break

      case 'custom_domain':
        priority = 'medium'
        reasonText = '브랜드 일관성 유지에 도움이 됩니다'
        benefit = '자신의 도메인으로 전문적인 이미지 구축'
        break

      default:
        reasonText = '활용하면 유용한 기능입니다'
        benefit = featureInfo.description
    }
  } else if (reason === 'inactive') {
    priority = 'medium'
    reasonText = '30일 이상 사용하지 않았습니다'
    benefit = '다시 활용하여 제품 가치 극대화'
  }

  if (!reasonText || !benefit) return null

  return {
    feature_name: featureName,
    display_name: featureInfo.display_name,
    reason: reasonText,
    benefit,
    priority,
  }
}
