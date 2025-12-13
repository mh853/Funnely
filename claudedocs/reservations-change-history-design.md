# 예약 모달 통합 변경이력 시스템 설계

## 목적
dashboard/reservations의 예약상세정보 모달에 dashboard/calendar와 동일한 통합 변경이력 시스템을 적용하여 일관된 사용자 경험 제공

## 현재 상태 분석

### ReservationsClient.tsx 현재 구조
- **위치**: `/src/app/dashboard/reservations/ReservationsClient.tsx`
- **현재 기능**: 예약일 변경이력만 표시 (`reservation_date_logs` 테이블)
- **제한사항**:
  - 담당자 변경, 상태 변경, 비고 변경 이력 미표시
  - 사용자가 전체 변경 맥락을 파악하기 어려움

### CalendarView.tsx 참조 구현
- **위치**: `/src/components/calendar/CalendarView.tsx`
- **통합 기능**: 모든 변경이력을 하나의 타임라인으로 표시
  - 상태 변경 (`lead_status_logs.field_type = null`)
  - 콜 담당자 변경 (`field_type = 'call_assigned_to'`)
  - 상담 담당자 변경 (`field_type = 'counselor_assigned_to'`)
  - 비고 변경 (`field_type = 'notes'`)
  - 예약일 변경 (`field_type = 'contract_completed_at'`)

## 설계 목표

### 1. 통합 변경이력 시스템
- `lead_status_logs` 테이블을 메인 데이터 소스로 사용
- `reservation_date_logs`는 레거시 호환성 유지 (삭제 안 함)
- 모든 변경 타입을 시간순 타임라인으로 통합 표시

### 2. 일관된 UX
- CalendarView와 동일한 UI/UX 패턴 적용
- 동일한 컬러 스킴 및 아이콘 시스템
- 동일한 타임라인 인디케이터 (최신 변경사항 강조)

### 3. 실시간 업데이트
- 담당자 변경 시 즉시 변경이력 새로고침
- 상태 변경 시 즉시 변경이력 새로고침
- 브라우저 새로고침 불필요

## 데이터 모델

### lead_status_logs 테이블 구조
```sql
TABLE lead_status_logs (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  company_id UUID REFERENCES companies(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  field_type TEXT,              -- 'call_assigned_to', 'counselor_assigned_to', 'notes', 'contract_completed_at', null
  previous_value TEXT,           -- 이전 값 (담당자 ID, 비고 텍스트, 날짜)
  new_value TEXT,               -- 새 값
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 변경 타입별 매핑
| 변경 타입 | field_type | previous_value | new_value | new_status |
|----------|-----------|----------------|-----------|------------|
| 상태 변경 | null | status_code | status_code | new status |
| 콜 담당자 | `call_assigned_to` | user_id or null | user_id or null | 'call_assigned_to' |
| 상담 담당자 | `counselor_assigned_to` | user_id or null | user_id or null | 'counselor_assigned_to' |
| 비고 변경 | `notes` | 이전 텍스트 | 새 텍스트 | 'notes' |
| 예약일 변경 | `contract_completed_at` | 이전 날짜 | 새 날짜 | 'contract_completed_at' |

## 구현 계획

### 1. 쿼리 수정 (ReservationsClient.tsx)

#### 현재 쿼리
```typescript
supabase
  .from('reservation_date_logs')
  .select(`
    id,
    previous_date,
    new_date,
    created_at,
    changed_by_user:users!reservation_date_logs_changed_by_fkey(id, full_name)
  `)
```

#### 새 통합 쿼리
```typescript
supabase
  .from('lead_status_logs')
  .select(`
    id,
    previous_status,
    new_status,
    field_type,
    previous_value,
    new_value,
    created_at,
    changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
  `)
  .eq('lead_id', lead.id)
  .order('created_at', { ascending: false })
```

### 2. 상태 관리 업데이트

```typescript
// 기존
const [reservationDateLogs, setReservationDateLogs] = useState<any[]>([])

