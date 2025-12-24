# DB 리포트 페이지 - 탭 기반 네비게이션 설계

## 📋 요구사항 분석

### 현재 구조 (Before)
- **필터 기반 네비게이션**: 월 선택 + 부서 선택 + 담당자 선택 드롭다운
- **단일 뷰**: 필터에 따라 데이터가 변경되는 하나의 테이블 뷰
- **문제점**:
  - 월별/부서별/담당자별 분석이 혼재되어 사용자 혼란
  - 필터 조합의 의도가 명확하지 않음
  - 각 분석 목적에 맞는 UI/UX 제공 불가

### 새로운 구조 (After)
- **탭 기반 네비게이션**: 3개의 독립적인 분석 뷰
  1. **월별 요약** 탭: 선택된 월의 전체 DB 현황 (날짜별 상세)
  2. **부서별** 탭: 부서별 집계 및 비교 (월별 데이터)
  3. **담당자별** 탭: 담당자별 집계 및 검색 (월별 데이터)

## 🎨 스크린샷 분석

### Screenshot 1: 월별 요약 탭
```
┌─────────────────────────────────────────┐
│ [월별 요약] [부서별] [담당자별]         │
│                                         │
│ 📅 월 선택: [전체 ▼]                   │
│                                         │
│ 결과별 DB (12월)                        │
│ ┌─────┬────┬────┬────┬────┬────┐      │
│ │날짜 │DB유│상담│거절│진행│완료│      │
│ ├─────┼────┼────┼────┼────┼────┤      │
│ │12-25│ 7  │ 5  │ 0  │ 0  │ 2  │      │
│ │12-24│ 3  │ 2  │ 0  │ 0  │ 0  │      │
│ │12-23│ 2  │ 1  │ 0  │ 0  │ 0  │      │
│ └─────┴────┴────┴────┴────┴────┘      │
└─────────────────────────────────────────┘
```

**특징**:
- 탭: "월별 요약" 선택됨 (파란색 배경)
- 필터: "월 선택" 드롭다운만 존재 (부서/담당자 필터 없음)
- 데이터: 날짜별 상세 DB 현황
- 테이블 헤더: "결과별 DB (12월)" - 선택된 월 표시

### Screenshot 2: 부서별 탭
```
┌─────────────────────────────────────────┐
│ [월별 요약] [부서별] [담당자별]         │
│                                         │
│ 📅 월 선택: [전체 ▼]                   │
│                                         │
│ 영업부                                  │
│ ┌─────┬────┬────┬────┬────┬────┐      │
│ │날짜 │DB유│상담│거절│진행│완료│      │
│ ├─────┼────┼────┼────┼────┼────┤      │
│ │12-25│ 7  │ 5  │ 0  │ 0  │ 2  │      │
│ └─────┴────┴────┴────┴────┴────┘      │
│                                         │
│ 관리부                                  │
│ ┌─────┬────┬────┬────┬────┬────┐      │
│ │날짜 │DB유│상담│거절│진행│완료│      │
│ ├─────┼────┼────┼────┼────┼────┤      │
│ │12-25│ 7  │ 5  │ 0  │ 0  │ 2  │      │
│ └─────┴────┴────┴────┴────┴────┘      │
└─────────────────────────────────────────┘
```

**특징**:
- 탭: "부서별" 선택됨 (파란색 배경)
- 필터: "월 선택" 드롭다운만 존재
- 데이터: 부서별로 그룹화된 섹션
- 섹션 헤더: 각 부서명 (예: "영업부", "관리부") - 보라색 텍스트
- 각 부서마다 독립적인 월별 테이블

### Screenshot 3: 담당자별 탭
```
┌─────────────────────────────────────────┐
│ [월별 요약] [부서별] [담당자별]         │
│                                         │
│ 📅 월 선택: [전체▼] 📋 부서:[전체▼]   │
│ 🔍 [이름 검색                     ]    │
│                                         │
│ 담당자 1                                │
│ ┌─────┬────┬────┬────┬────┬────┐      │
│ │날짜 │DB유│상담│거절│진행│완료│      │
│ ├─────┼────┼────┼────┼────┼────┤      │
│ │12-25│ 7  │ 5  │ 0  │ 0  │ 2  │      │
│ └─────┴────┴────┴────┴────┴────┘      │
│                                         │
│ 담당자 2                                │
│ ┌─────┬────┬────┬────┬────┬────┐      │
│ │날짜 │DB유│상담│거절│진행│완료│      │
│ ├─────┼────┼────┼────┼────┼────┤      │
│ │12-25│ 7  │ 5  │ 0  │ 0  │ 2  │      │
│ └─────┴────┴────┴────┴────┴────┘      │
└─────────────────────────────────────────┘
```

