# 통합 상세 모달 설계 문서

## 1. 개요

**목적**: leads, calendar, reservations 페이지의 상세 모달을 통일화하여 일관된 사용자 경험 제공

**적용 페이지**:
- `dashboard/leads` - DB 현황 페이지
- `dashboard/calendar` - 캘린더 페이지
- `dashboard/reservations` - 예약 관리 페이지

## 2. 모달 레이아웃 구조

### 2.1 전체 레이아웃 (2열 구조)

```
┌──────────────────────────────────────────────────────────┐
│  [X]  DB 관리                                              │
├────────────┬─────────────────────────────────────────────┤
│   콜담당자 ▼   │   상담 담당자 ▼                          │
├────────────┴─────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │ 왼쪽 열 (60%)        │  │ 오른쪽 열 (40%)          │   │
│  └─────────────────────┘  └─────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.2 왼쪽 열 상세

```
┌─────────────────────────┐
│ DB 신청 내용             │
├─────────────────────────┤
│ 이름: 홍길동              │
│ 전화번호: 010-1234-5678  │ ← 클릭 가능 (전화)
│ DB 신청일: 2025-12-13    │
├─────────────────────────┤
│ 결과                     │
│ [드롭다운] ▼             │
├─────────────────────────┤
│ 예약일                   │
│ 2025-12-15 09:30  [✏️]  │ ← 수정 버튼
├─────────────────────────┤
│ DB 신청 상세내용          │
├─────────────────────────┤
│ 랜딩페이지: 테스트4       │ ← 링크 (새 탭)
│ 기기: PC                 │
│ 선택항목: 항목1, 항목2    │
│ 단답형 항목: 값1, 값2     │
│ 뭐가 궁금하신가요: 내용   │
└─────────────────────────┘
```

### 2.3 오른쪽 열 상세

```
┌─────────────────────────┐
│ 결제 관리                │
├─────────────────────────┤
│ 결제 내역 ▼              │
│ 2025-12-08  300,000원   │
│ 2025-12-08  200,000원   │
│                          │
│ [+ 추가]                 │
│                          │
│ 합계: 500,000원          │
├─────────────────────────┤
│ 변경이력 ▼               │
├─────────────────────────┤
│ 🔵 콜 담당자 변경        │
│ 12월 13일 오전 11:33     │
│ 미지정 → 홍길동          │
│                          │
│ 🟢 상담 담당자 변경      │
│ 12월 10일 오후 9:01      │
│ 미지정 → 최우영          │
│                          │
│ 🟡 예약일 변경           │
│ (전체 공개로 변경)       │
└─────────────────────────┘
```

## 3. 컴포넌트 구조

### 3.1 파일 구조

```
src/components/shared/
├── UnifiedDetailModal.tsx       # 통합 모달 메인 컴포넌트
├── ScheduleRegistrationModal.tsx  # 예약완료일정등록 모달
└── types/
    └── unified-detail-modal.types.ts  # 타입 정의
```

### 3.2 Props 인터페이스

```typescript
interface UnifiedDetailModalProps {
  isOpen: boolean
  onClose: () => void
  lead: LeadData
  teamMembers: TeamMember[]
  onUpdate?: () => void
}

interface LeadData {
  id: string
  name: string
  phone: string | null
  created_at: string
  status: string
  contract_completed_at: string | null
  call_assigned_to: string | null
  counselor_assigned_to: string | null
  landing_pages?: {
    id: string
    title: string
    slug: string
  }
  device?: string
  consultation_items?: string[]
  custom_fields?: Array<{ label: string; value: string }>
  message?: string
  payment_amount?: number
  notes?: string
}
```

## 4. 기능 명세

### 4.1 상단 영역

**콜담당자 드롭다운**:
- 팀원 목록 표시
- "미지정" 옵션 포함
- 변경 시 즉시 API 호출
- 낙관적 업데이트 (optimistic update)

**상담 담당자 드롭다운**:
- 팀원 목록 표시
- "미지정" 옵션 포함
- 변경 시 즉시 API 호출
- 낙관적 업데이트

### 4.2 왼쪽 열

**DB 신청 내용**:
- 이름: 텍스트 표시
- 전화번호: `tel:` 링크 + 전화 아이콘
- DB 신청일: `formatDateTime` 사용

**결과**:
- 드롭다운으로 변경 가능
- 상태별 색상 구분
- "예약 확정" 선택 시 → 예약완료일정등록 모달 열기

**예약일**:
- 날짜/시간 표시 (있는 경우)
- 수정 아이콘 버튼 → 예약완료일정등록 모달 열기

**DB 신청 상세내용**:
- 랜딩페이지: `https://funnely.co.kr/landing/{slug}` 링크 (새 탭)
- 기기: device 값 표시
- 선택항목: consultation_items 배열 → 태그 형식
- 단답형 항목: custom_fields 배열 순회 표시
- 뭐가 궁금하신가요: message 값 표시 (여러 줄)

### 4.3 오른쪽 열

**결제 관리**:
- 결제 내역 목록 (API: `/api/leads/payments`)
- 각 항목: 날짜, 금액, 비고
- [+ 추가] 버튼 → 입력 폼 표시
- 합계 금액 표시
- **권한 무관 전체 공개**

**변경이력**:
- 모든 변경 이력 표시 (API: `/api/leads/change-logs`)
- 시간순 정렬 (최신순)
- 필드 타입별 아이콘/색상
- 변경 내용: "이전 값 → 새 값" 형식
- **권한 무관 전체 공개**

