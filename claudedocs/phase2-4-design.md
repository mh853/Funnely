# Phase 2.4: 기능 사용 분석 - 간결 설계

## 목표
회사별 기능 활용도 추적 및 미사용 기능 추천으로 제품 가치 극대화

## 데이터베이스 (이미 존재)
`feature_usage` 테이블: Phase 2.1에서 생성 완료
- company_id, feature_name, usage_count, last_used_at
- unique_users, adoption_rate

## 추적 기능 목록
```typescript
const TRACKED_FEATURES = {
  // 핵심 기능
  'landing_page_create': '랜딩페이지 생성',
  'landing_page_publish': '랜딩페이지 발행',
  'lead_collection': '리드 수집',

  // 협업
  'team_invite': '팀원 초대',

  // 고급 기능
  'custom_domain': '커스텀 도메인',
  'api_integration': 'API 연동',
  'data_export': '데이터 내보내기'
}
```

## API 엔드포인트

### GET /api/admin/companies/[id]/features
회사별 기능 사용 분석 조회

**Response**:
```typescript
{
  company: { id, name },
  analysis: {
    total_features: 7,
    used_features: 3,
    adoption_rate: 42.9,
    features: [{
      feature_name: 'landing_page_create',
      display_name: '랜딩페이지 생성',
      usage_count: 15,
      last_used_at: '2025-12-17T...',
      unique_users: 2,
      is_used: true
    }],
    recommendations: [{
      feature_name: 'api_integration',
      reason: '자동화로 업무 효율 향상',
      priority: 'high'
    }]
  }
}
```

## UI 구현

### 1. 회사 상세 페이지 탭 추가
`src/app/admin/companies/[id]/page.tsx`에 "기능 사용" 탭

### 2. 컴포넌트
```
src/app/admin/companies/[id]/components/
├── FeaturesTab.tsx              # 기능 사용 탭 메인
├── FeatureUsageTable.tsx        # 기능 목록 테이블
└── FeatureRecommendations.tsx   # 추천 기능 카드
```

## 추천 로직
1. **미사용 핵심 기능**: 우선순위 High
2. **30일 이상 미사용**: 우선순위 Medium
3. **팀 규모별 추천**: 2명 이상 → 팀 초대

## 구현 체크리스트
- [ ] API 엔드포인트 (`GET /api/admin/companies/[id]/features`)
- [ ] 추적 기능 상수 정의
- [ ] 추천 로직 구현
- [ ] UI 컴포넌트 (3개)
- [ ] 회사 상세 페이지에 탭 통합
- [ ] RBAC 권한: `VIEW_COMPANIES`
- [ ] 빌드 검증
- [ ] Git 커밋

**예상 시간**: 2-3시간