**특징**:
- 탭: "담당자별" 선택됨 (파란색 배경)
- 필터: "월 선택" + "부서 선택" 드롭다운 + "이름 검색" 입력창
- 데이터: 담당자별로 그룹화된 섹션
- 섹션 헤더: 각 담당자명 (예: "담당자 1", "담당자 2") - 보라색 텍스트
- 부서 필터: 특정 부서 담당자만 필터링
- 검색 기능: 담당자 이름으로 실시간 검색

## 🏗️ 시스템 아키텍처

### URL 파라미터 설계

**기존 (Before)**:
```
/dashboard/reports?year=2025&month=12&department=영업부&assignedTo=user123
```

**새로운 (After)**:
```
/dashboard/reports?year=2025&month=12&tab=monthly
/dashboard/reports?year=2025&month=12&tab=department
/dashboard/reports?year=2025&month=12&tab=staff&department=영업부&search=홍길동
```

**파라미터 설명**:
| 파라미터 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `tab` | ✅ | `monthly` | 활성 탭: `monthly` \| `department` \| `staff` |
| `year` | ✅ | 현재년 | 선택된 년도 |
| `month` | ✅ | 현재월 | 선택된 월 |
| `department` | ❌ | - | 담당자별 탭에서 부서 필터 (staff 탭에서만) |
| `search` | ❌ | - | 담당자별 탭에서 이름 검색 (staff 탭에서만) |

### 상태 관리 전략

```typescript
// URL 상태 (서버 컴포넌트)
interface ReportsParams {
  tab: 'monthly' | 'department' | 'staff'
  year: number
  month: number
  department?: string  // staff 탭에서만 사용
  search?: string      // staff 탭에서만 사용
}

// 클라이언트 상태
const [activeTab, setActiveTab] = useState<'monthly' | 'department' | 'staff'>('monthly')
const [searchQuery, setSearchQuery] = useState('')  // 담당자별 탭 로컬 검색
```

### 데이터 흐름

```
Server Component (page.tsx)
  ↓ URL params 읽기
  ↓ Supabase 쿼리 (tab에 관계없이 모든 데이터)
  ↓ resultRows (날짜별)
  ↓ departmentRows (부서별)
  ↓ staffRows (담당자별)
  ↓
Client Component (ReportsClient.tsx)
  ↓ activeTab 상태로 뷰 전환
  ↓ 각 탭별 필터링/검색 로직
  ↓ 렌더링
```

## 📐 컴포넌트 설계

### 탭 네비게이션 컴포넌트

