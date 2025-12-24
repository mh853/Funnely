# Analytics 페이지 - 전환율 계산 및 표시 개선 설계

## 📋 요구사항

사용자 스크린샷 분석 결과, 4가지 수정사항 필요:

1. **DB 전환수 테이블 비율 계산 오류 수정**
   - 현재: 가로 비율 (디바이스 구성) - 잘못된 계산
   - 변경: 트래픽 유입 대비 전환율 계산
   - 예시: 12.23일 트래픽 13개, DB 전환 1개 → 1/13 = 7.7%

2. **데이터 없는 날의 비율 표시**
   - 현재: 0인 날은 비율 표시 안 함
   - 변경: 모든 날에 비율 표시 (0인 경우도 포함)

3. **날짜 형식 변경**
   - 현재: `12. 24.` (월. 일. 형식)
   - 변경: `2025-12-24` (yyyy-mm-dd 형식)

4. **정렬 순서 변경**
   - 현재: 내림차순 (최신 → 과거)
   - 변경: 오름차순 (과거 → 최신)

## 🎯 핵심 문제 분석

### 문제 1: DB 전환수 테이블 비율 계산 오류

**현재 코드 (AnalyticsClient.tsx:344-367)**:
```tsx
<td className="px-3 py-2 text-sm text-center text-blue-600">
  {conversion.pc}
  {conversion.total > 0 && (
    <span className="text-gray-400 text-xs ml-1">
      ({((conversion.pc / conversion.total) * 100).toFixed(1)}%)
    </span>
  )}
</td>
```

**문제점**:
- `conversion.pc / conversion.total` = "DB 전환 중 PC 비율" (디바이스 구성)
- 이것은 **트래픽 유입 대비 전환율**이 아님!

**올바른 계산**:
- DB 전환율 = `conversion.pc / traffic.pc` (트래픽 PC 대비 DB 전환 PC)
- 예: 트래픽 PC 13개, DB 전환 PC 1개 → 1/13 = 7.7%

**비즈니스 의미**:
- ❌ 잘못된 계산: "DB 전환 중 PC가 100%를 차지한다"
- ✅ 올바른 계산: "PC 트래픽 13개 중 1개가 DB로 전환되었다 (7.7%)"

### 문제 2: 데이터 없는 날의 비율 표시

**현재 코드**:
```tsx
{row.total > 0 && (
  <span className="text-gray-400 text-xs ml-1">
    ({((row.pc / row.total) * 100).toFixed(1)}%)
  </span>
)}
```

**문제점**:
- `row.total > 0` 조건으로 인해 데이터 없는 날은 비율 표시 안 함
- 스크린샷에서 0인 날에도 `(100%)` 또는 `(0.0%)` 표시 필요

**해결 방안**:
```tsx
<span className="text-gray-400 text-xs ml-1">
  {row.total > 0 ? `(${((row.pc / row.total) * 100).toFixed(1)}%)` : '(0.0%)'}
</span>
```

### 문제 3: 날짜 형식

**현재 코드 (AnalyticsClient.tsx:222, 338)**:
```tsx
{new Date(row.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
```

**출력**: `12. 24.`

**변경 목표**: `2025-12-24`

**해결 방안**:
```tsx
{row.date}  // 서버에서 이미 yyyy-mm-dd 형식으로 전달됨
```

### 문제 4: 정렬 순서

**현재 상태**: 내림차순 (최신 → 과거)
- 스크린샷: 12.30, 12.29, 12.28, ..., 12.13

**변경 목표**: 오름차순 (과거 → 최신)
- 목표: 12.13, 12.14, 12.15, ..., 12.30

**해결 방안**:
- 서버에서 데이터를 오름차순으로 정렬하거나
- 클라이언트에서 `.sort((a, b) => a.date.localeCompare(b.date))` 적용

## 📐 상세 설계

### 1. DB 전환수 테이블 비율 계산 수정

#### Before (잘못된 계산)
```tsx
// ❌ DB 전환 내에서의 디바이스 구성 비율 (의미 없음)
{conversion.total > 0 && (
  <span className="text-gray-400 text-xs ml-1">
    ({((conversion.pc / conversion.total) * 100).toFixed(1)}%)
  </span>
)}
```

#### After (올바른 계산)
```tsx
// ✅ 트래픽 유입 대비 DB 전환율 (비즈니스 의미 있음)
{(() => {
  const trafficRow = trafficRows.find(t => t.date === row.date)
  if (!trafficRow || trafficRow.pc === 0) return <span className="text-gray-400 text-xs ml-1">(0.0%)</span>
  const conversionRate = (conversion.pc / trafficRow.pc) * 100
  return (
    <span className="text-gray-400 text-xs ml-1">
      ({conversionRate.toFixed(1)}%)
    </span>
  )
})()}
```

