# Analytics 페이지 - 비율 계산 방식 변경 설계 (세로 → 가로)

## 📋 문제 정의

**현재 문제**: 트래픽 유입 및 DB 전환수 테이블의 비율이 세로(열) 기준으로 계산됨
- 예: PC 컬럼에서 각 일자의 비율 = (해당일 PC / 전체 기간 PC 합계) * 100

**요구사항**: 비율을 가로(행) 기준으로 변경
- 예: 특정 날짜 행에서 PC 비율 = (해당일 PC / 해당일 전체) * 100
- 각 날짜별로 PC, Mobile, Tablet의 구성 비율을 표시

## 🎯 설계 목표

### 변경 전 (세로 기준 - 열 합계 대비)
```
날짜    합계   PC        Mobile    Tablet
01/01   100    50 (20%)  40 (25%)  10 (10%)   ← 각 비율은 해당 컬럼 전체 합계 대비
01/02   200    100 (40%) 80 (50%)  20 (20%)
01/03   150    100 (40%) 40 (25%)  10 (10%)
합계    450    250 (100%) 160 (100%) 40 (100%)
                ↑ 세로 합계가 100%
```

**문제점**:
- "01/01의 PC가 20%"라는 것이 무엇을 의미하는지 불명확
- 해당 날짜의 디바이스 구성 비율을 알 수 없음
- 전체 기간 중 해당 날짜가 차지하는 비중만 표시

### 변경 후 (가로 기준 - 행 합계 대비)
```
날짜    합계   PC         Mobile     Tablet
01/01   100    50 (50%)   40 (40%)   10 (10%)   ← 각 비율은 해당일 합계 대비
01/02   200    100 (50%)  80 (40%)   20 (10%)      50% + 40% + 10% = 100%
01/03   150    100 (67%)  40 (27%)   10 (7%)
합계    450    250 (56%)  160 (36%)  40 (9%)
                ↑ 가로 합계가 100%
```

**장점**:
- "01/01에는 PC가 50%, Mobile이 40%, Tablet이 10%"로 명확
- 해당 날짜의 디바이스 구성 비율을 직관적으로 이해
- 비즈니스 인사이트: "모바일 트래픽이 증가하고 있다" 등 파악 가능

## 🏗️ 현재 구조 분석

### 트래픽 유입 테이블 - 현재 비율 계산 로직

