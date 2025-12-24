# Reports 필터 기본값 수정 - "이번 달"로 변경

## 📋 문제 상황

### 기존 동작
- URL: `/dashboard/reports?tab=monthly` (year/month 파라미터 없음)
- 문제: "전체" 필터로 인식되어 모든 데이터를 조회하려 함
- 결과: 데이터가 없는 경우 빈 화면 표시

### 사용자 요구사항
- **기본값을 "이번 달"로 설정**: 파라미터 없이 접속 시 현재 월(12월) 데이터 표시
- **"전체" 필터는 명시적으로 선택**: 사용자가 드롭다운에서 "전체"를 선택했을 때만 작동

## ✅ 해결 방안

### 1. Server-Side: 자동 리다이렉트 ([page.tsx:46-64](../src/app/dashboard/reports/page.tsx#L46-L64))

```tsx
const now = new Date()

// "전체" 필터는 명시적으로 year='all' 또는 month='all'로 표시
const isAllMonths = params.year === 'all' || params.month === 'all'

// 파라미터가 없으면 현재 월로 리다이렉트
if (!params.year && !params.month) {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const queryParams = new URLSearchParams()
  queryParams.set('year', currentYear.toString())
  queryParams.set('month', currentMonth.toString())
  if (params.department) queryParams.set('department', params.department)
  if (params.assignedTo) queryParams.set('assignedTo', params.assignedTo)
  redirect(`/dashboard/reports?${queryParams.toString()}`)
}

const selectedYear = isAllMonths ? now.getFullYear() : parseInt(params.year!)
const selectedMonth = isAllMonths ? now.getMonth() + 1 : parseInt(params.month!)
```

**동작**:
1. URL에 year/month가 없으면 현재 날짜로 리다이렉트
2. 예: `/dashboard/reports` → `/dashboard/reports?year=2025&month=12`
3. 기존 필터(department, assignedTo) 유지

### 2. Client-Side: "전체" 옵션 값 변경 ([ReportsClient.tsx:340-356](../src/app/dashboard/reports/ReportsClient.tsx#L340-L356))

```tsx
<select
  value={isAllMonths ? 'all-all' : `${selectedYear}-${selectedMonth}`}
  onChange={(e) => {
    const [year, month] = e.target.value.split('-')
    updateFilters({ year, month })
  }}
  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
>
  <option value="all-all">전체</option>
  {monthOptions.map((opt) => (
    <option
      key={`${opt.year}-${opt.month}`}
      value={`${opt.year}-${opt.month}`}
    >
      {opt.label}
    </option>
  ))}
</select>
```

**변경사항**:
- `<option value="">전체</option>` → `<option value="all-all">전체</option>`
- "전체" 선택 시 URL: `/dashboard/reports?year=all&month=all`

## 🎯 새로운 동작 방식

### Case 1: 파라미터 없이 접속
```
사용자 입력: /dashboard/reports
         ↓
서버: 현재 날짜 감지 (2025년 12월)
         ↓
리다이렉트: /dashboard/reports?year=2025&month=12
         ↓
결과: 2025년 12월 데이터 표시
```

### Case 2: "전체" 필터 선택
```
사용자: 드롭다운에서 "전체" 선택
         ↓
URL 변경: /dashboard/reports?year=all&month=all
         ↓
서버: isAllMonths = true 감지
         ↓
결과: 모든 히스토리 데이터 표시
```

### Case 3: 특정 월 선택
```
사용자: "2025년 11월" 선택
         ↓
URL 변경: /dashboard/reports?year=2025&month=11
         ↓
서버: isAllMonths = false
         ↓
결과: 2025년 11월 데이터만 표시
```

## 📊 예상 결과

### 첫 접속 시
```
이전: /dashboard/reports?tab=monthly (데이터 없음)
이후: /dashboard/reports?year=2025&month=12 (12월 데이터 표시)
```

### "전체" 필터 선택 시
```
URL: /dashboard/reports?year=all&month=all
테이블: 모든 월의 데이터가 날짜순으로 표시
```

## ✨ 개선 효과

1. **명확한 기본값**: 사용자가 항상 현재 월 데이터부터 시작
2. **혼란 방지**: 파라미터 없는 상태 = "전체" 필터 오해 해소
3. **명시적 선택**: "전체" 필터는 사용자가 직접 선택해야만 작동
4. **일관성**: URL에서 현재 상태를 명확하게 표현
5. **데이터 보장**: 첫 접속 시 빈 화면 대신 현재 월 데이터 표시

## 🔄 변경된 파일

1. `/Users/mh.c/medisync/src/app/dashboard/reports/page.tsx`
   - 자동 리다이렉트 로직 추가 (lines 48-64)
   - `isAllMonths` 감지 방식 변경 (`params.year === 'all'`)

2. `/Users/mh.c/medisync/src/app/dashboard/reports/ReportsClient.tsx`
   - "전체" 옵션 값 변경: `value=""` → `value="all-all"` (line 347)
   - select value 조건부 처리 (line 340)

## 🧪 테스트 시나리오

### Test 1: 첫 접속
```
조건: /dashboard/reports 접속 (파라미터 없음)
기대: 자동으로 /dashboard/reports?year=2025&month=12로 리다이렉트
결과: 2025년 12월 데이터 표시
```

### Test 2: "전체" 선택
```
조건: 드롭다운에서 "전체" 선택
기대: URL이 /dashboard/reports?year=all&month=all로 변경
결과: 모든 히스토리 데이터 표시
```

### Test 3: 특정 월 선택 후 페이지 새로고침
```
조건: 2025년 11월 선택 후 F5 새로고침
기대: URL 유지 (/dashboard/reports?year=2025&month=11)
결과: 11월 데이터 유지
```

### Test 4: 필터 조합 유지
```
조건: /dashboard/reports?department=영업팀 접속
기대: /dashboard/reports?year=2025&month=12&department=영업팀로 리다이렉트
결과: 12월 데이터 + 영업팀 필터 적용
```

## 📝 구현 완료 체크리스트

- [✅] page.tsx - 파라미터 없을 때 현재 월로 리다이렉트
- [✅] page.tsx - "전체" 필터를 'all' 값으로 명시적 처리
- [✅] ReportsClient.tsx - "전체" 옵션 값 변경
- [✅] TypeScript 타입 체크 통과
- [✅] 기존 필터(department, assignedTo) 유지 확인

---

**구현일**: 2025-12-24
**작성자**: Claude Code
**버전**: 1.1
**상태**: ✅ 완료
