# Analytics 날짜 필터 오류 수정

## 📋 문제 상황

### 발견된 버그
- **12월 필터**: 2024-11-30부터 데이터 표시 (2024-12-01이어야 함)
- **11월 필터**: 2024-10-30부터 데이터 표시 (2024-11-01이어야 함)
- **패턴**: 모든 월 필터가 1일 일찍 시작됨

## 🔍 근본 원인 분석

### 문제가 된 코드 ([page.tsx:61-62](../src/app/dashboard/analytics/page.tsx#L61-L62))
```typescript
// ❌ 잘못된 방식
const queryStart = selectedMonthStart.toISOString()
const queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()

.gte('date', queryStart.split('T')[0])
.lt('date', queryEnd.split('T')[0])
```

### 왜 문제가 발생했나?

#### 1. Timezone 변환 문제
```javascript
// 12월 1일 00:00:00 (로컬 시간)
const selectedMonthStart = new Date(2024, 11, 1)

// ISO 문자열로 변환하면 UTC 기준으로 변환됨
selectedMonthStart.toISOString()
// → "2024-11-30T15:00:00.000Z" (한국 시간대 KST = UTC+9)

// .split('T')[0]로 날짜 부분만 추출
queryStart.split('T')[0]
// → "2024-11-30" ❌ (2024-12-01이어야 함!)
```

#### 2. 데이터베이스 쿼리 영향
```sql
-- 의도한 쿼리
WHERE date >= '2024-12-01' AND date < '2025-01-01'

-- 실제 실행된 쿼리
WHERE date >= '2024-11-30' AND date < '2024-12-31'
-- → 11월 30일 데이터가 12월 필터에 포함됨!
```

## ✅ 해결 방법

### 수정된 코드 ([page.tsx:53-68](../src/app/dashboard/analytics/page.tsx#L53-L68))
```typescript
// ✅ 올바른 방식: 타임존 영향 없이 직접 날짜 문자열 생성
const queryStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
const queryEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

.gte('date', queryStartDate)
.lt('date', queryEndDate)
```

### 해결 원리

1. **타임존 회피**: Date 객체의 `toISOString()` 대신 직접 문자열 생성
2. **월 경계 처리**: 12월 → 1월 전환 시 연도 증가 로직
3. **날짜 형식 보장**: `padStart(2, '0')`로 항상 2자리 월 보장 (01, 02, ..., 12)

### 예시
```javascript
// 12월 필터 선택 시
selectedYear = 2024
selectedMonth = 12

queryStartDate = "2024-12-01"  // ✅ 정확
queryEndDate = "2025-01-01"    // ✅ 정확

// 데이터베이스 쿼리
WHERE date >= '2024-12-01' AND date < '2025-01-01'
// → 2024년 12월 1일 ~ 12월 31일 데이터만 조회
```

## 📊 테스트 결과

### Before (수정 전)
```
12월 필터 선택:
├─ queryStart: "2024-11-30T15:00:00.000Z" → split → "2024-11-30" ❌
├─ queryEnd: "2024-12-31T15:00:00.000Z" → split → "2024-12-31" ❌
└─ 결과: 2024-11-30 ~ 2024-12-30 데이터 조회 (1일 오차)
```

### After (수정 후)
```
12월 필터 선택:
├─ queryStartDate: "2024-12-01" ✅
├─ queryEndDate: "2025-01-01" ✅
└─ 결과: 2024-12-01 ~ 2024-12-31 데이터 조회 (정확)
```

## 🎯 영향받는 쿼리

### 1. 페이지뷰 데이터 쿼리 (line 63-68)
```typescript
const { data: pageViewsData } = await supabase
  .from('landing_page_analytics')
  .select('...')
  .gte('date', queryStartDate)  // ✅ 수정됨
  .lt('date', queryEndDate)     // ✅ 수정됨
```

### 2. 랜딩페이지 분석 데이터 쿼리 (line 164-169)
```typescript
const { data: monthlyAnalytics } = await supabase
  .from('landing_page_analytics')
  .select('...')
  .gte('date', queryStartDate)  // ✅ 수정됨
  .lt('date', queryEndDate)     // ✅ 수정됨
```

### 3. Leads 데이터 쿼리 (line 82-83)
```typescript
const { data: leads } = await supabase
  .from('leads')
  .select('...')
  .gte('created_at', queryStart)  // ℹ️ 유지 (timestamp 컬럼)
  .lt('created_at', queryEnd)     // ℹ️ 유지 (timestamp 컬럼)
```
**참고**: `leads` 테이블의 `created_at`은 timestamp 타입이므로 ISO string 그대로 사용 (타임존 처리가 올바름)

## 🔄 변경된 파일

**파일**: `/Users/mh.c/medisync/src/app/dashboard/analytics/page.tsx`

**변경 라인**:
- Line 53-57: Date 문자열 직접 생성 로직 추가
- Line 67-68: `queryStartDate`, `queryEndDate` 사용으로 변경
- Line 168-169: `queryStartDate`, `queryEndDate` 사용으로 변경

## 🎓 배운 점

### JavaScript Date 타임존 주의사항
```javascript
// ❌ 위험: ISO 변환 시 타임존 영향
new Date(2024, 11, 1).toISOString() // UTC로 변환됨

// ✅ 안전: 직접 문자열 생성
`${year}-${String(month).padStart(2, '0')}-01`
```

### 데이터베이스 날짜 비교 타입
- **Date 컬럼**: 타임존 없는 순수 날짜 → 문자열 직접 생성 필요
- **Timestamp 컬럼**: 타임존 포함 → ISO string 사용 가능

## ✅ 검증 방법

### 1. 수동 테스트
```
1. /dashboard/analytics?year=2024&month=12 접속
2. 날짜 범위 확인: 2024-12-01 ~ 2024-12-31 ✅
3. 11월 필터 선택
4. 날짜 범위 확인: 2024-11-01 ~ 2024-11-30 ✅
```

### 2. 데이터베이스 쿼리 검증
```sql
-- 12월 데이터 확인
SELECT date, COUNT(*)
FROM landing_page_analytics
WHERE date >= '2024-12-01' AND date < '2025-01-01'
GROUP BY date
ORDER BY date;

-- 결과: 2024-12-01부터 시작해야 함 ✅
```

---

**수정일**: 2025-12-25
**버그 타입**: Timezone 변환 오류
**우선순위**: 🔴 High (데이터 조회 정확도 영향)
**상태**: ✅ 수정 완료