**파일**: [src/app/dashboard/analytics/AnalyticsClient.tsx:232-251](src/app/dashboard/analytics/AnalyticsClient.tsx#L232-L251)

```tsx
<td className="px-3 py-2 text-sm text-center text-blue-600">
  {row.pc}
  {trafficTotals.pc > 0 && (
    <span className="text-gray-400 text-xs ml-1">
      ({Math.round((row.pc / trafficTotals.pc) * 100)}%)
      {/* ↑ 세로 기준: 해당일 PC / 전체 기간 PC 합계 */}
    </span>
  )}
</td>
<td className="px-3 py-2 text-sm text-center text-green-600">
  {row.mobile}
  <span className="text-gray-400 text-xs ml-1">
    ({trafficTotals.mobile > 0 ? Math.round((row.mobile / trafficTotals.mobile) * 100) : 0}%)
    {/* ↑ 세로 기준: 해당일 Mobile / 전체 기간 Mobile 합계 */}
  </span>
</td>
<td className="px-3 py-2 text-sm text-center text-purple-600">
  {row.tablet}
  <span className="text-gray-400 text-xs ml-1">
    ({trafficTotals.tablet > 0 ? Math.round((row.tablet / trafficTotals.tablet) * 100) : 0}%)
    {/* ↑ 세로 기준: 해당일 Tablet / 전체 기간 Tablet 합계 */}
  </span>
</td>
```

### DB 전환수 테이블 - 현재 비율 계산 로직

**파일**: [src/app/dashboard/analytics/AnalyticsClient.tsx:345-364](src/app/dashboard/analytics/AnalyticsClient.tsx#L345-L364)

동일한 세로 기준 계산 방식 사용

### 합계 행 - 현재 비율 계산 로직

**파일**: [src/app/dashboard/analytics/AnalyticsClient.tsx:264-287](src/app/dashboard/analytics/AnalyticsClient.tsx#L264-L287)

```tsx
<td className="px-3 py-2 text-sm text-center text-blue-600">
  {trafficTotals.pc}
  {trafficTotals.total > 0 && (
    <span className="text-gray-400 text-xs ml-1">
      ({Math.round((trafficTotals.pc / trafficTotals.total) * 100)}%)
      {/* ↑ 합계 행은 이미 가로 기준 (전체 대비 PC 비율) */}
    </span>
  )}
</td>
```

**발견**: 합계 행은 이미 가로 기준으로 계산되어 있음 (일관성 부족)

## 📐 설계 솔루션

### 변경 방식: 비율 계산 기준 변경

**핵심 변경**:
```tsx
// 변경 전 (세로 기준)
({Math.round((row.pc / trafficTotals.pc) * 100)}%)
//             ↑ 해당일 PC / 전체 기간 PC 합계

// 변경 후 (가로 기준)
({Math.round((row.pc / row.total) * 100)}%)
//             ↑ 해당일 PC / 해당일 전체
```

### 1. 트래픽 유입 테이블 변경

**위치**: [src/app/dashboard/analytics/AnalyticsClient.tsx:218-252](src/app/dashboard/analytics/AnalyticsClient.tsx#L218-L252)

**변경 전**:
```tsx
{trafficRows.map((row) => (
  <tr key={row.date} className="hover:bg-gray-50">
    <td className="px-3 py-2 text-sm text-gray-900">
      {new Date(row.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
    </td>
    <td className="px-3 py-2 text-sm text-center text-gray-900">
      {row.total}
      {trafficTotals.total > 0 && (
        <span className="text-gray-400 text-xs ml-1">
          ({Math.round((row.total / trafficTotals.total) * 100)}%)
          {/* ↑ 세로 기준 */}
        </span>
      )}
    </td>
    <td className="px-3 py-2 text-sm text-center text-blue-600">
      {row.pc}
      {trafficTotals.pc > 0 && (
        <span className="text-gray-400 text-xs ml-1">
          ({Math.round((row.pc / trafficTotals.pc) * 100)}%)
          {/* ↑ 세로 기준 */}
        </span>
      )}
    </td>
    {/* Mobile, Tablet 동일한 세로 기준 */}
  </tr>
))}
```

**변경 후**:
```tsx
{trafficRows.map((row) => (
  <tr key={row.date} className="hover:bg-gray-50">
    <td className="px-3 py-2 text-sm text-gray-900">
      {new Date(row.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
    </td>
    <td className="px-3 py-2 text-sm text-center text-gray-900">
      {row.total}
      <span className="text-gray-400 text-xs ml-1">(100%)</span>
      {/* ↑ 합계 컬럼은 항상 100% */}
    </td>
    <td className="px-3 py-2 text-sm text-center text-blue-600">
      {row.pc}
      {row.total > 0 && (
        <span className="text-gray-400 text-xs ml-1">
          ({Math.round((row.pc / row.total) * 100)}%)
          {/* ↑ 가로 기준: 해당일 PC / 해당일 전체 */}
        </span>
      )}
    </td>
    <td className="px-3 py-2 text-sm text-center text-green-600">
      {row.mobile}
      {row.total > 0 && (
        <span className="text-gray-400 text-xs ml-1">
          ({Math.round((row.mobile / row.total) * 100)}%)
          {/* ↑ 가로 기준: 해당일 Mobile / 해당일 전체 */}
        </span>
      )}
    </td>
    <td className="px-3 py-2 text-sm text-center text-purple-600">
      {row.tablet}
      {row.total > 0 && (
        <span className="text-gray-400 text-xs ml-1">
          ({Math.round((row.tablet / row.total) * 100)}%)
          {/* ↑ 가로 기준: 해당일 Tablet / 해당일 전체 */}
        </span>
      )}
    </td>
  </tr>
))}
```

### 2. DB 전환수 테이블 변경

**위치**: [src/app/dashboard/analytics/AnalyticsClient.tsx:323-367](src/app/dashboard/analytics/AnalyticsClient.tsx#L323-L367)

동일한 방식으로 변경:
- `conversion.pc / conversionTotals.pc` → `conversion.pc / conversion.total`
- `conversion.mobile / conversionTotals.mobile` → `conversion.mobile / conversion.total`
- `conversion.tablet / conversionTotals.tablet` → `conversion.tablet / conversion.total`

### 3. 합계 행 - 변경 없음

합계 행은 이미 가로 기준으로 계산되어 있으므로 변경하지 않음.

```tsx
{trafficTotals.pc}
{trafficTotals.total > 0 && (
  <span className="text-gray-400 text-xs ml-1">
    ({Math.round((trafficTotals.pc / trafficTotals.total) * 100)}%)
    {/* ↑ 이미 가로 기준: 전체 기간 PC / 전체 기간 전체 */}
  </span>
)}
```

## 📊 변경 전후 비교

### 예시 데이터

```
날짜    합계   PC    Mobile  Tablet
01/01   100    50    40      10
01/02   200    100   80      20
01/03   150    100   40      10
합계    450    250   160     40
```

### 변경 전 (세로 기준)

```
날짜    합계       PC          Mobile      Tablet
01/01   100 (22%)  50 (20%)    40 (25%)    10 (25%)
01/02   200 (44%)  100 (40%)   80 (50%)    20 (50%)
01/03   150 (33%)  100 (40%)   40 (25%)    10 (25%)
합계    450 (100%) 250 (100%)  160 (100%)  40 (100%)

문제점:
- "01/01의 PC가 20%"는 전체 기간 PC(250) 대비 해당일 PC(50)의 비율
- 해당 날짜의 디바이스 구성을 알 수 없음
```

### 변경 후 (가로 기준)

```
날짜    합계       PC          Mobile      Tablet
01/01   100 (100%) 50 (50%)    40 (40%)    10 (10%)   ← 50+40+10=100%
01/02   200 (100%) 100 (50%)   80 (40%)    20 (10%)   ← 50+40+10=100%
01/03   150 (100%) 100 (67%)   40 (27%)    10 (7%)    ← 67+27+7=101% (반올림)
합계    450 (100%) 250 (56%)   160 (36%)   40 (9%)    ← 56+36+9=101% (반올림)

장점:
- "01/01에는 PC 50%, Mobile 40%, Tablet 10%"로 명확
- 날짜별 디바이스 구성 비율을 직관적으로 파악
- 비즈니스 인사이트 도출 가능 (예: "01/03에는 PC 비율이 급증")
```

## 🎨 UI/UX 개선

### 합계 컬럼 비율 표시

**변경 전**:
```tsx
{row.total}
{trafficTotals.total > 0 && (
  <span className="text-gray-400 text-xs ml-1">
    ({Math.round((row.total / trafficTotals.total) * 100)}%)
    {/* 세로 기준: 전체 기간 대비 해당일 비율 */}
  </span>
)}
```

**변경 후**:
```tsx
{row.total}
<span className="text-gray-400 text-xs ml-1">(100%)</span>
{/* 가로 기준: 해당일 전체는 항상 100% */}
```

**이유**: 가로 기준에서는 각 행의 합계가 항상 100%이므로 고정값 표시

### 반올림으로 인한 합계 불일치 처리

가로 기준에서는 반올림으로 인해 PC + Mobile + Tablet ≠ 100% 발생 가능

**예시**:
```
PC: 33.3% → 33%
Mobile: 33.3% → 33%
Tablet: 33.3% → 33%
합계: 99% (또는 101%)
```

**해결 방안**:
1. **Option 1**: 소수점 1자리 표시 (권장)
   ```tsx
   ({((row.pc / row.total) * 100).toFixed(1)}%)
   // 33.3% 표시
   ```

2. **Option 2**: 가장 큰 값에 나머지 할당
   - 복잡도 높음, 비추천

3. **Option 3**: 그대로 두기
   - 99% 또는 101% 허용
   - 사용자가 반올림 이해 필요

**권장**: Option 1 (소수점 1자리)

## 📝 구현 상세

### 변경 파일

1. **트래픽 유입 테이블**
   - 위치: [src/app/dashboard/analytics/AnalyticsClient.tsx:218-252](src/app/dashboard/analytics/AnalyticsClient.tsx#L218-L252)
   - 변경: 비율 계산 로직 (세로 → 가로)

2. **DB 전환수 테이블**
   - 위치: [src/app/dashboard/analytics/AnalyticsClient.tsx:323-367](src/app/dashboard/analytics/AnalyticsClient.tsx#L323-L367)
   - 변경: 비율 계산 로직 (세로 → 가로)

3. **합계 행**
   - 위치: [src/app/dashboard/analytics/AnalyticsClient.tsx:257-289](src/app/dashboard/analytics/AnalyticsClient.tsx#L257-L289)
   - 변경: 없음 (이미 가로 기준)

### 변경 요약

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **비율 기준** | 세로 (열 합계 대비) | 가로 (행 합계 대비) |
| **PC 비율** | `row.pc / trafficTotals.pc` | `row.pc / row.total` |
| **Mobile 비율** | `row.mobile / trafficTotals.mobile` | `row.mobile / row.total` |
| **Tablet 비율** | `row.tablet / trafficTotals.tablet` | `row.tablet / row.total` |
| **합계 컬럼** | 세로 기준 비율 | 고정 100% |
| **소수점** | 반올림 (정수) | 소수점 1자리 (권장) |

## 🧪 테스트 시나리오

### Test 1: 기본 비율 계산
```
입력:
날짜    합계   PC    Mobile  Tablet
01/01   100    50    40      10

예상 출력:
날짜    합계       PC         Mobile     Tablet
01/01   100 (100%) 50 (50.0%) 40 (40.0%) 10 (10.0%)
```

### Test 2: 불균등 분포
```
입력:
날짜    합계   PC    Mobile  Tablet
01/01   100    70    25      5

예상 출력:
날짜    합계       PC         Mobile     Tablet
01/01   100 (100%) 70 (70.0%) 25 (25.0%) 5 (5.0%)
```

### Test 3: 반올림 케이스
```
입력:
날짜    합계   PC    Mobile  Tablet
01/01   100    33    33      34

예상 출력:
날짜    합계       PC         Mobile     Tablet
01/01   100 (100%) 33 (33.0%) 33 (33.0%) 34 (34.0%)
└─ 33.0 + 33.0 + 34.0 = 100.0% (정확)
```

### Test 4: 0값 처리
```
입력:
날짜    합계   PC    Mobile  Tablet
01/01   100    100   0       0

예상 출력:
날짜    합계       PC          Mobile    Tablet
01/01   100 (100%) 100 (100.0%) 0 (0.0%)  0 (0.0%)
```

### Test 5: 합계 행 확인
```
입력:
합계    450    250   160     40

예상 출력:
합계    450 (100%) 250 (55.6%) 160 (35.6%) 40 (8.9%)
└─ 55.6 + 35.6 + 8.9 = 100.1% (반올림 오차)
```

## 📊 비즈니스 인사이트 예시

### 변경 전 (세로 기준) - 인사이트 도출 어려움
```
날짜    PC 비율
01/01   20%    ← "전체 기간 PC 중 20%"
01/02   40%    ← "전체 기간 PC 중 40%"
01/03   40%    ← "전체 기간 PC 중 40%"

질문: PC 트래픽이 증가하고 있는가?
→ 답변 불가 (날짜별 디바이스 구성 비율 모름)
```

### 변경 후 (가로 기준) - 명확한 인사이트
```
날짜    PC 비율
01/01   50%    ← "해당일 전체 중 50%가 PC"
01/02   50%    ← "해당일 전체 중 50%가 PC"
01/03   67%    ← "해당일 전체 중 67%가 PC"

질문: PC 트래픽이 증가하고 있는가?
→ 답변 가능: "01/03에 PC 비율이 급증 (50% → 67%)"
```

## 🎯 성공 기준

1. **정확성**: 각 행의 PC + Mobile + Tablet = 100% (±0.1% 오차 허용)
2. **가독성**: 비율이 해당 날짜의 디바이스 구성을 명확히 표시
3. **일관성**: 트래픽 유입과 DB 전환수 테이블 모두 동일한 방식
4. **비즈니스 가치**: 날짜별 디바이스 구성 트렌드 파악 가능

## 📋 구현 체크리스트

- [ ] 트래픽 유입 테이블 - 합계 컬럼 비율 변경 (세로 → 100% 고정)
- [ ] 트래픽 유입 테이블 - PC 컬럼 비율 변경 (세로 → 가로)
- [ ] 트래픽 유입 테이블 - Mobile 컬럼 비율 변경 (세로 → 가로)
- [ ] 트래픽 유입 테이블 - Tablet 컬럼 비율 변경 (세로 → 가로)
- [ ] DB 전환수 테이블 - 합계 컬럼 비율 변경 (세로 → 100% 고정)
- [ ] DB 전환수 테이블 - PC 컬럼 비율 변경 (세로 → 가로)
- [ ] DB 전환수 테이블 - Mobile 컬럼 비율 변경 (세로 → 가로)
- [ ] DB 전환수 테이블 - Tablet 컬럼 비율 변경 (세로 → 가로)
- [ ] 소수점 1자리 표시 적용 (`toFixed(1)`)
- [ ] 테스트 (기본 케이스, 반올림, 0값 등)
- [ ] Git commit & push

---

**작성일**: 2025-02-24
**작성자**: Claude Code
**버전**: 1.0
