# DB 스케줄 페이지 요구사항 명세

## 페이지 개요
**페이지명**: DB 스케줄 (DB Schedule)
**라우트**: `/dashboard/calendar`
**목적**: DB 상담 일정 및 약속 관리

---

## 1. DB 결과 항목 필터 표시

### 표시할 항목 (4개)
1. **상담 전** (`status: 'new' OR 'pending'`)
2. **상담 진행중** (`status: 'contacted' OR 'qualified'`)
3. **추가상담 필요** (`status: 'needs_followup'`)
4. **기타** (`status: 'other'`)

### 표시 규칙
- **데이터가 있는 항목만 노출**: 해당 상태의 데이터가 0건이면 항목 자체를 미노출
- **카운트 표시**: 각 항목별 건수를 함께 표시 (예: "상담 전 (5)")
- **시각적 구분**: 각 상태별로 다른 색상으로 구분

### 상태별 색상 추천
```typescript
const statusColors = {
  new: 'blue',        // 상담 전
  contacted: 'yellow', // 상담 진행중
  needs_followup: 'orange', // 추가상담 필요
  other: 'gray',      // 기타
}
```

---

## 2. DB 현황 페이지 연동

### 링크 기능
각 DB 결과 항목 클릭 시 'DB 현황' 페이지로 이동하며, **자동 필터링**된 상태로 표시

### 필터 파라미터
**URL 형식**: `/dashboard/leads?dateRange=[범위]&status=[상태]`

**예시**:
- 상담 전 클릭 → `/dashboard/leads?status=new`
- 상담 진행중 클릭 → `/dashboard/leads?status=contacted`
- 추가상담 필요 클릭 → `/dashboard/leads?status=needs_followup`
- 기타 클릭 → `/dashboard/leads?status=other`

### 날짜 범위 필터 (선택사항)
캘린더에서 특정 날짜를 선택한 경우, 해당 날짜 범위도 함께 필터링:
```
/dashboard/leads?dateRange=custom&startDate=2025-01-01&endDate=2025-01-31&status=new
```

---

## 3. 캘린더 뷰 구성

### 기본 구조
```
┌─────────────────────────────────────────────┐
│ DB 스케줄                                    │
│ DB 상담 일정과 약속을 관리합니다.             │
├─────────────────────────────────────────────┤
│                                              │
│  [상담 전 (5)]  [상담 진행중 (3)]             │
│  [추가상담 필요 (2)]  [기타 (1)]              │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│           캘린더 뷰 (달력 형태)                │
│                                              │
│  - 계약 완료 일정 (contract_completed_at)    │
│  - 상담 예정 일정                             │
│                                              │
└─────────────────────────────────────────────┘
```

### 캘린더 이벤트 데이터 소스
1. **계약 완료 일정**: `leads.contract_completed_at`
   - DB 현황 페이지에서 지정한 계약 완료 날짜/시간
   - 고객명, 전화번호 표시

2. **상담 예정 일정**: `calendar_events` 테이블
   - 기존 캘린더 이벤트 기능 활용
   - 담당자, 일정 타입 표시

---

## 4. UI 컴포넌트 설계

### 4-1. 상태 필터 버튼 그룹
```tsx
interface StatusFilterProps {
  statusCounts: {
    new: number
    contacted: number
    needs_followup: number
    other: number
  }
}

// 예시 컴포넌트
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {statusCounts.new > 0 && (
    <Link
      href="/dashboard/leads?status=new"
      className="bg-blue-100 text-blue-800 rounded-lg p-4 hover:bg-blue-200 transition"
    >
      상담 전 ({statusCounts.new})
    </Link>
  )}
  {/* 나머지 상태들도 동일 패턴 */}
</div>
```

### 4-2. 캘린더 이벤트 표시
```tsx
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'contract' | 'consultation' | 'followup'
  leadId?: string
  leadName?: string
  leadPhone?: string
  status?: string
}
```

---

## 5. 데이터 쿼리 로직

### 상태별 카운트 조회
```typescript
// 각 상태별 leads 카운트
const statusCounts = {
  new: await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('status', ['new', 'pending']),

  contacted: await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('status', ['contacted', 'qualified']),

  needs_followup: await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'needs_followup'),

  other: await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'other'),
}
```

### 계약 완료 일정 조회
```typescript
// contract_completed_at이 있는 leads 조회
const { data: contractSchedules } = await supabase
  .from('leads')
  .select('id, name, phone, contract_completed_at, status')
  .eq('company_id', companyId)
  .eq('status', 'contract_completed')
  .not('contract_completed_at', 'is', null)
  .order('contract_completed_at', { ascending: true })
```

---

## 6. 구현 우선순위

### Phase 1: 기본 구조 (우선)
1. 페이지 타이틀 "DB 스케줄"로 변경 ✅
2. 4개 상태 필터 버튼 그룹 UI 구현
3. 상태별 카운트 조회 및 표시

### Phase 2: DB 현황 연동
1. 각 상태 버튼에 Link 연결
2. URL 파라미터로 필터 전달
3. DB 현황 페이지에서 파라미터 기반 필터링 (이미 구현됨 ✅)

### Phase 3: 캘린더 통합
1. 계약 완료 일정을 캘린더 이벤트로 변환
2. 캘린더 뷰에 계약 완료 일정 표시
3. 이벤트 클릭 시 상세 정보 모달

### Phase 4: 고급 기능
1. 날짜 범위 선택 기능
2. 상태별 색상 구분 강화
3. 일정 알림 기능

---

## 7. 기술 스택

- **UI Framework**: Next.js 14 (App Router)
- **Database**: Supabase PostgreSQL
- **Calendar Library**: React Big Calendar 또는 FullCalendar
- **Styling**: Tailwind CSS
- **State Management**: URL Search Params (서버 컴포넌트)

---

## 8. 참고 사항

### 데이터베이스 스키마
```sql
-- leads 테이블 (기존)
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255),
  phone VARCHAR(255),
  status VARCHAR(50), -- 'new', 'pending', 'contacted', 'qualified', 'converted', 'contract_completed', 'needs_followup', 'rejected', 'other'
  contract_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- calendar_events 테이블 (기존)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  lead_id UUID REFERENCES leads(id),
  title VARCHAR(255),
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 상태 매핑
| DB 결과 | Status 값 |
|---------|-----------|
| 상담 전 | 'new', 'pending' |
| 상담 진행중 | 'contacted', 'qualified' |
| 추가상담 필요 | 'needs_followup' |
| 기타 | 'other' |

**참고**: 'converted', 'contract_completed', 'rejected'는 DB 스케줄 필터에서 제외됨