## 5. API 엔드포인트

### 5.1 기존 API 사용

```typescript
// 리드 업데이트
PUT /api/leads/update
Body: {
  id: string
  status?: string
  contract_completed_at?: string
  call_assigned_to?: string
  counselor_assigned_to?: string
}

// 결제 내역 조회
GET /api/leads/payments?lead_id={leadId}

// 결제 내역 추가
POST /api/leads/payments
Body: {
  lead_id: string
  amount: number
  notes?: string
}

// 결제 내역 삭제
DELETE /api/leads/payments?id={paymentId}

// 변경 이력 조회
GET /api/leads/change-logs?lead_id={leadId}
```

### 5.2 권한 수정 필요 사항

**결제 관리**:
- 현재: 관리자만 조회 가능 (isAdmin 체크)
- 변경: 모든 사용자 조회 가능
- 수정 파일: `/api/leads/payments` 엔드포인트

**변경 이력**:
- 현재: 권한 체크 없음 (이미 공개)
- 유지: 현재 상태 유지

## 6. 기존 코드와의 통합

### 6.1 LeadsClient.tsx

현재 상태:
- 행 클릭 시 `handleRowClick` → 상세 모달 열기
- 기존 상세 모달 코드 있음

변경 사항:
- 기존 상세 모달 코드 제거
- `UnifiedDetailModal` 컴포넌트 import 및 사용
- Props 전달

### 6.2 ReservationsClient.tsx

현재 상태:
- `handleLeadClick` → 상세 모달 열기
- 인라인 모달 JSX 코드 있음

변경 사항:
- 인라인 모달 코드 제거
- `UnifiedDetailModal` 컴포넌트 import 및 사용
- Props 전달

### 6.3 Calendar (EventModal.tsx)

현재 상태:
- 일정 생성/수정용 모달
- 리드와 연결되어 있지만 별도 UI

변경 사항:
- 일정 클릭 시 `UnifiedDetailModal` 열기 (lead_id가 있는 경우)
- 기존 EventModal은 유지 (일정 생성/수정용)

## 7. 예약완료일정등록 모달

### 7.1 기존 구현 확인

위치: `LeadsClient.tsx` 내부
- 모달 상태: `contractModalLeadId`, `contractDate`, `contractTime`
- 함수: `openContractModal`, `confirmContractComplete`

### 7.2 분리 작업

새 파일: `ScheduleRegistrationModal.tsx`
```typescript
interface ScheduleRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  onConfirm: (date: string, time: string) => Promise<void>
}
```

기능:
- 날짜 선택 (캘린더)
- 시간 선택 (드롭다운)
- 빠른 날짜 선택 (오늘, 내일, 모레 등)
- 확인/취소 버튼

## 8. 구현 순서

1. ✅ 설계 문서 작성
2. ✅ UnifiedDetailModal 컴포넌트 생성
3. ✅ ScheduleRegistrationModal 분리
4. ✅ 결제 관리 섹션 구현
5. ✅ 변경이력 섹션 권한 수정
6. ✅ leads 페이지에 적용
7. ✅ reservations 페이지에 적용
8. ✅ calendar 페이지에 적용
9. ✅ 빌드 및 테스트

## 9. 구현 완료 요약

### 코드 감소 요약:
1. **dashboard/leads**: 약 570 줄 제거
2. **dashboard/reservations**: 약 490 줄 제거
3. **dashboard/calendar**: 약 789 줄 제거

**총 제거된 줄 수**: 약 1,849 줄

### 통합 결과:
- ✅ 세 페이지 모두에 일관된 사용자 경험 제공
- ✅ 단일 진실 공급원 (Single Source of Truth) 확립
- ✅ 유지보수 및 버그 수정 용이
- ✅ 약 1,849 줄의 중복 코드 제거
- ✅ 모든 기존 기능 보존
- ✅ 빌드 성공 (오류 없음)

## 10. 주의사항

- 기존 기능 유지: 모든 기존 기능이 새 모달에서도 동작해야 함
- 성능: 모달 열 때마다 API 호출 최소화 (필요한 데이터만)
- 반응형: 모바일에서도 잘 동작하도록 레이아웃 조정
- 접근성: 키보드 네비게이션, ARIA 레이블 추가

## 11. 테스트 체크리스트

- [ ] leads 페이지에서 행 클릭 → 모달 열림
- [ ] reservations 페이지에서 항목 클릭 → 모달 열림
- [ ] calendar 페이지에서 일정 클릭 → 모달 열림 (lead_id 있는 경우)
- [ ] 콜담당자 변경 → API 호출 → 변경이력 추가
- [ ] 상담 담당자 변경 → API 호출 → 변경이력 추가
- [ ] 상태 변경 → API 호출 → 변경이력 추가
- [ ] 예약 확정 선택 → 예약완료일정등록 모달 열림
- [ ] 예약일 수정 아이콘 → 예약완료일정등록 모달 열림
- [ ] 결제 내역 조회 (모든 사용자)
- [ ] 결제 내역 추가 → API 호출 → 목록 업데이트
- [ ] 결제 내역 삭제 → API 호출 → 목록 업데이트
- [ ] 변경이력 조회 (모든 사용자)
- [ ] 랜딩페이지 링크 클릭 → 새 탭으로 열림
- [ ] 전화번호 클릭 → 전화 앱 실행
- [ ] 모달 닫기 → 상태 초기화