#### 계산 로직 설명

**합계 컬럼**:
```tsx
// 해당일의 전체 트래픽 대비 전체 DB 전환율
const totalConversionRate = (conversion.total / trafficRow.total) * 100
```

**PC 컬럼**:
```tsx
// 해당일의 PC 트래픽 대비 PC DB 전환율
const pcConversionRate = (conversion.pc / trafficRow.pc) * 100
```

**Mobile 컬럼**:
```tsx
// 해당일의 Mobile 트래픽 대비 Mobile DB 전환율
const mobileConversionRate = (conversion.mobile / trafficRow.mobile) * 100
```

**Tablet 컬럼**:
```tsx
// 해당일의 Tablet 트래픽 대비 Tablet DB 전환율
const tabletConversionRate = (conversion.tablet / trafficRow.tablet) * 100
```

### 2. 데이터 매칭 전략

DB 전환수 테이블은 트래픽 데이터와 매칭 필요:

```tsx
{trafficRows.map((trafficRow) => {
  // 같은 날짜의 conversion 데이터 찾기
  const conversionRow = conversionRows.find(c => c.date === trafficRow.date)

  const conversion = conversionRow || {
    date: trafficRow.date,
    total: 0,
    pc: 0,
    mobile: 0,
    tablet: 0,
  }

  return (
    <tr key={trafficRow.date}>
      {/* 날짜 */}
      <td>{trafficRow.date}</td>

      {/* 합계 - 전체 트래픽 대비 전환율 */}
      <td>
        {conversion.total}
        <span className="text-gray-400 text-xs ml-1">
          {trafficRow.total > 0
            ? `(${((conversion.total / trafficRow.total) * 100).toFixed(1)}%)`
            : '(0.0%)'
          }
        </span>
      </td>

      {/* PC - PC 트래픽 대비 전환율 */}
      <td>
        {conversion.pc}
        <span className="text-gray-400 text-xs ml-1">
          {trafficRow.pc > 0
            ? `(${((conversion.pc / trafficRow.pc) * 100).toFixed(1)}%)`
            : '(0.0%)'
          }
        </span>
      </td>

      {/* Mobile - Mobile 트래픽 대비 전환율 */}
      <td>
        {conversion.mobile}
        <span className="text-gray-400 text-xs ml-1">
          {trafficRow.mobile > 0
            ? `(${((conversion.mobile / trafficRow.mobile) * 100).toFixed(1)}%)`
            : '(0.0%)'
          }
        </span>
      </td>

      {/* Tablet - Tablet 트래픽 대비 전환율 */}
      <td>
        {conversion.tablet}
        <span className="text-gray-400 text-xs ml-1">
          {trafficRow.tablet > 0
            ? `(${((conversion.tablet / trafficRow.tablet) * 100).toFixed(1)}%)`
            : '(0.0%)'
          }
        </span>
      </td>
    </tr>
  )
})}
```

### 3. 트래픽 유입 테이블 - 데이터 없는 날 비율 표시

#### Before
```tsx
{row.total > 0 && (
  <span className="text-gray-400 text-xs ml-1">
    ({((row.pc / row.total) * 100).toFixed(1)}%)
  </span>
)}
```

#### After
```tsx
<span className="text-gray-400 text-xs ml-1">
  {row.total > 0
    ? `(${((row.pc / row.total) * 100).toFixed(1)}%)`
    : '(0.0%)'
  }
</span>
```

**적용 위치**:
- 트래픽 유입 테이블: PC, Mobile, Tablet 컬럼 (Lines 228-251)
- 합계 컬럼은 이미 `(100%)` 고정 표시 중이므로 수정 불필요

### 4. 날짜 형식 변경

#### Before (Lines 222, 338)
```tsx
{new Date(row.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
```
→ 출력: `12. 24.`

#### After
```tsx
{row.date}
```
→ 출력: `2025-12-24`

**변경 이유**:
- 서버에서 이미 `yyyy-mm-dd` 형식으로 전달됨
- 불필요한 Date 변환 제거로 성능 개선
- 시스템 전체 날짜 형식 일관성 유지

### 5. 정렬 순서 변경

#### Option A: 클라이언트 정렬 (권장)
```tsx
// trafficRows를 오름차순으로 정렬
const sortedTrafficRows = [...trafficRows].sort((a, b) =>
  a.date.localeCompare(b.date)
)

// 정렬된 데이터로 렌더링
{sortedTrafficRows.map((row) => (
  // ...
))}
```

