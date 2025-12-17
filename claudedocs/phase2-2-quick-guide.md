# Phase 2.2: 건강도 대시보드 UI - 빠른 구현 가이드

## 구현 순서

### 1단계: Recharts 설치 (1분)
```bash
npm install recharts
```

### 2단계: 공통 컴포넌트 (30분)

**HealthStatusBadge** - `src/components/health/HealthStatusBadge.tsx`
```tsx
interface Props {
  status: 'critical' | 'at_risk' | 'healthy' | 'excellent'
}
// 상태별 색상 뱃지 표시
```

**HealthScoreCard** - `src/components/health/HealthScoreCard.tsx`
```tsx
// 회사 건강도 점수 카드 (점수 + 상태 + 컴포넌트 점수 미니바)
```

### 3단계: 메인 대시보드 (2시간)

**페이지** - `src/app/admin/health/page.tsx`
```tsx
// GET /api/admin/health 호출
// 필터: status, search, sort
// 카드 목록 + 페이지네이션
```

**레이아웃**:
- 상단: 요약 통계 (critical/at_risk/healthy/excellent 카운트)
- 중간: 검색/필터
- 하단: HealthScoreCard 목록

### 4단계: 상세 페이지 (2시간)

**페이지** - `src/app/admin/health/[companyId]/page.tsx`
```tsx
// GET /api/admin/health/[companyId] 호출
// 점수 표시 + 30일 차트 + 위험요소 + 권장사항
```

**추가 컴포넌트**:
- `HealthScoreTrend.tsx`: Recharts 라인 차트
- `RiskFactorList.tsx`: 위험 요소 목록
- `RecommendationList.tsx`: 권장사항 목록

### 5단계: 네비게이션 (15분)

**사이드바** - `src/components/admin/AdminSidebar.tsx`
```tsx
// "Customer Health" 메뉴 추가
// icon: HeartIcon, permission: 'view_health_scores'
```

## 핵심 API 사용법

```typescript
// 목록
GET /api/admin/health?limit=50&healthStatus=at_risk

// 상세
GET /api/admin/health/[companyId]

// 재계산
POST /api/admin/health/calculate
{ "companyId": "uuid" }
```

## 색상 코드

```typescript
critical: 'red'    // 0-40점
at_risk: 'yellow'  // 41-60점
healthy: 'green'   // 61-80점
excellent: 'blue'  // 81-100점
```

## 예상 작업 시간

- Recharts 설치: 1분
- 공통 컴포넌트: 30분
- 메인 대시보드: 2시간
- 상세 페이지: 2시간
- 네비게이션: 15분
- 테스트: 45분

**총 예상**: ~6시간

## 다음 단계

완료 후:
1. Git commit
2. Vercel 배포
3. 실제 데이터로 테스트
4. Phase 2.3으로 진행