```tsx
// Tab 인터페이스
interface Tab {
  id: 'monthly' | 'department' | 'staff'
  label: string
  icon?: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'monthly', label: '월별 요약' },
  { id: 'department', label: '부서별' },
  { id: 'staff', label: '담당자별' },
]

// 탭 버튼 렌더링
<div className="flex border-b border-gray-200">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => handleTabChange(tab.id)}
      className={`
        px-6 py-3 font-medium text-sm transition-colors
        ${activeTab === tab.id
          ? 'bg-blue-500 text-white border-b-2 border-blue-600'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }
      `}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### 월별 요약 탭 컴포넌트

```tsx
function MonthlyTab({ resultRows, selectedMonth }: MonthlyTabProps) {
  return (
    <div className="space-y-4">
      {/* 월 선택 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">📅 월 선택</span>
        <select className="..." value={selectedMonth} onChange={...}>
          <option value="">전체</option>
          {/* 월 옵션들 */}
        </select>
      </div>

      {/* 결과별 DB 테이블 */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">
            결과별 DB ({selectedMonth}월)
          </h2>
        </div>
        <table className="min-w-full">
          {/* 날짜별 데이터 테이블 */}
        </table>
      </div>
    </div>
  )
}
```

### 부서별 탭 컴포넌트

```tsx
function DepartmentTab({
  departmentRows,
  resultRows,
  selectedMonth
}: DepartmentTabProps) {
  // 부서별로 resultRows 그룹화
  const groupedByDepartment = useMemo(() => {
    // departmentRows의 각 부서에 대해
    // 해당 부서 담당자들의 resultRows 필터링 및 집계
    return departmentRows.map(dept => ({
      department: dept.department,
      monthlyData: getMonthlyDataForDepartment(dept.department, resultRows)
    }))
  }, [departmentRows, resultRows])

  return (
    <div className="space-y-4">
      {/* 월 선택 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">📅 월 선택</span>
        <select className="..." value={selectedMonth} onChange={...}>
          <option value="">전체</option>
        </select>
      </div>

      {/* 각 부서별 섹션 */}
      {groupedByDepartment.map((group) => (
        <div key={group.department} className="space-y-2">
          <h3 className="text-lg font-bold text-purple-600">
            {group.department}
          </h3>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full">
              {/* 해당 부서의 월별 데이터 */}
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 담당자별 탭 컴포넌트

```tsx
function StaffTab({
  staffRows,
  resultRows,
  departments,
  selectedMonth,
  selectedDepartment,
  searchQuery
}: StaffTabProps) {
  // 부서 필터링
  const filteredByDepartment = useMemo(() => {
    if (!selectedDepartment) return staffRows
    return staffRows.filter(s => s.department === selectedDepartment)
  }, [staffRows, selectedDepartment])

  // 이름 검색 필터링
  const filteredBySearch = useMemo(() => {
    if (!searchQuery) return filteredByDepartment
    return filteredByDepartment.filter(s =>
      s.staffName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [filteredByDepartment, searchQuery])

  // 각 담당자의 월별 데이터
  const groupedByStaff = useMemo(() => {
    return filteredBySearch.map(staff => ({
      staffName: staff.staffName,
      department: staff.department,
      monthlyData: getMonthlyDataForStaff(staff.staffId, resultRows)
    }))
  }, [filteredBySearch, resultRows])

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 월 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">📅 월 선택</span>
          <select className="...">
            <option value="">전체</option>
          </select>
        </div>

        {/* 부서 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">📋 부서 선택</span>
          <select
            value={selectedDepartment}
            onChange={(e) => updateFilters({ department: e.target.value })}
            className="..."
          >
            <option value="">전체</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 이름 검색 */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 이름 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* 검색 결과 없음 */}
      {filteredBySearch.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          검색 결과가 없습니다
        </div>
      )}

      {/* 각 담당자별 섹션 */}
      {groupedByStaff.map((group) => (
        <div key={group.staffName} className="space-y-2">
          <h3 className="text-lg font-bold text-purple-600">
            {group.staffName}
            {group.department && (
              <span className="text-sm text-gray-500 ml-2">
                ({group.department})
              </span>
            )}
          </h3>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full">
              {/* 해당 담당자의 월별 데이터 */}
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 🎨 UI/UX 세부 디자인

### 탭 스타일링

**활성 탭**:
```css
bg-blue-500 text-white
border-b-2 border-blue-600
font-semibold
```

**비활성 탭**:
```css
bg-gray-200 text-gray-600
hover:bg-gray-300
transition-colors
```

**탭 컨테이너**:
```css
flex border-b border-gray-200
rounded-t-lg overflow-hidden
```

### 필터 영역 스타일

**월 선택 (공통)**:
```tsx
<div className="flex items-center gap-2">
  <CalendarIcon className="w-4 h-4 text-gray-500" />
  <span className="text-sm font-medium text-gray-600">월 선택</span>
  <select className="
    px-3 py-1.5
    border border-gray-300
    rounded-lg
    bg-white
    text-gray-900
    focus:ring-2 focus:ring-blue-500
    cursor-pointer
  ">
    <option value="">전체</option>
    {/* 옵션들 */}
  </select>
</div>
```

**부서 선택 (담당자별 탭)**:
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-medium text-gray-600">📋 부서 선택</span>
  <select className="px-3 py-1.5 border rounded-lg...">
    <option value="">전체</option>
    {departments.map(...)}
  </select>
</div>
```

**이름 검색 (담당자별 탭)**:
```tsx
<div className="flex-1 min-w-[200px] max-w-md">
  <div className="relative">
    <input
      type="text"
      placeholder="이름 검색"
      className="
        w-full
        pl-10 pr-4 py-2
        border border-gray-300
        rounded-lg
        focus:ring-2 focus:ring-blue-500
        focus:border-transparent
      "
    />
    <MagnifyingGlassIcon className="
      absolute left-3 top-1/2 -translate-y-1/2
      w-4 h-4 text-gray-400
    " />
  </div>
</div>
```

### 섹션 헤더 스타일 (부서별/담당자별)

```tsx
<h3 className="
  text-lg
  font-bold
  text-purple-600
  flex items-center gap-2
">
  {sectionTitle}
  {subtitle && (
    <span className="text-sm font-normal text-gray-500">
      ({subtitle})
    </span>
  )}
</h3>
```

## 📊 데이터 변환 로직

### 부서별 월별 데이터 생성

```typescript
function getMonthlyDataForDepartment(
  department: string,
  resultRows: ResultRow[],
  teamMembers: TeamMember[]
): ResultRow[] {
  // 1. 해당 부서 소속 담당자 ID 추출
  const departmentUserIds = teamMembers
    .filter(m => m.department === department)
    .map(m => m.id)

  // 2. 서버에서 필터링된 리드 데이터를 클라이언트에서 재집계
  // (서버 사이드에서 부서별로 미리 집계된 데이터 사용)

  // 실제로는 서버에서 이미 departmentRows로 집계된 데이터를 사용
  // 월별 세부 데이터가 필요하면 추가 쿼리 필요

  return resultRows // 현재는 전체 resultRows 반환
}
```

**참고**: 현재 서버 구조에서는 `departmentRows`가 전체 기간 합계만 제공
→ 부서별 "월별" 데이터를 위해서는 **서버 사이드 수정 필요**

### 담당자별 월별 데이터 생성

```typescript
function getMonthlyDataForStaff(
  staffId: string,
  resultRows: ResultRow[]
): ResultRow[] {
  // staffRows는 전체 기간 합계
  // 월별 세부 데이터는 서버에서 추가로 제공 필요

  return resultRows // 현재는 전체 resultRows 반환
}
```

**중요**: **서버 데이터 구조 확장 필요**
- 현재: `departmentRows`와 `staffRows`는 전체 기간 합계만 제공
- 필요: 각 부서/담당자별 "월별 상세 데이터" 필요

## 🔄 서버 사이드 수정 필요사항

### page.tsx 데이터 구조 확장

**현재 구조**:
```typescript
// 부서별 - 전체 기간 합계만
const departmentRows: DepartmentRow[] = [
  { department: '영업부', total: 12, pending: 8, ... }
]

// 담당자별 - 전체 기간 합계만
const staffRows: StaffRow[] = [
  { staffId: 'user1', staffName: '홍길동', total: 5, ... }
]
```

**필요한 구조**:
```typescript
// 부서별 - 월별 상세 데이터 추가
const departmentMonthlyData: Record<string, ResultRow[]> = {
  '영업부': [
    { date: '2025-12-01', total: 2, ... },
    { date: '2025-12-02', total: 1, ... },
  ],
  '관리부': [
    { date: '2025-12-01', total: 0, ... },
    { date: '2025-12-02', total: 3, ... },
  ]
}

// 담당자별 - 월별 상세 데이터 추가
const staffMonthlyData: Record<string, ResultRow[]> = {
  'user1': [
    { date: '2025-12-01', total: 2, ... },
    { date: '2025-12-02', total: 1, ... },
  ],
  'user2': [...]
}
```

**구현 방법**:

```typescript
// page.tsx에서 추가 집계
const departmentMonthlyData: Record<string, Record<string, any>> = {}
const staffMonthlyData: Record<string, Record<string, any>> = {}

// 모든 날짜 초기화 (부서별)
departments.forEach(dept => {
  departmentMonthlyData[dept] = {}
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    departmentMonthlyData[dept][dateStr] = {
      date: dateStr,
      total: 0,
      pending: 0,
      // ... 모든 필드 초기화
    }
  }
})

// 리드 데이터로 업데이트 (부서별)
filteredLeads.forEach(lead => {
  const assignedUser = teamMembers?.find(m => m.id === lead.call_assigned_to)
  const dept = assignedUser?.department || '미배정'
  const dateStr = new Date(lead.created_at).toISOString().split('T')[0]

  if (departmentMonthlyData[dept]?.[dateStr]) {
    departmentMonthlyData[dept][dateStr].total++
    // ... 상태별 집계
  }
})

// 담당자별도 동일한 방식으로 집계
```

**Props 전달**:
```typescript
<ReportsClient
  resultRows={resultRows}
  departmentRows={departmentRows}
  staffRows={staffRows}

  // 새로 추가
  departmentMonthlyData={departmentMonthlyData}
  staffMonthlyData={staffMonthlyData}

  // 기존 props
  summary={summary}
  departments={departments}
  teamMembers={teamMembers}
  selectedYear={selectedYear}
  selectedMonth={selectedMonth}
  daysInMonth={daysInMonth}
/>
```

## 🧪 테스트 시나리오

### Test 1: 탭 전환
```
1. "월별 요약" 탭 클릭 → 날짜별 테이블 표시
2. "부서별" 탭 클릭 → 부서별 섹션 표시
3. "담당자별" 탭 클릭 → 담당자별 섹션 + 검색 UI 표시
4. URL 파라미터 확인: tab=monthly|department|staff
```

### Test 2: 월별 요약 탭
```
1. 월 선택 드롭다운 변경
2. 테이블 헤더 "결과별 DB (X월)" 업데이트 확인
3. resultRows 데이터 날짜별 표시 확인
4. 합계 행 정확성 검증
```

### Test 3: 부서별 탭
```
1. 탭 진입 → 모든 부서 섹션 표시
2. 각 부서명 헤더 (보라색) 확인
3. 각 부서별 월별 데이터 테이블 확인
4. 부서가 없는 경우 "미배정" 섹션 표시
```

### Test 4: 담당자별 탭
```
1. 부서 선택 "전체" → 모든 담당자 표시
2. 부서 선택 "영업부" → 영업부 담당자만 필터링
3. 이름 검색 "홍" → "홍길동" 포함 담당자만 표시
4. 검색 결과 없음 → "검색 결과가 없습니다" 메시지
5. 검색 초기화 → 전체 담당자 다시 표시
```

### Test 5: URL 동기화
```
1. 탭 클릭 → URL `?tab=xxx` 업데이트
2. 브라우저 뒤로가기 → 이전 탭으로 복원
3. URL 직접 입력 → 해당 탭으로 진입
4. 잘못된 tab 파라미터 → 기본값 'monthly'로 폴백
```

### Test 6: 필터 조합
```
1. 담당자별 탭에서 부서 + 검색 동시 적용
2. URL 파라미터 확인: tab=staff&department=영업부&search=홍
3. 부서 변경 시 검색어 유지
4. 탭 전환 시 department/search 파라미터 초기화
```

## 📝 구현 순서

### Phase 1: 기본 탭 구조 (필수)
1. ✅ 탭 네비게이션 UI 구현
2. ✅ URL 파라미터 기반 탭 상태 관리
3. ✅ 월별 요약 탭 구현 (기존 resultRows 재사용)
4. ✅ 부서별/담당자별 탭 기본 UI (데이터 없어도 레이아웃)

### Phase 2: 서버 데이터 확장 (필수)
1. ✅ page.tsx에서 departmentMonthlyData 집계
2. ✅ page.tsx에서 staffMonthlyData 집계
3. ✅ Props 인터페이스 확장
4. ✅ 데이터 전달 및 검증

### Phase 3: 탭별 기능 구현
1. ✅ 부서별 탭: 부서 섹션 렌더링
2. ✅ 담당자별 탭: 부서 필터 + 검색 기능
3. ✅ 각 탭의 테이블 컴포넌트
4. ✅ 데이터 없음 상태 처리

### Phase 4: 최적화 및 검증
1. ✅ useMemo로 필터링 로직 최적화
2. ✅ 검색 디바운싱 (선택사항)
3. ✅ 접근성 개선 (키보드 네비게이션)
4. ✅ 반응형 디자인 테스트

## 🎯 성공 기준

1. **탭 전환**: 클릭 시 즉각적인 뷰 변경, URL 동기화
2. **월별 요약**: 날짜별 상세 데이터 정확히 표시
3. **부서별**: 모든 부서 섹션 표시, 월별 데이터 정확
4. **담당자별**: 부서 필터 + 검색 정상 작동, 실시간 결과 반영
5. **데이터 정합성**: 각 탭의 합계가 전체 데이터와 일치
6. **UX**: 직관적인 네비게이션, 명확한 시각적 피드백
7. **성능**: 대량 데이터에서도 탭 전환 지연 없음 (<100ms)

## ⚠️ 주의사항

### 데이터 일관성
- 부서별/담당자별 월별 합계 = 전체 월별 합계
- 필터링 로직이 서버/클라이언트 간 일치해야 함
- "미배정" 데이터 처리 일관성 유지

### 성능 고려사항
- 담당자가 많을 경우 (>100명) 가상 스크롤 고려
- 검색 디바운싱 (300ms) 적용
- useMemo로 불필요한 재계산 방지

### 접근성
- 탭 키보드 네비게이션 (Arrow keys)
- ARIA 속성 적용 (role="tablist", aria-selected)
- 포커스 관리 (탭 전환 시 첫 요소로 포커스)

### 호환성
- 모바일에서 탭 스크롤 또는 드롭다운 전환
- 검색 입력창 모바일 최적화 (가상 키보드 대응)

---

**작성일**: 2025-12-24
**작성자**: Claude Code
**버전**: 1.0
**관련 이슈**: Reports 탭 기반 네비게이션 구현