#### Option B: 서버 정렬
서버 측 API에서 `ORDER BY date ASC` 적용

**권장**: Option A (클라이언트 정렬)
- 서버 API 수정 불필요
- 클라이언트에서 즉시 적용 가능
- 정렬 비용 미미 (월별 최대 31개 데이터)

## 🎨 예상 결과

### 트래픽 유입 테이블 (변경 최소)

| 날짜 | 합계 | PC | MOBILE | TABLET |
|------|------|-----|--------|--------|
| 2025-12-13 | 20 (100%) | 20 (100.0%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-14 | 14 (100%) | 14 (100.0%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-23 | 13 (100%) | 13 (100.0%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-24 | 2 (100%) | 2 (100.0%) | 0 (0.0%) | 0 (0.0%) |

**변경사항**:
- 날짜 형식: `12. 13.` → `2025-12-13`
- 정렬: 내림차순 → 오름차순
- 0인 값도 `(0.0%)` 표시

### DB 전환수 테이블 (계산 방식 완전 변경)

| 날짜 | 합계 | PC | MOBILE | TABLET |
|------|------|-----|--------|--------|
| 2025-12-13 | 2 (10.0%) | 2 (10.0%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-14 | 4 (28.6%) | 4 (28.6%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-23 | 1 (7.7%) | 1 (7.7%) | 0 (0.0%) | 0 (0.0%) |
| 2025-12-24 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

**계산 예시 (12.23일)**:
- 트래픽 PC: 13개
- DB 전환 PC: 1개
- 전환율: 1 / 13 × 100 = 7.7%

**계산 예시 (12.14일)**:
- 트래픽 PC: 14개
- DB 전환 PC: 4개
- 전환율: 4 / 14 × 100 = 28.6%

**Before vs After 비교**:

#### Before (잘못된 계산)
```
12.23: 1 (100%)  ← DB 전환 1개 중 PC가 100% (의미 없음)
12.14: 4 (100%)  ← DB 전환 4개 중 PC가 100% (의미 없음)
```

#### After (올바른 계산)
```
2025-12-23: 1 (7.7%)   ← 트래픽 13개 중 1개 전환 (의미 있음)
2025-12-14: 4 (28.6%)  ← 트래픽 14개 중 4개 전환 (의미 있음)
```

## 🏗️ 구현 전략

### Phase 1: 날짜 형식 및 정렬 변경 (Low Risk)
1. 날짜 표시 `toLocaleDateString()` 제거 → `{row.date}` 직접 사용
2. `trafficRows` 클라이언트 정렬 추가
3. 트래픽 테이블 0인 값 비율 표시

### Phase 2: DB 전환수 테이블 재설계 (High Impact)
1. `trafficRows` 기준 반복문으로 변경
2. 각 날짜별 `conversionRow` 매칭 로직 추가
3. 전환율 계산 공식 변경: `conversion / traffic`
4. 0으로 나누기 방지 로직 추가

### Phase 3: 테스트 및 검증
1. 데이터 있는 날: 정확한 전환율 계산 확인
2. 데이터 없는 날: 0.0% 표시 확인
3. 날짜 형식 및 정렬 확인
4. 엣지 케이스: 트래픽은 있지만 전환 0인 경우

## 📊 비즈니스 가치

### Before (잘못된 분석)
- ❌ "DB 전환 중 PC가 100%를 차지한다" → 무의미한 정보
- ❌ 전환율을 파악할 수 없음
- ❌ 마케팅 효과 측정 불가능

### After (올바른 분석)
- ✅ "12.14일 PC 트래픽 28.6%가 DB로 전환되었다"
- ✅ 날짜별 전환율 추이 분석 가능
- ✅ 디바이스별 전환 성과 비교 가능
- ✅ 마케팅 캠페인 ROI 측정 가능

### 예시 분석 시나리오

**시나리오 1: 마케팅 캠페인 효과 분석**
```
2025-12-13: 트래픽 20, 전환 2 → 전환율 10.0%
2025-12-14: 트래픽 14, 전환 4 → 전환율 28.6% (캠페인 효과!)
2025-12-23: 트래픽 13, 전환 1 → 전환율 7.7%
```
→ 12.14일 캠페인이 가장 효과적이었음을 확인

**시나리오 2: 디바이스별 전환 성과**
```
PC: 평균 전환율 15%
Mobile: 평균 전환율 8%
Tablet: 평균 전환율 5%
```
→ PC 트래픽에 집중하면 더 높은 전환율 기대

## 🧪 테스트 시나리오

### Test 1: 정상 데이터 전환율 계산
```
입력:
  - 트래픽: 13 (PC: 13, Mobile: 0, Tablet: 0)
  - DB 전환: 1 (PC: 1, Mobile: 0, Tablet: 0)

기대 출력:
  - 합계: 1 (7.7%)
  - PC: 1 (7.7%)
  - Mobile: 0 (0.0%)
  - Tablet: 0 (0.0%)
```

### Test 2: 트래픽 0인 경우
```
입력:
  - 트래픽: 0 (PC: 0, Mobile: 0, Tablet: 0)
  - DB 전환: 0 (PC: 0, Mobile: 0, Tablet: 0)

기대 출력:
  - 합계: 0 (0.0%)
  - PC: 0 (0.0%)
  - Mobile: 0 (0.0%)
  - Tablet: 0 (0.0%)
```

### Test 3: 트래픽은 있지만 전환 0인 경우
```
입력:
  - 트래픽: 10 (PC: 10, Mobile: 0, Tablet: 0)
  - DB 전환: 0 (PC: 0, Mobile: 0, Tablet: 0)

기대 출력:
  - 합계: 0 (0.0%)
  - PC: 0 (0.0%)
  - Mobile: 0 (0.0%)
  - Tablet: 0 (0.0%)
```

### Test 4: 날짜 형식 및 정렬
```
입력 (내림차순):
  - 2025-12-24
  - 2025-12-23
  - 2025-12-13

기대 출력 (오름차순):
  - 2025-12-13
  - 2025-12-23
  - 2025-12-24
```

## 📝 구현 체크리스트

### Phase 1: 날짜 및 정렬
- [ ] 트래픽 테이블 날짜 형식 변경 (Line 222)
- [ ] DB 전환수 테이블 날짜 형식 변경 (Line 338)
- [ ] `trafficRows` 클라이언트 정렬 추가
- [ ] 트래픽 테이블 0인 값 비율 표시 (Lines 230, 238, 246)

### Phase 2: DB 전환수 테이블 재설계
- [ ] 반복문 `trafficRows.map()` 기반으로 변경
- [ ] 날짜별 `conversionRow` 매칭 로직 추가
- [ ] 합계 컬럼 전환율 계산 변경
- [ ] PC 컬럼 전환율 계산 변경
- [ ] Mobile 컬럼 전환율 계산 변경
- [ ] Tablet 컬럼 전환율 계산 변경
- [ ] 0으로 나누기 방지 처리

### Phase 3: 테스트
- [ ] 정상 데이터 전환율 계산 검증
- [ ] 트래픽 0인 경우 처리 검증
- [ ] 전환 0인 경우 처리 검증
- [ ] 날짜 형식 확인
- [ ] 정렬 순서 확인
- [ ] 총합 로우(tfoot) 전환율 계산 검증

### Phase 4: Git
- [ ] Git commit with detailed message
- [ ] Git push to remote

## 🎯 성공 기준

1. **전환율 정확성**: DB 전환수 테이블의 모든 비율이 트래픽 대비 전환율로 계산됨
2. **비율 표시 완전성**: 0인 값도 (0.0%) 표시됨
3. **날짜 형식 일관성**: 모든 날짜가 `yyyy-mm-dd` 형식으로 표시됨
4. **정렬 정확성**: 과거부터 최신 순서로 표시됨 (오름차순)
5. **비즈니스 의미**: 전환율을 통해 마케팅 효과 측정 가능

## ⚠️ 주의사항

### 0으로 나누기 방지
```tsx
// ❌ 잘못된 코드
const rate = (conversion.pc / trafficRow.pc) * 100

// ✅ 올바른 코드
const rate = trafficRow.pc > 0 ? (conversion.pc / trafficRow.pc) * 100 : 0
```

### 데이터 매칭 실패 처리
```tsx
const conversionRow = conversionRows.find(c => c.date === trafficRow.date)

// conversionRow가 없을 경우 기본값 제공
const conversion = conversionRow || {
  date: trafficRow.date,
  total: 0,
  pc: 0,
  mobile: 0,
  tablet: 0,
}
```

### 총합 로우(tfoot) 전환율 계산
```tsx
// 전체 기간의 평균 전환율
const totalConversionRate = trafficTotals.total > 0
  ? (conversionTotals.total / trafficTotals.total) * 100
  : 0
```

---

**작성일**: 2025-12-24
**작성자**: Claude Code
**버전**: 1.0
**우선순위**: High (비즈니스 로직 오류 수정)
