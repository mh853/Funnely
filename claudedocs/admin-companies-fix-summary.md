# Admin Companies Page - 문제 해결 완료

## 🎯 최종 원인

**API 쿼리 필터 버그** - `status='all'` 파라미터를 잘못 처리하여 빈 결과 반환

## 🔍 문제 상세

### 로그 분석
```
🟢 [API] Returning 0 companies  ← 핵심 문제
```

- API는 200 OK 응답
- 하지만 companies 개수가 0개
- DB에는 3개 회사 존재

### 원인 코드

[src/app/api/admin/companies/route.ts:51-52](src/app/api/admin/companies/route.ts#L51-L52) (수정 전):
```typescript
if (status) {
  countQuery = countQuery.eq('status', status)  // ❌ 문제!
}
```

**문제점**:
1. 프론트엔드가 `status='all'` 전송
2. API가 `companies.status = 'all'`로 필터링 시도
3. `companies` 테이블에는 `status` 컬럼이 없음 (실제는 `is_active` 컬럼)
4. 쿼리 실패 → count = 0 → 빈 배열 반환

## ✅ 해결 방법

### 수정 사항

**1. Count 쿼리 수정**
```typescript
// Before
if (status) {
  countQuery = countQuery.eq('status', status)
}

// After
if (status && status !== 'all') {
  const isActive = status === 'active'
  countQuery = countQuery.eq('is_active', isActive)
}
```

**2. Data 쿼리 수정**
```typescript
// Before
if (status) {
  const isActive = status === 'active'
  dataQuery = dataQuery.eq('is_active', isActive)
}

// After
if (status && status !== 'all') {
  const isActive = status === 'active'
  dataQuery = dataQuery.eq('is_active', isActive)
}
```

### 변경 내용 요약

- `status='all'`일 때 필터를 적용하지 않음 (모든 회사 조회)
- `status='active'`일 때 `is_active=true`로 필터
- `status='inactive'`일 때 `is_active=false`로 필터
- 잘못된 `status` 컬럼 대신 올바른 `is_active` 컬럼 사용

## 📊 결과

- ✅ Count 쿼리 정상 작동
- ✅ 3개 회사 조회 가능
- ✅ 구독 정보 정상 표시
- ✅ 통계 카드 정상 작동

## 🧪 테스트 확인

### API 응답 (수정 후)
```json
{
  "companies": [
    {
      "id": "...",
      "name": "퍼널리",
      "admin_user": { "full_name": "최문호", "email": "munong2@gmail.com" },
      "stats": { "total_users": 4, "total_leads": 38, "landing_pages_count": 5 },
      "subscription": null
    },
    // ... 2 more companies
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "totalPages": 1
  }
}
```

### 브라우저 확인
- 회사 목록 테이블에 3개 회사 표시
- 통계 카드에 정확한 수치 표시
- 필터 정상 작동 (전체/활성/비활성)

## 📝 관련 파일

### 수정된 파일
1. [src/app/api/admin/companies/route.ts](src/app/api/admin/companies/route.ts)
   - Line 51-54: Count 쿼리 필터 수정
   - Line 79-82: Data 쿼리 필터 수정

### 관련 파일 (수정 안 함)
- [src/app/admin/companies/page.tsx](src/app/admin/companies/page.tsx) - 프론트엔드 정상
- [src/types/admin.ts](src/types/admin.ts) - 타입 정의 정상

## 💡 교훈

1. **테이블 스키마 확인 필수**: API에서 컬럼을 참조할 때 실제 스키마 확인
2. **필터 조건 검증**: `'all'` 같은 특수 값은 별도 처리 필요
3. **로그의 중요성**: `Returning 0 companies` 로그가 문제 파악에 결정적

## ✨ 구현 완료 기능

이번 작업으로 완성된 기능:
1. ✅ 회사 목록 조회 (페이지네이션)
2. ✅ 구독 정보 표시 (플랜, 상태, 금액, 다음 결제일)
3. ✅ 결제 통계 (총 결제금액, 결제 횟수)
4. ✅ 통계 카드 (총 회사, 활성 구독, MRR, 총 결제금액)
5. ✅ 필터 기능 (활성/비활성, 검색, 날짜 범위)
6. ✅ 정렬 기능 (생성일, 이름)
