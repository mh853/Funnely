# Reports 페이지 - 탭 레이아웃 개선 및 "전체" 필터 설계

## 📋 요구사항

**날짜**: 2025-12-24
**목표**: Reports 페이지 UI/UX 개선

### 개선 사항
1. **탭 컨테이너 너비 제한**: 현재 화면 가로를 100% 채우는 탭을 적절한 크기로 축소
2. **"전체" 월 필터 기능**: "전체" 선택 시 모든 월의 데이터를 월별로 출력

## 🎯 현재 상태 분석

### 문제점 1: 탭 컨테이너 너비

**현재 코드** ([ReportsClient.tsx:294](../src/app/dashboard/reports/ReportsClient.tsx#L294)):
```tsx
{/* Tab Navigation */}
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
  {/* Tabs */}
  <div className="flex border-b border-gray-200">
    <button className="flex-1 px-6 py-3 ...">월별 요약</button>
    <button className="flex-1 px-6 py-3 ...">부서별</button>
    <button className="flex-1 px-6 py-3 ...">담당자별</button>
  </div>
  ...
</div>
```

**문제**:
- 외부 컨테이너에 `max-width` 제한 없음
- 와이드 스크린에서 탭이 지나치게 넓게 펼쳐짐
- 가독성 저하 및 시각적 밸런스 부족

### 문제점 2: "전체" 필터 동작

**현재 코드** ([ReportsClient.tsx:337-354](../src/app/dashboard/reports/ReportsClient.tsx#L337-L354)):
```tsx
<select
  value={`${selectedYear}-${selectedMonth}`}
  onChange={(e) => {
    const [year, month] = e.target.value.split('-')
    updateFilters({ year, month })
  }}
  className="..."
>
  <option value="">전체</option>
  {monthOptions.map((opt) => (
    <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
      {opt.label}
    </option>
  ))}
</select>
```

**서버 코드** ([page.tsx:46-56](../src/app/dashboard/reports/page.tsx#L46-L56)):
```tsx
const now = new Date()
const selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
const selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

// 선택된 월의 시작일과 종료일
const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
const selectedMonthEnd = new Date(selectedYear, selectedMonth, 0)
const daysInMonth = selectedMonthEnd.getDate()

const queryStart = selectedMonthStart.toISOString()
const queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()
```

**문제**:
- "전체" 선택 시 `value=""`이지만 서버에서는 현재 월로 fallback
- 모든 월의 데이터를 가져오는 로직 없음
- 월별로 그룹화하여 표시하는 구조 없음

## 🏗️ 해결 방안

### Solution 1: 탭 컨테이너 너비 제한

#### Option A: 중앙 정렬 + 최대 너비 제한 (권장)

**장점**:
- 대형 화면에서도 일관된 가독성
- 중앙 정렬로 시각적 균형감
- 반응형 디자인 유지

**구현**:
```tsx
{/* Tab Navigation */}
<div className="max-w-5xl mx-auto">  {/* 추가 */}
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    {/* Tabs */}
    <div className="flex border-b border-gray-200">
      <button className="flex-1 px-6 py-3 ...">월별 요약</button>
      <button className="flex-1 px-6 py-3 ...">부서별</button>
      <button className="flex-1 px-6 py-3 ...">담당자별</button>
    </div>
    ...
  </div>
</div>
```

**너비 옵션**:
- `max-w-4xl` (896px) - 더 작게
- `max-w-5xl` (1024px) - 적당 (권장)
- `max-w-6xl` (1152px) - 여유있게

#### Option B: 탭 버튼 고정 너비

**장점**:
- 탭 크기가 일정하게 유지
- 콤팩트한 디자인

**단점**:
- 작은 화면에서 레이아웃 깨질 수 있음

**구현**:
```tsx
<div className="flex border-b border-gray-200 justify-center gap-1">
  <button className="w-40 px-6 py-3 ...">월별 요약</button>
  <button className="w-40 px-6 py-3 ...">부서별</button>
  <button className="w-40 px-6 py-3 ...">담당자별</button>
</div>
```

### Solution 2: "전체" 필터 - 모든 월 데이터 표시

#### 데이터 구조 변경

**서버 사이드 로직**:

```tsx
// page.tsx 수정

// 1. "전체" 선택 여부 확인
const isAllMonths = !params.year && !params.month

let selectedYear: number
let selectedMonth: number | null
let queryStart: string
let queryEnd: string
let allMonthsData: { year: number; month: number }[] = []

if (isAllMonths) {
  // 전체 선택: 최근 12개월 데이터
  const now = new Date()
  selectedYear = now.getFullYear()
  selectedMonth = null

  // 최근 12개월 계산
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    allMonthsData.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  // 12개월 전부터 현재까지
  queryStart = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
  queryEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
} else {
  // 특정 월 선택
  selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  queryStart = selectedMonthStart.toISOString()
  queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()
}

// 2. 월별 데이터 집계 구조
if (isAllMonths) {
  // 월별로 그룹화
  const monthlyData: Record<string, {
    year: number
    month: number
    departmentMonthlyData: Record<string, ResultRow[]>
    staffMonthlyData: Record<string, ResultRow[]>
    resultRows: ResultRow[]
  }> = {}

  allMonthsData.forEach(({ year, month }) => {
    const key = `${year}-${month}`
    const daysInMonth = new Date(year, month, 0).getDate()

    // 각 월의 데이터 초기화
    monthlyData[key] = {
      year,
      month,
      departmentMonthlyData: {},
      staffMonthlyData: {},
      resultRows: [],
    }

    // 날짜별 데이터 초기화 (기존 로직과 동일)
    // ...
  })

  // 리드 데이터를 월별로 분류
  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const year = leadDate.getFullYear()
    const month = leadDate.getMonth() + 1
    const key = `${year}-${month}`

    if (monthlyData[key]) {
      // 해당 월의 데이터에 추가
      // ...
    }
  })
}
```

#### 클라이언트 사이드 렌더링

**Props 확장**:
```tsx
interface ReportsClientProps {
  // 기존 props
  resultRows: ResultRow[]
  departmentMonthlyData: Record<string, ResultRow[]>
  staffMonthlyData: Record<string, ResultRow[]>

  // 새 props
  isAllMonths: boolean
  allMonthsData?: Array<{
    year: number
    month: number
    label: string
    resultRows: ResultRow[]
    departmentMonthlyData: Record<string, ResultRow[]>
    staffMonthlyData: Record<string, ResultRow[]>
  }>

  // ...
}
```

**렌더링 로직**:
```tsx
{/* 월별 요약 탭 */}
{activeTab === 'monthly' && (
  <div className="space-y-6">
    {isAllMonths ? (
      // 전체: 월별 섹션
      allMonthsData?.map((monthData) => (
        <div key={`${monthData.year}-${monthData.month}`} className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              {monthData.label}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>...</thead>
              <tbody>
                {monthData.resultRows.map((row) => (
                  <tr key={row.date}>...</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))
    ) : (
      // 특정 월: 기존 단일 테이블
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            결과별 DB ({selectedMonth}월)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* 기존 테이블 */}
          </table>
        </div>
      </div>
    )}
  </div>
)}

{/* 부서별 탭 */}
{activeTab === 'department' && (
  <div className="space-y-6">
    {isAllMonths ? (
      // 전체: 월별 섹션 > 부서별 섹션
      allMonthsData?.map((monthData) => (
        <div key={`${monthData.year}-${monthData.month}`} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 bg-gray-100 p-3 rounded-lg">
            📅 {monthData.label}
          </h2>
          {Object.entries(monthData.departmentMonthlyData).map(([dept, rows]) => (
            <div key={dept} className="bg-white rounded-xl shadow-lg overflow-hidden ml-4">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-purple-600">{dept}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  {/* 부서별 테이블 */}
                </table>
              </div>
            </div>
          ))}
        </div>
      ))
    ) : (
      // 특정 월: 기존 부서별 섹션
      Object.entries(departmentMonthlyData).map(([dept, monthlyRows]) => (
        <div key={dept} className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 기존 부서별 테이블 */}
        </div>
      ))
    )}
  </div>
)}

{/* 담당자별 탭도 동일한 패턴 */}
```

## 📐 상세 구현 계획

### Phase 1: 탭 레이아웃 개선

**파일**: [src/app/dashboard/reports/ReportsClient.tsx](../src/app/dashboard/reports/ReportsClient.tsx)

**변경 사항**:
```tsx
// Line 293: Tab Navigation 시작 부분
{/* Tab Navigation */}
<div className="max-w-5xl mx-auto">  {/* 추가: 중앙 정렬 + 최대 너비 */}
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    {/* Tabs */}
    <div className="flex border-b border-gray-200">
      {/* 기존 탭 버튼들 유지 */}
    </div>
    {/* 필터 영역 및 콘텐츠 */}
  </div>
</div>
```

**추가 개선**:
- 필터 영역도 같은 컨테이너 안에 포함되어 일관성 유지
- 모바일에서는 `max-w-5xl`이 자동으로 무시되어 전체 너비 사용

### Phase 2: 서버 사이드 - "전체" 처리

**파일**: [src/app/dashboard/reports/page.tsx](../src/app/dashboard/reports/page.tsx)

**Line 46-56 수정**:
```tsx
const now = new Date()

// "전체" 선택 여부 확인
const isAllMonths = !params.year && !params.month

let selectedYear: number
let selectedMonth: number | null = null
let queryStart: string
let queryEnd: string
let allMonthsData: Array<{ year: number; month: number }> = []

if (isAllMonths) {
  // 전체: 최근 12개월
  selectedYear = now.getFullYear()

  // 12개월 목록 생성
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    allMonthsData.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    })
  }

  // 쿼리 범위: 12개월 전 ~ 현재
  queryStart = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
  queryEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
} else {
  // 특정 월 선택
  selectedYear = params.year ? parseInt(params.year) : now.getFullYear()
  selectedMonth = params.month ? parseInt(params.month) : now.getMonth() + 1

  const selectedMonthStart = new Date(selectedYear, selectedMonth - 1, 1)
  queryStart = selectedMonthStart.toISOString()
  queryEnd = new Date(selectedYear, selectedMonth, 1).toISOString()
}

const daysInMonth = selectedMonth
  ? new Date(selectedYear, selectedMonth, 0).getDate()
  : 31 // 전체 선택 시 최대 일수
```

**Line 116+ 데이터 집계 로직**:

기존 단일 월 집계 로직을 조건부로 분기:

```tsx
if (isAllMonths) {
  // 월별 데이터 맵 생성
  const monthlyDataMap = new Map<string, {
    year: number
    month: number
    daysInMonth: number
    resultsByDate: Record<string, any>
    departmentMonthlyData: Record<string, any[]>
    staffMonthlyData: Record<string, any[]>
  }>()

  // 각 월 초기화
  allMonthsData.forEach(({ year, month }) => {
    const key = `${year}-${month}`
    const daysInMonth = new Date(year, month, 0).getDate()

    const resultsByDate: Record<string, any> = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      resultsByDate[dateStr] = {
        date: dateStr,
        total: 0,
        // ... 초기값
      }
    }

    monthlyDataMap.set(key, {
      year,
      month,
      daysInMonth,
      resultsByDate,
      departmentMonthlyData: {},
      staffMonthlyData: {},
    })
  })

  // 리드 데이터를 월별로 분류하여 집계
  filteredLeads.forEach((lead) => {
    const leadDate = new Date(lead.created_at)
    const year = leadDate.getFullYear()
    const month = leadDate.getMonth() + 1
    const key = `${year}-${month}`
    const monthData = monthlyDataMap.get(key)

    if (monthData) {
      const dateStr = leadDate.toISOString().split('T')[0]

      // 날짜별 집계
      if (monthData.resultsByDate[dateStr]) {
        monthData.resultsByDate[dateStr].total++
        // ... 기존 집계 로직
      }

      // 부서별 집계 (월별로)
      // 담당자별 집계 (월별로)
    }
  })

  // Props로 전달할 배열 생성
  const allMonthsDataForClient = Array.from(monthlyDataMap.entries()).map(([key, data]) => ({
    year: data.year,
    month: data.month,
    label: `${data.year}년 ${data.month}월`,
    resultRows: Object.values(data.resultsByDate).sort((a, b) => a.date.localeCompare(b.date)),
    departmentMonthlyData: data.departmentMonthlyData,
    staffMonthlyData: data.staffMonthlyData,
  }))

  // Props 전달
  return (
    <ReportsClient
      isAllMonths={true}
      allMonthsData={allMonthsDataForClient}
      // 단일 월 props는 빈 값
      resultRows={[]}
      departmentMonthlyData={{}}
      staffMonthlyData={{}}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth || now.getMonth() + 1}
      // ...
    />
  )
} else {
  // 기존 단일 월 집계 로직
  // ...

  return (
    <ReportsClient
      isAllMonths={false}
      allMonthsData={undefined}
      resultRows={resultRows}
      departmentMonthlyData={departmentMonthlyData}
      staffMonthlyData={staffMonthlyData}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth!}
      // ...
    />
  )
}
```

### Phase 3: 클라이언트 Props 확장

**파일**: [src/app/dashboard/reports/ReportsClient.tsx](../src/app/dashboard/reports/ReportsClient.tsx)

**Line 68-85 Props 인터페이스**:
```tsx
interface ReportsClientProps {
  // 기존 props
  resultRows: ResultRow[]
  departmentRows: DepartmentRow[]
  staffRows: StaffRow[]
  departmentMonthlyData: Record<string, ResultRow[]>
  staffMonthlyData: Record<string, ResultRow[]>
  summary: {
    totalDB: number
    completed: number
    contractCompleted: number
    conversionRate: string
  }
  departments: string[]
  teamMembers: TeamMember[]
  selectedYear: number
  selectedMonth: number
  selectedDepartment: string
  selectedAssignedTo: string
  daysInMonth: number

  // 새 props
  isAllMonths: boolean
  allMonthsData?: Array<{
    year: number
    month: number
    label: string
    resultRows: ResultRow[]
    departmentMonthlyData: Record<string, ResultRow[]>
    staffMonthlyData: Record<string, ResultRow[]>
  }>
}
```

### Phase 4: 클라이언트 렌더링 로직

**월별 요약 탭** (Line 390+):
```tsx
{activeTab === 'monthly' && (
  <div className="space-y-6">
    {isAllMonths ? (
      // 전체 월 표시
      allMonthsData?.map((monthData) => (
        <div key={`${monthData.year}-${monthData.month}`} className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-blue-50">
            <h2 className="text-base font-bold text-gray-900">
              📅 {monthData.label}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              {/* 기존 테이블 헤더 */}
              <tbody className="bg-white divide-y divide-gray-200">
                {monthData.resultRows.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    {/* 기존 행 렌더링 로직 */}
                  </tr>
                ))}
              </tbody>
              {/* 월별 합계 행 */}
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-gray-900">합계</td>
                  <td className="px-3 py-2 text-sm text-center text-gray-900">
                    {monthData.resultRows.reduce((sum, r) => sum + r.total, 0)}
                  </td>
                  {/* 나머지 컬럼 합계 */}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))
    ) : (
      // 단일 월 표시 (기존 로직)
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* 기존 단일 테이블 */}
      </div>
    )}
  </div>
)}
```

**부서별 탭** (Line 630+):
```tsx
{activeTab === 'department' && (
  <div className="space-y-8">
    {isAllMonths ? (
      // 전체 월: 월 > 부서 계층
      allMonthsData?.map((monthData) => (
        <div key={`${monthData.year}-${monthData.month}`} className="space-y-4">
          {/* 월 헤더 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-bold">
              📅 {monthData.label}
            </h2>
          </div>

          {/* 부서별 섹션 */}
          <div className="ml-4 space-y-4">
            {Object.entries(monthData.departmentMonthlyData).map(([dept, rows]) => (
              <div key={dept} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-purple-600">{dept}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    {/* 부서별 테이블 (기존 구조) */}
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))
    ) : (
      // 단일 월: 부서별 섹션만 (기존 로직)
      <div className="space-y-6">
        {Object.entries(departmentMonthlyData).map(([dept, monthlyRows]) => (
          <div key={dept} className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* 기존 부서별 테이블 */}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**담당자별 탭** (Line 710+):
동일한 패턴으로 월 > 담당자 계층 구조 적용

## 🎨 UI/UX 개선사항

### 1. 탭 레이아웃
- **중앙 정렬**: `max-w-5xl mx-auto`로 와이드 스크린에서도 일관된 경험
- **반응형**: 작은 화면에서는 자동으로 전체 너비 사용

### 2. "전체" 선택 시 시각적 계층
```
📅 2024년 12월  ← 월 헤더 (파란색 그라데이션)
  ├─ 🏢 영업부  ← 부서 헤더 (보라색)
  │   └─ [테이블]
  └─ 🏢 관리부
      └─ [테이블]

📅 2025년 1월
  ├─ 🏢 영업부
  │   └─ [테이블]
  └─ 🏢 관리부
      └─ [테이블]
```

### 3. 색상 구분
- **월 헤더**: 파란색 그라데이션 (`bg-gradient-to-r from-blue-500 to-blue-600`)
- **부서/담당자 헤더**: 보라색 (`text-purple-600`)
- **월별 합계**: 회색 배경 (`bg-gray-50`)

## 📊 데이터 흐름

### 특정 월 선택 시
```
User: 2025년 1월 선택
  ↓
Server: 2025-01-01 ~ 2025-02-01 데이터 쿼리
  ↓
Client: 단일 테이블 렌더링
```

### "전체" 선택 시
```
User: "전체" 선택 (빈 값)
  ↓
Server:
  - 최근 12개월 날짜 계산
  - 12개월 전 ~ 현재 데이터 쿼리
  - 월별로 그룹화하여 집계
  ↓
Client:
  - 월별 섹션 렌더링
  - 각 월마다 부서별/담당자별 섹션
```

## 📝 구현 체크리스트

### Phase 1: 탭 레이아웃 (간단)
- [ ] ReportsClient.tsx Line 293에 `max-w-5xl mx-auto` 래퍼 추가
- [ ] 브라우저 테스트 (와이드 스크린)
- [ ] 반응형 테스트 (모바일)

### Phase 2: 서버 "전체" 처리 (중간)
- [ ] page.tsx `isAllMonths` 로직 추가
- [ ] `allMonthsData` 배열 생성
- [ ] 월별 데이터 초기화 루프
- [ ] 리드 데이터 월별 분류 집계
- [ ] Props 조건부 전달

### Phase 3: 클라이언트 Props (간단)
- [ ] ReportsClientProps 인터페이스 확장
- [ ] Props destructuring 업데이트

### Phase 4: 렌더링 로직 (중간)
- [ ] 월별 요약 탭: 조건부 렌더링
- [ ] 부서별 탭: 월 > 부서 계층
- [ ] 담당자별 탭: 월 > 담당자 계층

### Phase 5: 테스트 (중요)
- [ ] "전체" 선택 → 12개월 표시 확인
- [ ] 특정 월 선택 → 기존 동작 유지 확인
- [ ] 탭 전환 테스트
- [ ] 데이터 정확성 검증
- [ ] 성능 테스트 (12개월 데이터)

## ⚠️ 주의사항

### 1. 성능 고려
- **데이터 양**: 12개월 데이터는 단일 월의 12배
- **초기 로딩**: 서버 사이드 집계로 최소화
- **렌더링**: React key 최적화 필수

### 2. 메모리 사용
- 12개월 × 31일 × 부서/담당자 수 = 많은 데이터
- 필요시 페이지네이션 고려

### 3. UX 고려
- "전체" 선택 시 로딩 시간 안내
- 스크롤 위치 유지
- 섹션 접기/펼치기 옵션 (미래 개선)

## 🔄 대안: 간소화된 "전체" 구현

복잡도를 줄이려면:

**Option: 월별 요약만 지원**
- "전체" 선택 시 월별 요약 탭만 12개월 표시
- 부서별/담당자별은 특정 월 선택 필수

```tsx
{activeTab === 'monthly' && isAllMonths && (
  <div className="space-y-6">
    {allMonthsData?.map(monthData => (
      <MonthSection key={...} data={monthData} />
    ))}
  </div>
)}

{(activeTab === 'department' || activeTab === 'staff') && isAllMonths && (
  <div className="text-center py-12 text-gray-500">
    특정 월을 선택해주세요
  </div>
)}
```

## 🎯 성공 기준

1. **레이아웃**: 탭이 적절한 너비로 중앙 정렬
2. **"전체" 동작**: 최근 12개월 데이터 월별로 표시
3. **성능**: 로딩 시간 3초 이내
4. **정확성**: 모든 월의 집계가 정확
5. **반응형**: 모바일/태블릿/데스크톱 모두 정상 동작

---

**작성일**: 2025-12-24
**작성자**: Claude Code
**버전**: 1.0