// 변경
const [statusLogs, setStatusLogs] = useState<any[]>([])
```

### 3. UI 컴포넌트 구조

#### CalendarView 패턴 적용
```tsx
{/* 상태 변경 이력 (통합) */}
<div className="bg-gray-50 rounded-xl overflow-hidden">
  <div className="px-4 py-2 bg-gray-200">
    <h4 className="text-sm font-medium text-gray-700">변경 이력</h4>
  </div>
  <div className="p-4">
    {loadingStatusLogs ? (
      <LoadingSpinner />
    ) : statusLogs.length > 0 ? (
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {statusLogs.map((log, index) => (
          <ChangeLogItem
            key={log.id}
            log={log}
            isLatest={index === 0}
            teamMembers={teamMembers}
          />
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-400 text-center py-4">
        변경 이력이 없습니다
      </p>
    )}
  </div>
</div>
```

### 4. 헬퍼 함수 (CalendarView에서 복사)

```typescript
// 로그 라벨 결정
const getLogLabel = (status: string, fieldType?: string, value?: string | null) => {
  if (fieldType === 'call_assigned_to') {
    const member = teamMembers.find(m => m.id === value)
    return member?.full_name || value || '미지정'
  }
  if (fieldType === 'counselor_assigned_to') {
    const member = teamMembers.find(m => m.id === value)
    return member?.full_name || value || '미지정'
  }
  if (fieldType === 'contract_completed_at' || status === 'contract_completed_at') {
    return '예약 확정일 변경'
  }
  if (fieldType === 'notes') {
    return value || '(비고 삭제)'
  }
  return STATUS_STYLES[status]?.label || status || '없음'
}

// 로그 스타일 결정
const getLogStyle = (status: string, fieldType?: string) => {
  if (fieldType === 'call_assigned_to') {
    return STATUS_STYLES.call_assigned_to || { bg: 'bg-blue-100', text: 'text-blue-800' }
  }
  if (fieldType === 'counselor_assigned_to') {
    return STATUS_STYLES.counselor_assigned_to || { bg: 'bg-emerald-100', text: 'text-emerald-800' }
  }
  if (fieldType === 'contract_completed_at' || status === 'contract_completed_at') {
    return { bg: 'bg-amber-100', text: 'text-amber-800' }
  }
  if (fieldType === 'notes') {
    return { bg: 'bg-gray-100', text: 'text-gray-700' }
  }
  return STATUS_STYLES[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }
}

// 로그 타입별 제목
const getLogTypeLabel = (fieldType?: string) => {
  if (fieldType === 'call_assigned_to') return '콜 담당자'
  if (fieldType === 'counselor_assigned_to') return '상담 담당자'
  if (fieldType === 'notes') return '비고'
  if (fieldType === 'contract_completed_at') return '예약일'
  return '상태'
}
```

### 5. 실시간 새로고침 로직

```typescript
// 담당자 변경 후
const handleCallAssigneeChange = async (newAssigneeId: string) => {
  // ... API 호출 ...

  // 상태변경이력 새로고침
  const { data: newLogs } = await supabase
    .from('lead_status_logs')
    .select(`
      id,
      previous_status,
      new_status,
      field_type,
      previous_value,
      new_value,
      created_at,
      changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
    `)
    .eq('lead_id', leadDetails.id)
    .order('created_at', { ascending: false })

  if (newLogs) {
    setStatusLogs(newLogs)
  }
}
```

### 6. STATUS_STYLES 확장

```typescript
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  // 기존 상태들...

  // 필드 타입 추가
  call_assigned_to: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: '콜 담당자 변경'
  },
  counselor_assigned_to: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    label: '상담 담당자 변경'
  },
  contract_completed_at: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    label: '예약일 변경'
  },
  notes: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: '비고 변경'
  },
}
```

## 타임라인 UI 상세 설계

### 타임라인 인디케이터
```tsx
{/* 타임라인 인디케이터 */}
<div className="flex flex-col items-center">
  <div className={`w-2.5 h-2.5 rounded-full ${
    index === 0 ? 'bg-emerald-500' : 'bg-gray-300'
  }`}></div>
  {index < statusLogs.length - 1 && (
    <div className="w-0.5 h-full min-h-[20px] bg-gray-200 mt-1"></div>
  )}
