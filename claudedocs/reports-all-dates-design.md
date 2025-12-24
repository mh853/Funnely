# Reports 페이지 - 모든 날짜 표시 및 오름차순 정렬 설계

## 📋 요구사항

**목표**: `/dashboard/reports` 페이지의 결과별 DB 테이블 개선
1. **모든 날짜 표시**: 유입이 없는 날도 포함하여 선택된 월의 모든 날짜 표시
2. **오름차순 정렬**: 날짜를 오래된 순서 (1일 → 말일) 로 정렬
3. **헤더 워딩 변경**: "리포트" → "DB 리포트"

## 🎯 현재 상태 분석

### 문제점

#### 1. 날짜 누락 ([page.tsx:116-175](src/app/dashboard/reports/page.tsx#L116-L175))

```tsx
// 날짜별 결과 집계 - 리드가 있는 날짜만 생성됨
const resultsByDate: Record<string, any> = {}

filteredLeads.forEach((lead) => {
  const leadDate = new Date(lead.created_at)
  const dateStr = leadDate.toISOString().split('T')[0]

  if (!resultsByDate[dateStr]) {
    resultsByDate[dateStr] = { /* ... */ }
  }
  // 리드가 있는 날짜만 추가됨
})

// 정렬 (최신순 - 내림차순)
const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
  b.date.localeCompare(a.date)  // 내림차순
)
```

**문제**: `filteredLeads.forEach()`는 리드가 있는 날짜만 처리
- 2025-01-15에 리드 없음 → 테이블에 표시 안 됨
- 사용자는 해당 날짜의 "0 DB" 상태를 볼 수 없음

#### 2. 내림차순 정렬 ([page.tsx:173](src/app/dashboard/reports/page.tsx#L173))

```tsx
const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
  b.date.localeCompare(a.date)  // 최신 날짜가 위로 (내림차순)
)
```

**문제**: 분석 페이지는 오름차순 (1일 → 말일)이 더 직관적

#### 3. 헤더 워딩 ([ReportsClient.tsx:220](src/app/dashboard/reports/ReportsClient.tsx#L220))

```tsx
<h1 className="text-xl sm:text-2xl font-bold text-gray-900">리포트</h1>
```

**문제**: 너무 일반적, "DB 리포트"가 더 명확

## 🏗️ 해결 방안

### Option 1: 서버 사이드에서 모든 날짜 생성 (권장)

**장점**:
- 단일 데이터 소스 (클라이언트는 받은 데이터만 표시)
- 서버에서 정렬 완료 (클라이언트 처리 불필요)
- `daysInMonth`가 이미 props로 전달되므로 활용 가능

**구현**:
```tsx
// page.tsx 수정

// 1. 모든 날짜 초기화 (리드 처리 전)
const resultsByDate: Record<string, any> = {}

// 선택된 월의 모든 날짜 생성
for (let day = 1; day <= daysInMonth; day++) {
  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  resultsByDate[dateStr] = {
    date: dateStr,
    total: 0,
    pending: 0,
    rejected: 0,
    inProgress: 0,
    completed: 0,
    contractCompleted: 0,
    needsFollowUp: 0,
    other: 0,
    pcCount: 0,
    mobileCount: 0,
    paymentAmount: 0,
    paymentCount: 0,
  }
}

// 2. 리드 데이터로 업데이트 (기존 forEach 로직)
filteredLeads.forEach((lead) => {
  const leadDate = new Date(lead.created_at)
  const dateStr = leadDate.toISOString().split('T')[0]

  // 이미 초기화되어 있으므로 if 체크 불필요
  resultsByDate[dateStr].total++
  // ... 나머지 집계 로직
})

// 3. 오름차순 정렬
const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
  a.date.localeCompare(b.date)  // 오름차순 (오래된 날짜 위로)
)
```

### Option 2: 클라이언트 사이드에서 처리

**단점**:
- 서버에서 이미 `daysInMonth` 계산하고 있어 중복
- 클라이언트에서 추가 연산 필요

**구현**:
```tsx
// ReportsClient.tsx에서
const allDateRows = useMemo(() => {
  const allDates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const existingData = resultRows.find(r => r.date === dateStr)

    return existingData || {
      date: dateStr,
      total: 0,
      pending: 0,
      // ... 모든 필드 0으로
    }
  })

  return allDates.sort((a, b) => a.date.localeCompare(b.date))
}, [resultRows, daysInMonth, selectedYear, selectedMonth])
```