</div>
```

### 변경 내용 표시
```tsx
{/* 로그 내용 */}
<div className="flex-1 pb-3">
  <div className="flex items-center gap-2 mb-1">
    <span className="text-xs font-medium text-gray-600">
      {getLogTypeLabel(log.field_type)}:
    </span>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    {/* 이전 값 */}
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      getLogStyle(log.previous_status, log.field_type).bg
    } ${getLogStyle(log.previous_status, log.field_type).text}`}>
      {getLogLabel(log.previous_status, log.field_type, log.previous_value)}
    </span>
    <span className="text-gray-400">→</span>
    {/* 새 값 */}
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      getLogStyle(log.new_status, log.field_type).bg
    } ${getLogStyle(log.new_status, log.field_type).text}`}>
      {getLogLabel(log.new_status, log.field_type, log.new_value)}
    </span>
  </div>
  {/* 메타 정보 */}
  <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
    <span>{formatDateTime(log.created_at)}</span>
    {log.changed_by_user && (
      <>
        <span className="text-gray-300">|</span>
        <span>{log.changed_by_user.full_name}</span>
      </>
    )}
  </div>
</div>
```

## 마이그레이션 계획

### Phase 1: 쿼리 및 상태 업데이트
1. `reservation_date_logs` → `lead_status_logs` 쿼리 변경
2. 상태 변수명 변경
3. 초기 데이터 로드 로직 수정

### Phase 2: UI 컴포넌트 교체
1. 헬퍼 함수 추가 (getLogLabel, getLogStyle, getLogTypeLabel)
2. STATUS_STYLES 확장
3. 타임라인 UI 적용

### Phase 3: 실시간 업데이트 추가
1. 담당자 변경 핸들러에 새로고침 로직 추가
2. 예약일 변경 핸들러에 새로고침 로직 추가

### Phase 4: 테스트 및 검증
1. 모든 변경 타입 표시 확인
2. 실시간 업데이트 동작 확인
3. CalendarView와 일관성 검증

## 호환성 고려사항

### reservation_date_logs 테이블 유지
- API 엔드포인트는 계속 양쪽 테이블에 기록
- 기존 데이터 보존
- 레거시 코드 호환성 유지

### 점진적 마이그레이션
- ReservationsClient만 먼저 변경
- 다른 컴포넌트는 기존 방식 유지
- 점진적으로 전체 시스템 통합

## 예상 효과

### 사용자 경험 개선
- 모든 변경사항을 한 곳에서 확인 가능
- 변경 맥락 파악 용이
- 일관된 UI/UX로 학습 곡선 감소

### 개발자 경험 개선
- 코드 중복 제거
- 유지보수 용이성 증가
- 단일 데이터 소스로 복잡도 감소

### 데이터 정합성
- 단일 진실 공급원 (Single Source of Truth)
- 데이터 동기화 이슈 제거
- 감사 추적 (Audit Trail) 개선

## 구현 우선순위

1. **High Priority**: 쿼리 및 데이터 로드 변경
2. **High Priority**: UI 컴포넌트 교체 (CalendarView 패턴 적용)
3. **Medium Priority**: 실시간 새로고침 로직 추가
4. **Low Priority**: reservation_date_logs 테이블 폐기 검토 (향후)

## 성공 지표

- [ ] 모든 변경 타입이 타임라인에 표시됨
- [ ] CalendarView와 동일한 UI/UX 제공
- [ ] 실시간 업데이트 동작 확인
- [ ] 기존 기능 정상 동작 (호환성)
- [ ] 성능 저하 없음 (쿼리 최적화)