## ✅ 권장 설계: Option 1 (서버 사이드)

### 이유
1. **단일 소스**: 서버에서 완성된 데이터 전달
2. **효율성**: 클라이언트 연산 최소화
3. **일관성**: 서버가 이미 `daysInMonth` 계산
4. **간결성**: 클라이언트는 렌더링만 집중

## 📐 변경 코드

### 변경 1: 서버 - 모든 날짜 초기화 및 오름차순 정렬

**파일**: [src/app/dashboard/reports/page.tsx:116-175](src/app/dashboard/reports/page.tsx#L116-L175)

**변경 전**:
```tsx
// 날짜별 결과 집계
const resultsByDate: Record<string, any> = {}

filteredLeads.forEach((lead) => {
  const leadDate = new Date(lead.created_at)
  const dateStr = leadDate.toISOString().split('T')[0]

  if (!resultsByDate[dateStr]) {
    resultsByDate[dateStr] = {
      date: dateStr,
      total: 0,
      pending: 0,
      rejected: 0,
      inProgress: 0,
      completed: 0,
      contractCompleted: 0,
      needsFollowUp: 0,
      other: 0,
      pcCount: 0,
      mobileCount: 0,
      paymentAmount: 0,
      paymentCount: 0,
    }
  }

  resultsByDate[dateStr].total++
  // ... 나머지 로직
})

// 정렬된 결과 (최신순)
const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
  b.date.localeCompare(a.date)
)
```

**변경 후**:
```tsx
// 날짜별 결과 집계 - 선택된 월의 모든 날짜 먼저 초기화
const resultsByDate: Record<string, any> = {}

// 1단계: 모든 날짜 초기화 (1일 ~ 말일)
for (let day = 1; day <= daysInMonth; day++) {
  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  resultsByDate[dateStr] = {
    date: dateStr,
    total: 0,
    pending: 0,
    rejected: 0,
    inProgress: 0,
    completed: 0,
    contractCompleted: 0,
    needsFollowUp: 0,
    other: 0,
    pcCount: 0,
    mobileCount: 0,
    paymentAmount: 0,
    paymentCount: 0,
  }
}

// 2단계: 실제 리드 데이터로 업데이트
filteredLeads.forEach((lead) => {
  const leadDate = new Date(lead.created_at)
  const dateStr = leadDate.toISOString().split('T')[0]

  // 이미 초기화되어 있으므로 존재 체크 불필요
  if (resultsByDate[dateStr]) {
    resultsByDate[dateStr].total++

    // Device type
    const deviceType = lead.device_type || 'unknown'
    if (deviceType === 'pc') resultsByDate[dateStr].pcCount++
    else if (deviceType === 'mobile') resultsByDate[dateStr].mobileCount++

    // Status
    const status = lead.status || 'pending'
    if (status === 'new' || status === 'pending') resultsByDate[dateStr].pending++
    else if (status === 'rejected') resultsByDate[dateStr].rejected++
    else if (status === 'contacted' || status === 'qualified') resultsByDate[dateStr].inProgress++
    else if (status === 'converted') resultsByDate[dateStr].completed++
    else if (status === 'contract_completed') resultsByDate[dateStr].contractCompleted++
    else if (status === 'needs_followup') resultsByDate[dateStr].needsFollowUp++
    else resultsByDate[dateStr].other++
  }
})

// 결제 데이터 집계 (기존 로직 유지)
paymentData?.forEach((payment: any) => {
  const leadCreatedAt = payment.leads?.created_at
  if (leadCreatedAt) {
    const paymentDate = new Date(leadCreatedAt)
    const dateStr = paymentDate.toISOString().split('T')[0]
    if (resultsByDate[dateStr]) {
      resultsByDate[dateStr].paymentAmount += payment.amount || 0
      resultsByDate[dateStr].paymentCount += 1
    }
  }
})

// 정렬된 결과 (오름차순 - 오래된 날짜 위로)
const resultRows = Object.values(resultsByDate).sort((a: any, b: any) =>
  a.date.localeCompare(b.date)  // 내림차순 → 오름차순 변경
)
```

### 변경 2: 클라이언트 - 헤더 워딩 변경

**파일**: [src/app/dashboard/reports/ReportsClient.tsx:220](src/app/dashboard/reports/ReportsClient.tsx#L220)

**변경 전**:
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-gray-900">리포트</h1>
```

**변경 후**:
```tsx
<h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 리포트</h1>
```

## 🎨 시각적 비교

### Before (현재)

```
결과별 DB 테이블:
┌────────┬───────┬────────┐
│ 날짜   │ 총계  │ ...    │
├────────┼───────┼────────┤
│ 12-25  │  45   │ ...    │  ← 최신 (내림차순)
│ 12-24  │  13   │ ...    │
│ 12-23  │  28   │ ...    │
│ 12-20  │   7   │ ...    │  ← 12-21, 12-22 누락!
│ 12-18  │  12   │ ...    │  ← 12-19 누락!
│ 12-17  │   3   │ ...    │
└────────┴───────┴────────┘

헤더: "리포트"
```

### After (변경 후)

```
결과별 DB 테이블:
┌────────┬───────┬────────┐
│ 날짜   │ 총계  │ ...    │
├────────┼───────┼────────┤
│ 12-01  │   0   │ ...    │  ← 오래된 순 (오름차순)
│ 12-02  │   0   │ ...    │
│ 12-03  │   5   │ ...    │
│ ...    │ ...   │ ...    │
│ 12-17  │   3   │ ...    │
│ 12-18  │  12   │ ...    │
│ 12-19  │   0   │ ...    │  ← 리드 없어도 표시!
│ 12-20  │   7   │ ...    │
│ 12-21  │   0   │ ...    │  ← 리드 없어도 표시!
│ 12-22  │   0   │ ...    │  ← 리드 없어도 표시!
│ 12-23  │  28   │ ...    │
│ 12-24  │  13   │ ...    │
│ 12-25  │  45   │ ...    │  ← 최신
└────────┴───────┴────────┘

헤더: "DB 리포트"  ← 명확한 워딩
```

## 📊 예상 결과

### 비즈니스 가치
1. **완전한 데이터 가시성**: 리드가 없는 날도 "0"으로 명확히 표시
2. **트렌드 분석 개선**: 연속된 날짜로 패턴 파악 용이
3. **데이터 누락 오해 방지**: "데이터 없음" vs "표시 안 됨" 구분
4. **시계열 분석 강화**: 오름차순으로 시간 흐름 자연스럽게 추적

### 사용자 경험
- **일관성**: Analytics 페이지와 동일한 오름차순 정렬
- **명확성**: "DB 리포트" 헤더로 페이지 목적 명확
- **완전성**: 모든 날짜 표시로 정보 누락 없음

## 🧪 테스트 시나리오

### Test 1: 모든 날짜 표시
```
조건: 2025-01월 선택, 1일/15일/31일만 리드 있음
기대: 1일 ~ 31일 전체 표시, 2일~14일/16일~30일은 총계 0
```

### Test 2: 오름차순 정렬
```
조건: 임의의 날짜에 리드 존재
기대: 테이블이 1일 → 2일 → ... → 말일 순서로 표시
```

### Test 3: 헤더 변경
```
조건: 페이지 진입
기대: "DB 리포트" 헤더 표시
```

### Test 4: 결제 데이터 연동
```
조건: 리드 없는 날에 결제 데이터 있음
기대: 해당 날짜 총계 0, 결제 데이터도 0 (리드 생성일 기준)
```

## 🔄 기존 로직 유지

변경하지 않는 부분:
- 부서별 집계 (departmentRows)
- 담당자별 집계 (staffRows)
- 요약 통계 (summary)
- 결제 데이터 집계 로직
- 필터링 로직 (부서/담당자)

## 📝 구현 체크리스트

- [ ] page.tsx - 모든 날짜 초기화 for 루프 추가
- [ ] page.tsx - filteredLeads.forEach() 수정 (if 체크 간소화)
- [ ] page.tsx - resultRows 정렬 오름차순으로 변경
- [ ] ReportsClient.tsx - 헤더 "리포트" → "DB 리포트" 변경
- [ ] 테스트: 리드 없는 날 0으로 표시 확인
- [ ] 테스트: 오름차순 정렬 확인
- [ ] 테스트: 헤더 워딩 확인
- [ ] Git commit & push

## 🎯 성공 기준

1. **완전성**: 선택된 월의 모든 날짜 (1~말일) 표시
2. **정렬**: 날짜 오름차순 (오래된 날짜 위로)
3. **명확성**: "DB 리포트" 헤더
4. **정확성**: 리드 없는 날은 모든 값 0
5. **일관성**: 부서별/담당자별 테이블 영향 없음

---

**작성일**: 2025-12-24
**작성자**: Claude Code
**버전**: 1.0
